import { createElement } from '../utils/dom.js';
import { logError, logInfo } from '../utils/logger.js';
import { getImageUrl } from '../utils/assets.js';
import { clamp, nextFrame, randomPosition } from './helpers.js';

const ATTACH_THRESHOLD = 48;
const ATTACH_OVERLAP = 40;
const COUPLER_GAP = 12;
const LOCK_SIZE = 32;
const LOCK_HALF = LOCK_SIZE / 2;

export function createTrainManager({ stageEl, letter, typeData, soundManager = null }) {
    const nodes = new Map();
    const locks = new Map();
    const teardownCallbacks = [];
    const state = {
        bounds: { width: 0, height: 0 },
        isDragging: false,
        highlight: null,
        frozen: false,
        activeDragGroup: null,
    };

    // rAF-пакетування після рухів: оновлення позицій замків та підсвітки кандидата зчеплення
    let afterMoveRaf = null;
    let pendingGroupForLocks = null;
    function scheduleAfterMove(group) {
        pendingGroupForLocks = group;
        if (afterMoveRaf) {
            return;
        }
        afterMoveRaf = requestAnimationFrame(() => {
            afterMoveRaf = null;
            if (pendingGroupForLocks) {
                try {
                    repositionLocksForGroup(pendingGroupForLocks);
                } catch (e) {
                    logError('train.repositionLocksRaf', e);
                }
                pendingGroupForLocks = null;
            }
            // Підсвітку рахуємо не частіше одного кадру, лише під час активного перетягування
            try {
                if (state.isDragging) {
                    updateHighlight();
                }
            } catch (e) {
                logError('train.updateHighlightRaf', e);
            }
        });
    }

    const cabId = 'cab';

    function createCabNode() {
        const node = createNode({
            id: cabId,
            text: letter,
            file: 'locomotive.png',
            isCorrect: true,
            type: 'cab',
        });
        nodes.set(node.id, node);
        stageEl.append(node.element);
    }

    function createWordNodes() {
        typeData.all.forEach((wordEntry, index) => {
            const node = createNode({
                id: `word-${index}`,
                text: wordEntry.text,
                file: wordEntry.file,
                isCorrect: wordEntry.isCorrect,
                type: 'wagon',
            });
            nodes.set(node.id, node);
            stageEl.append(node.element);
        });
    }

    function createNode({ id, text, file, isCorrect, type }) {
        const element = createElement('div', {
            classes: ['train-item', type === 'cab' ? 'train-item--cab' : null],
            dataset: { id },
        });
        const img = createElement('img', {
            classes: 'train-item__image',
            attrs: {
                src: getImageUrl(file),
                alt: text,
                draggable: 'false',
            },
        });
        const label = createElement('div', {
            classes: 'train-item__label',
            text,
        });
        element.append(img, label);

        element.style.transform = 'translate3d(0, 0, 0)';

        const node = {
            id,
            text,
            file,
            isCorrect,
            type,
            element,
            position: { x: 0, y: 0 },
            size: { width: 160, height: 130 },
            connections: { left: null, right: null },
        };

        bindDragEvents(node);
        return node;
    }

    function getNodeBox(node) {
        // Keep sizes in sync with actual DOM (media queries, font changes, etc.).
        // IMPORTANT: Avoid layout reads during active drag to prevent forced reflow.
        if (!state.isDragging) {
            try {
                const rect = node.element.getBoundingClientRect?.();
                if (rect && rect.width && rect.height) {
                    if (rect.width !== node.size.width || rect.height !== node.size.height) {
                        node.size.width = rect.width;
                        node.size.height = rect.height;
                    }
                }
            } catch {}
        }
        return {
            left: node.position.x,
            right: node.position.x + node.size.width,
            top: node.position.y,
            bottom: node.position.y + node.size.height,
            centerX: node.position.x + node.size.width / 2,
            centerY: node.position.y + node.size.height / 2,
        };
    }

    function updateBounds() {
        state.bounds.width = stageEl.clientWidth;
        state.bounds.height = stageEl.clientHeight;
    }

    function getAllClusters() {
        const result = [];
        const visited = new Set();
        nodes.forEach(node => {
            if (visited.has(node.id)) {
                return;
            }
            const group = Array.from(collectGroup(node.id));
            group.forEach(id => visited.add(id));
            result.push(group);
        });
        return result;
    }

    function clampClusterIntoBounds(clusterIds, padding = 8) {
        const groupNodes = clusterIds.map(id => nodes.get(id)).filter(Boolean);
        if (!groupNodes.length) {
            return;
        }
        const bbox = computeGroupBounds(groupNodes);
        let shiftX = 0;
        let shiftY = 0;
        const minXAllowed = padding;
        const minYAllowed = padding;
        const maxXAllowed = Math.max(state.bounds.width - padding, 0);
        const maxYAllowed = Math.max(state.bounds.height - padding, 0);

        if (bbox.minX < minXAllowed) {
            shiftX += (minXAllowed - bbox.minX);
        }
        if (bbox.maxX > maxXAllowed) {
            shiftX -= (bbox.maxX - maxXAllowed);
        }
        if (bbox.minY < minYAllowed) {
            shiftY += (minYAllowed - bbox.minY);
        }
        if (bbox.maxY > maxYAllowed) {
            shiftY -= (bbox.maxY - maxYAllowed);
        }

        if (shiftX !== 0 || shiftY !== 0) {
            const initialPositions = groupNodes.map(member => ({ id: member.id, x: member.position.x, y: member.position.y }));
            moveGroup(groupNodes, initialPositions, shiftX, shiftY);
        }
    }

    function clampAllIntoBounds() {
        const clusters = getAllClusters();
        // Refresh sizes before clamping (handles responsive CSS/font changes)
        try {
            nodes.forEach(node => {
                const rect = node.element.getBoundingClientRect?.();
                if (rect && rect.width && rect.height) {
                    node.size.width = rect.width;
                    node.size.height = rect.height;
                }
            });
        } catch {}
        clusters.forEach(ids => clampClusterIntoBounds(ids));
    }

    function applyPosition(node, x, y) {
        node.position.x = x;
        node.position.y = y;
        node.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    function placeNodesRandomly() {
        updateBounds();
        nodes.forEach(node => {
            const rect = node.element.getBoundingClientRect();
            node.size.width = rect.width || node.size.width;
            node.size.height = rect.height || node.size.height;
            const placement = randomPosition(node.size.width, node.size.height, state.bounds);
            applyPosition(node, placement.x, placement.y);
        });
    }

    function bindDragEvents(node) {
        // Захист від повторних програвань при довгому натисканні/перетягуванні
        const lastSpeakAt = { t: 0 };
        const handlePointerDown = event => {
            try {
                if (state.frozen || !event.isPrimary) {
                    return;
                }
                // Програвання файлу слова під час натискання, лише у фазі збирання поїзда
                // (цей менеджер існує тільки у фазі assemble; в інших фазах він знищується у gameView)
                if (node.type === 'wagon') {
                    const now = Date.now();
                    if (now - lastSpeakAt.t > 300) { // простий гвард від повторів
                        lastSpeakAt.t = now;
                        logInfo('audio.trigger', 'pointerdown wagon', { word: node.text });
                        try { soundManager?.speakWord?.(node.text); } catch (e) { logError('audio.trigger', e); }
                    }
                }
                event.preventDefault();
                node.element.setPointerCapture(event.pointerId);
                beginDrag(node, event);
            } catch (error) {
                logError('train.beginDrag', error);
            }
        };
        node.element.addEventListener('pointerdown', handlePointerDown);
        teardownCallbacks.push(() => node.element.removeEventListener('pointerdown', handlePointerDown));
    }

    function beginDrag(node, event) {
        state.isDragging = true;
        // Позначаємо стан перетягування на всій сцені — це дає змогу вимкнути transition у замків
        try { stageEl.classList.add('is-dragging'); } catch {}
        const groupIds = Array.from(collectGroup(node.id));
        state.activeDragGroup = groupIds;
        const group = groupIds.map(id => nodes.get(id));
        group.forEach(member => member.element.classList.add('is-dragging'));

        const start = { x: event.clientX, y: event.clientY };
        const initialPositions = group.map(member => ({ id: member.id, x: member.position.x, y: member.position.y }));

        // Throttle pointermove via rAF: aggregate last dx/dy and apply once per frame
        let moveRaf = null;
        let lastDx = 0;
        let lastDy = 0;
        const handleMove = moveEvent => {
            try {
                lastDx = moveEvent.clientX - start.x;
                lastDy = moveEvent.clientY - start.y;
                if (moveRaf) {
                    return;
                }
                moveRaf = requestAnimationFrame(() => {
                    moveRaf = null;
                    try {
                        moveGroup(group, initialPositions, lastDx, lastDy);
                        // Пакетуємо оновлення підсвітки/замків в rAF для стабільного FPS
                        scheduleAfterMove(group);
                    } catch (error) {
                        logError('train.dragMoveRaf', error);
                    }
                });
            } catch (error) {
                logError('train.dragMove', error);
            }
        };

        let cleaned = false;
        let finished = false;
        const cleanupDrag = () => {
            if (cleaned) {
                return;
            }
            cleaned = true;
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleCancel);
            // Остання перетягувана група має лишатися поверх інших
            try {
                // Приберемо позначку зверху з усіх вагонів
                nodes.forEach(n => n.element.classList.remove('is-top'));
                // Піднімемо зверху лише поточну групу
                group.forEach(member => member.element.classList.add('is-top'));
            } catch {}
            group.forEach(member => member.element.classList.remove('is-dragging'));
            state.isDragging = false;
            clearHighlight();
            state.activeDragGroup = null;
            try { stageEl.classList.remove('is-dragging'); } catch {}
            // Скасовуємо відкладені кадри оновлення після завершення перетягування
            if (afterMoveRaf) {
                cancelAnimationFrame(afterMoveRaf);
                afterMoveRaf = null;
                pendingGroupForLocks = null;
            }
            // Скасовуємо запланований кадр для оновлення позицій, якщо ще не відпрацював
            if (moveRaf) {
                cancelAnimationFrame(moveRaf);
                moveRaf = null;
            }
        };

        const handleUp = upEvent => {
            try {
                node.element.releasePointerCapture(upEvent.pointerId);
            } catch (error) {
                logError('train.dragRelease', error);
            }
            try {
                if (!finished) {
                    finished = true;
                    finishDrag();
                }
            } catch (error) {
                logError('train.dragUp', error);
            } finally {
                cleanupDrag();
            }
        };

        const handleCancel = cancelEvent => {
            try {
                if (node.element.hasPointerCapture?.(cancelEvent.pointerId)) {
                    node.element.releasePointerCapture(cancelEvent.pointerId);
                }
            } catch (error) {
                logError('train.dragCancelRelease', error);
            }
            try {
                if (!finished) {
                    finished = true;
                    finishDrag();
                }
            } catch (error) {
                logError('train.dragCancel', error);
            } finally {
                cleanupDrag();
            }
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleCancel);
    }

    function moveGroup(group, initialPositions, dx, dy) {
        updateBounds();
        let deltaX = dx;
        let deltaY = dy;

        const futurePositions = initialPositions.map(entry => ({
            id: entry.id,
            x: entry.x + deltaX,
            y: entry.y + deltaY,
        }));

        const bbox = computeGroupBounds(group, futurePositions);
        const padding = 8;
        if (bbox.minX < padding) {
            deltaX += padding - bbox.minX;
        }
        if (bbox.minY < padding) {
            deltaY += padding - bbox.minY;
        }
        if (bbox.maxX > state.bounds.width - padding) {
            deltaX -= bbox.maxX - (state.bounds.width - padding);
        }
        if (bbox.maxY > state.bounds.height - padding) {
            deltaY -= bbox.maxY - (state.bounds.height - padding);
        }

        // Прискорюємо пошук початкових позицій за допомогою Map (O(1) замість O(n))
        const initialMap = new Map(initialPositions.map(item => [item.id, item]));
        group.forEach(member => {
            const initial = initialMap.get(member.id);
            const nextX = clamp(initial.x + deltaX, 0, Math.max(state.bounds.width - member.size.width, 0));
            const nextY = clamp(initial.y + deltaY, 0, Math.max(state.bounds.height - member.size.height, 0));
            applyPosition(member, nextX, nextY);
        });
        // Замки й підсвітку оновлюємо раз на кадр під час drag; поза drag — одразу
        if (state.isDragging) {
            scheduleAfterMove(group);
        } else {
            repositionLocksForGroup(group);
        }
    }

    function computeGroupBounds(group, positions = null) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        group.forEach(member => {
            const pos = positions?.find(item => item.id === member.id) || member.position;
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + member.size.width);
            maxY = Math.max(maxY, pos.y + member.size.height);
        });
        return { minX, minY, maxX, maxY };
    }

    function finishDrag() {
        if (!state.activeDragGroup || !state.activeDragGroup.length) {
            return;
        }
        const candidate = findAttachmentCandidate(state.activeDragGroup);
        if (candidate) {
            applyAttachment(candidate);
        }
    }

    function collectGroup(startId, visited = new Set()) {
        if (visited.has(startId)) {
            return visited;
        }
        visited.add(startId);
        const node = nodes.get(startId);
        if (!node) {
            return visited;
        }
        const neighborLeft = node.connections.left;
        const neighborRight = node.connections.right;
        if (neighborLeft) {
            collectGroup(neighborLeft, visited);
        }
        if (neighborRight) {
            collectGroup(neighborRight, visited);
        }
        return visited;
    }

    function updateHighlight() {
        if (!state.activeDragGroup || !state.activeDragGroup.length) {
            clearHighlight();
            return;
        }
        const candidate = findAttachmentCandidate(state.activeDragGroup);
        if (!candidate) {
            clearHighlight();
            return;
        }
        const currentKey = `${candidate.dragId}-${candidate.targetId}-${candidate.side}`;
        if (state.highlight?.key === currentKey) {
            return;
        }
        clearHighlight();
        state.highlight = {
            key: currentKey,
            dragId: candidate.dragId,
            targetId: candidate.targetId,
        };
        nodes.get(candidate.dragId)?.element.classList.add('is-highlighted');
        nodes.get(candidate.targetId)?.element.classList.add('is-highlighted');
    }

    function clearHighlight() {
        if (!state.highlight) {
            return;
        }
        nodes.get(state.highlight.dragId)?.element.classList.remove('is-highlighted');
        nodes.get(state.highlight.targetId)?.element.classList.remove('is-highlighted');
        state.highlight = null;
    }

    function findAttachmentCandidate(groupIds) {
        if (!groupIds?.length) {
            return null;
        }
        const groupSet = new Set(groupIds);
        let matched = null;
        groupIds.forEach(dragId => {
            const dragNode = nodes.get(dragId);
            if (!dragNode) {
                return;
            }
            const dragBox = getNodeBox(dragNode);
            nodes.forEach(targetNode => {
                if (groupSet.has(targetNode.id)) {
                    return;
                }
                const candidate = evaluateConnection(dragNode, targetNode, dragBox);
                if (!candidate) {
                    return;
                }
                if (!matched || candidate.score < matched.score) {
                    matched = { ...candidate, dragId: dragNode.id, targetId: targetNode.id };
                }
            });
        });
        return matched;
    }

    function evaluateConnection(dragNode, targetNode, dragBox) {
        const targetBox = getNodeBox(targetNode);
        const verticalOverlap = Math.min(dragBox.bottom, targetBox.bottom) - Math.max(dragBox.top, targetBox.top);
        if (verticalOverlap < ATTACH_OVERLAP) {
            return null;
        }

        const options = [];
        // Evaluate seam distances instead of hidden "couplers" to ensure edge-to-edge snapping
        const dragRightEdge = dragBox.right;
        const dragLeftEdge = dragBox.left;
        const targetLeftEdge = targetBox.left;
        const targetRightEdge = targetBox.right;

        // Drag on the left side of target (place dragged group to the LEFT of target):
        // Connection uses drag.right -> target.left
        // - Wagons: allowed left of wagons; NOT allowed left of cab
        // - Cab: allowed left of wagons (so its right socket couples to wagon's left); NOT allowed left of cab
        if (!dragNode.connections.right && !targetNode.connections.left) {
            const leftAllowed = (targetNode.type !== 'cab') && (dragNode.type === 'wagon' || dragNode.type === 'cab');
            if (leftAllowed) {
                const distance = Math.abs(dragRightEdge - targetLeftEdge);
                if (distance < ATTACH_THRESHOLD) {
                    options.push({ side: 'left', score: distance });
                }
            }
        }
        // Drag on the right side of target (place dragged group to the RIGHT of target):
        // Connection uses drag.left -> target.right
        // - Wagons: allowed to the right of both wagons and cab
        // - Cab: NOT allowed to be placed to the right of anything (to keep wagons only on its right)
        if (dragNode.type !== 'cab' && !dragNode.connections.left && !targetNode.connections.right) {
            const distance = Math.abs(dragLeftEdge - targetRightEdge);
            if (distance < ATTACH_THRESHOLD) {
                options.push({ side: 'right', score: distance });
            }
        }
        if (!options.length) {
            return null;
        }
        options.sort((a, b) => a.score - b.score);
        return options[0];
    }

    function applyAttachment(candidate) {
        try {
            const dragNode = nodes.get(candidate.dragId);
            const targetNode = nodes.get(candidate.targetId);
            if (!dragNode || !targetNode) {
                return;
            }
            const dragGroupIds = Array.from(collectGroup(dragNode.id)).filter(id => id !== targetNode.id);
            // Map seam side to actual connection sockets on drag/target:
            // - 'left'  => drag goes LEFT of target => use drag.RIGHT -> target.LEFT
            // - 'right' => drag goes RIGHT of target => use drag.LEFT  -> target.RIGHT
            if (candidate.side === 'left') {
                connectNodes(dragNode, targetNode, 'right', 'left', dragGroupIds, 'left');
            } else {
                connectNodes(dragNode, targetNode, 'left', 'right', dragGroupIds, 'right');
            }
        } catch (error) {
            logError('train.applyAttachment', error);
        }
    }

    function connectNodes(dragNode, targetNode, dragSide, targetSide, dragGroupIds = [dragNode.id], attachmentSide = null) {
        if (dragNode.connections[dragSide] || targetNode.connections[targetSide]) {
            return;
        }
        const placementSide = attachmentSide ?? (dragSide === 'right' ? 'left' : 'right');
        alignGroupToTarget(dragGroupIds, dragNode, targetNode, placementSide);
        dragNode.connections[dragSide] = targetNode.id;
        targetNode.connections[targetSide] = dragNode.id;
        createLock(dragNode, targetNode);
        try {
            soundManager?.playAttach?.();
        } catch {}
    }

    // Align the dragged cluster so edges meet exactly at the seam (no overlap).
    function alignGroupToTarget(dragGroupIds, dragNode, targetNode, placementSide) {
        updateBounds();
        const groupNodes = dragGroupIds.map(id => nodes.get(id)).filter(Boolean);
        if (!groupNodes.length) {
            return;
        }
        const dragBox = getNodeBox(dragNode);
        const targetBox = getNodeBox(targetNode);
        const dragWidth = dragBox.right - dragBox.left;
        const dragHeight = dragBox.bottom - dragBox.top;
        const targetHeight = targetBox.bottom - targetBox.top;

        let newX;
        if (placementSide === 'left') {
            // Place dragged group to the immediate left of target: drag.right == target.left
            newX = targetBox.left - dragWidth;
        } else {
            // Place dragged group to the immediate right of target: drag.left == target.right
            newX = targetBox.right;
        }
        let newY = targetBox.top + (targetHeight - dragHeight) / 2;
        newY = clamp(newY, 8, Math.max(state.bounds.height - dragHeight - 8, 0));

        const deltaX = newX - dragBox.left;
        const deltaY = newY - dragBox.top;
        if (!deltaX && !deltaY) {
            return;
        }
        const initialPositions = groupNodes.map(member => ({ id: member.id, x: member.position.x, y: member.position.y }));
        moveGroup(groupNodes, initialPositions, deltaX, deltaY);
    }

    function createLock(nodeA, nodeB) {
        const key = createLockKey(nodeA.id, nodeB.id);
        if (locks.has(key)) {
            return;
        }
        const lock = createElement('button', {
            classes: 'train-lock',
            attrs: { type: 'button' },
        });
        lock.dataset.a = nodeA.id;
        lock.dataset.b = nodeB.id;
        lock.addEventListener('click', handleLockClick);
        locks.set(key, lock);
        // Prevent the lock from animating from (0,0) to its first position.
        // 1) Disable transition temporarily
        // 2) Set transform to the correct coordinates before appending
        // 3) Append to DOM, then re-enable transition on the next frame
        try {
            lock.style.transition = 'none';
        } catch {}
        positionLock(lock, nodeA, nodeB);
        stageEl.append(lock);
        // Re-enable transition after insertion
        try {
            nextFrame().then(() => { lock.style.transition = ''; });
        } catch {}
    }

    function handleLockClick(event) {
        try {
            const button = event.currentTarget;
            const a = button.dataset.a;
            const b = button.dataset.b;
            disconnectNodes(a, b);
        } catch (error) {
            logError('train.lockClick', error);
        }
    }

    function disconnectNodes(idA, idB) {
        const nodeA = nodes.get(idA);
        const nodeB = nodes.get(idB);
        if (!nodeA || !nodeB) {
            return;
        }
        if (nodeA.connections.left === idB) {
            nodeA.connections.left = null;
            nodeB.connections.right = null;
        }
        if (nodeA.connections.right === idB) {
            nodeA.connections.right = null;
            nodeB.connections.left = null;
        }
        if (nodeB.connections.left === idA) {
            nodeB.connections.left = null;
            nodeA.connections.right = null;
        }
        if (nodeB.connections.right === idA) {
            nodeB.connections.right = null;
            nodeA.connections.left = null;
        }
        const key = createLockKey(idA, idB);
        const lock = locks.get(key);
        if (lock) {
            lock.removeEventListener('click', handleLockClick);
            if (lock.parentElement === stageEl) {
                stageEl.removeChild(lock);
            }
            locks.delete(key);
        }
    }

    function repositionLocksForGroup(group) {
        group.forEach(node => {
            ['left', 'right'].forEach(side => {
                const neighborId = node.connections[side];
                if (!neighborId) {
                    return;
                }
                const neighbor = nodes.get(neighborId);
                if (!neighbor) {
                    return;
                }
                const key = createLockKey(node.id, neighborId);
                const lock = locks.get(key);
                if (lock) {
                    positionLock(lock, node, neighbor);
                }
            });
        });
    }

    // Place the lock at the seam center between the coupled wagons.
    function positionLock(lock, nodeA, nodeB) {
        const boxA = getNodeBox(nodeA);
        const boxB = getNodeBox(nodeB);
        const aIsLeft = boxA.centerX <= boxB.centerX;
        // Seam X is the touching edge between A and B
        const seamX = aIsLeft ? boxA.right : boxB.right;
        const centerX = seamX;
        const centerY = (boxA.centerY + boxB.centerY) / 2;
        lock.style.transform = `translate3d(${centerX - LOCK_HALF}px, ${centerY - LOCK_HALF}px, 0)`;
    }

    function createLockKey(a, b) {
        return [a, b].sort().join('::');
    }

    function detachAllLocks() {
        locks.forEach(lock => {
            lock.removeEventListener('click', handleLockClick);
            if (lock.parentElement === stageEl) {
                stageEl.removeChild(lock);
            }
        });
        locks.clear();
    }

    function removeLooseIncorrect() {
        nodes.forEach(node => {
            if (node.type === 'wagon' && !node.isCorrect && !node.connections.left && !node.connections.right) {
                node.element.remove();
                nodes.delete(node.id);
            }
        });
    }

    function validateTrain() {
        try {
            const cab = nodes.get(cabId);
            if (!cab) {
                return { success: false, reason: 'cab-missing' };
            }
            const connected = Array.from(collectGroup(cabId));
            const wagonIds = connected.filter(id => id !== cabId);
            if (!wagonIds.length) {
                return { success: false, reason: 'no-wagons' };
            }
            const expected = new Set(typeData.correct.map(item => item.text));
            const actual = new Set();
            for (const id of wagonIds) {
                const node = nodes.get(id);
                if (!node) {
                    continue;
                }
                if (!node.isCorrect) {
                    return { success: false, reason: 'has-incorrect' };
                }
                actual.add(node.text);
            }
            if (actual.size !== expected.size) {
                return { success: false, reason: 'missing-correct' };
            }
            for (const word of expected) {
                if (!actual.has(word)) {
                    return { success: false, reason: 'missing-correct' };
                }
            }
            const order = buildOrder();
            if (order.length !== expected.size + 1) {
                return { success: false, reason: 'structure-mismatch' };
            }
            return { success: true, order };
        } catch (error) {
            logError('train.validate', error);
            return { success: false, reason: 'exception' };
        }
    }

    function buildOrder() {
        const output = [];
        const visited = new Set();
        let current = nodes.get(cabId);
        while (current) {
            output.push(current);
            visited.add(current.id);
            const nextId = current.connections.right;
            if (!nextId || visited.has(nextId)) {
                break;
            }
            current = nodes.get(nextId);
        }
        return output;
    }

    function freeze() {
        state.frozen = true;
        nodes.forEach(node => node.element.classList.add('is-blocked'));
    }

    function destroy() {
        detachAllLocks();
        teardownCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                logError('train.destroy', error);
            }
        });
        nodes.forEach(node => node.element.remove());
        nodes.clear();
    }

    async function init() {
        try {
            createCabNode();
            createWordNodes();
            await nextFrame();
            await nextFrame();
            placeNodesRandomly();
            const handleResize = () => {
                updateBounds();
                // Keep all existing wagons visible when window size changes
                clampAllIntoBounds();
            };
            // Пасивний слухач resize не блокує основний потік
            window.addEventListener('resize', handleResize, { passive: true });
            teardownCallbacks.push(() => window.removeEventListener('resize', handleResize));
        } catch (error) {
            logError('train.init', error);
        }
    }

    return {
        init,
        destroy,
        validateTrain,
        freeze,
        removeLooseIncorrect,
        buildOrder,
        detachAllLocks,
        nodes,
    };
}
