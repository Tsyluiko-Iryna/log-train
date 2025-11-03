// trainManager.js — головний менеджер потяга (використовує підмодулі)
import { createElement } from '../../utils/dom.js';
import { logError } from '../../utils/logger.js';
import { getImageUrl } from '../../utils/assets.js';
import { clamp, nextFrame, randomPosition } from '../helpers.js';
import { createLockManager } from './lockManager.js';
import { createDragHandler } from './dragHandler.js';
import { findAttachmentCandidate, applyAttachment, connectNodes as performConnect, disconnectNodes as performDisconnect } from './connectionLogic.js';
import { validateTrain as performValidation, buildOrder as performBuildOrder, collectGroup } from './validation.js';

export function createTrainManager({ stageEl, letter, typeData, soundManager = null }) {
    const nodes = new Map();
    const teardownCallbacks = [];
    const state = {
        bounds: { width: 0, height: 0 },
        isDragging: false,
        highlight: null,
        frozen: false,
        activeDragGroup: null,
        afterMoveRaf: null,
        pendingGroupForLocks: null,
    };

    const cabId = 'cab';
    const lockManager = createLockManager(stageEl, nodes);

    // Обчислює і застосовує розміри вагончиків/кабіни/замків так,
    // щоб повний потяг (кабіна + всі вагончики) міг вміститись в один ряд на сцені.
    function computeAndApplyTrainSizes() {
        try {
            const total = nodes.size; // кабіна + всі слова
            if (!total) return;
            const stageWidth = stageEl.clientWidth || 0;
            if (stageWidth <= 0) return;
            // Поля та зазор між з'єднаними елементами
            const paddingX = 16; // лівий+правий запас
            const gap = 4; // як у вирівнюванні групи
            const available = Math.max(stageWidth - paddingX * 2 - Math.max(total - 1, 0) * gap, 0);
            let item = Math.floor(available / total);
            // Межі на випадок дуже маленьких/великих екранів
            const MIN = 52;  // синхронізовано з найменшими брейкпоінтами CSS
            const MAX = 240; // синхронізовано з найбільшими брейкпоінтами CSS
            item = Math.max(MIN, Math.min(item, MAX));
            // Розмір замка як частка від вагончика
            const lock = Math.max(24, Math.min(Math.round(item * 0.22), 44));
            // Застосовуємо значення як CSS-змінні до стадії (щоб обмежити область)
            stageEl.style.setProperty('--train-item-size', `${item}px`);
            stageEl.style.setProperty('--train-car-size', `${item}px`);
            stageEl.style.setProperty('--train-lock-size', `${lock}px`);
        } catch (e) {
            logError('train.computeAndApplyTrainSizes', e);
        }
    }

    function scheduleAfterMove(group) {
        state.pendingGroupForLocks = group;
        if (state.afterMoveRaf) {
            return;
        }
        state.afterMoveRaf = requestAnimationFrame(() => {
            state.afterMoveRaf = null;
            if (state.pendingGroupForLocks) {
                try {
                    lockManager.repositionLocksForGroup(state.pendingGroupForLocks, getNodeBox);
                } catch (e) {
                    logError('train.repositionLocksRaf', e);
                }
                state.pendingGroupForLocks = null;
            }
            try {
                if (state.isDragging) {
                    updateHighlight();
                }
            } catch (e) {
                logError('train.updateHighlightRaf', e);
            }
        });
    }

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

        const cleanup = dragHandler.bindDragEvents(node);
        teardownCallbacks.push(cleanup);
        return node;
    }

    function getNodeBox(node) {
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
            const group = Array.from(collectGroup(nodes, node.id));
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

        const initialMap = new Map(initialPositions.map(item => [item.id, item]));
        group.forEach(member => {
            const initial = initialMap.get(member.id);
            const nextX = clamp(initial.x + deltaX, 0, Math.max(state.bounds.width - member.size.width, 0));
            const nextY = clamp(initial.y + deltaY, 0, Math.max(state.bounds.height - member.size.height, 0));
            applyPosition(member, nextX, nextY);
        });
        
        if (state.isDragging) {
            scheduleAfterMove(group);
        } else {
            lockManager.repositionLocksForGroup(group, getNodeBox);
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
        const candidate = findAttachmentCandidate(state.activeDragGroup, nodes, getNodeBox);
        if (candidate) {
            applyAttachment(candidate, nodes, connectNodes);
        }
    }

    function updateHighlight() {
        if (!state.activeDragGroup || !state.activeDragGroup.length) {
            clearHighlight();
            return;
        }
        const candidate = findAttachmentCandidate(state.activeDragGroup, nodes, getNodeBox);
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
            newX = targetBox.left - dragWidth;
        } else {
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

    function connectNodes(dragNode, targetNode, dragSide, targetSide, dragGroupIds, attachmentSide) {
        const createLock = (nodeA, nodeB) => {
            lockManager.createLock(nodeA, nodeB, getNodeBox, handleLockClick);
        };
        performConnect(dragNode, targetNode, dragSide, targetSide, dragGroupIds, attachmentSide, alignGroupToTarget, createLock, soundManager);
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
        const removeLock = (a, b) => {
            lockManager.removeLock(a, b, handleLockClick);
        };
        performDisconnect(idA, idB, nodes, removeLock);
        soundManager?.playDetach?.();
    }

    const dragHandler = createDragHandler(state, nodes, stageEl, moveGroup, scheduleAfterMove, clearHighlight, finishDrag);

    function removeLooseIncorrect() {
        nodes.forEach(node => {
            if (node.type === 'wagon' && !node.isCorrect && !node.connections.left && !node.connections.right) {
                node.element.remove();
                nodes.delete(node.id);
            }
        });
    }

    function validateTrain() {
        return performValidation(nodes, cabId, typeData);
    }

    function buildOrder() {
        return performBuildOrder(nodes, cabId);
    }

    function freeze() {
        state.frozen = true;
        nodes.forEach(node => node.element.classList.add('is-blocked'));
    }

    function destroy() {
        // Скасовуємо RAF якщо він активний
        if (state.afterMoveRaf) {
            cancelAnimationFrame(state.afterMoveRaf);
            state.afterMoveRaf = null;
        }
        state.pendingGroupForLocks = null;
        
        lockManager.detachAllLocks(handleLockClick);
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
            // Після рендера елементів встановимо розміри під кількість вагончиків
            computeAndApplyTrainSizes();
            placeNodesRandomly();
            
            let resizeTimeout = null;
            const handleResize = () => {
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                resizeTimeout = setTimeout(() => {
                    // Спочатку оновлюємо CSS-розміри під нову ширину
                    computeAndApplyTrainSizes();
                    const oldBounds = { ...state.bounds };
                    updateBounds();
                    
                    // Оновлюємо розміри всіх вагончиків
                    nodes.forEach(node => {
                        try {
                            const rect = node.element.getBoundingClientRect();
                            if (rect && rect.width && rect.height) {
                                node.size.width = rect.width;
                                node.size.height = rect.height;
                            }
                        } catch {}
                    });
                    
                    // Отримуємо всі групи з'єднаних вагончиків
                    const clusters = getAllClusters();
                    
                    // Для кожної групи перераховуємо позиції
                    clusters.forEach(groupIds => {
                        if (groupIds.length <= 1) {
                            // Одиночний вагончик - просто втискаємо в межі
                            clampClusterIntoBounds(groupIds);
                            return;
                        }
                        
                        // Для з'єднаних вагончиків - перебудовуємо з урахуванням нових розмірів
                        const groupNodes = groupIds.map(id => nodes.get(id)).filter(Boolean);
                        
                        // Знаходимо крайній лівий вагончик (початок потяга)
                        let leftmost = groupNodes[0];
                        groupNodes.forEach(node => {
                            if (node.position.x < leftmost.position.x) {
                                leftmost = node;
                            }
                        });
                        
                        // Перебудовуємо ланцюжок від лівого вагончика
                        const visited = new Set();
                        const queue = [leftmost];
                        visited.add(leftmost.id);
                        
                        while (queue.length > 0) {
                            const current = queue.shift();
                            
                            // Обробляємо правого сусіда
                            if (current.connections.right) {
                                const rightNode = nodes.get(current.connections.right);
                                if (rightNode && !visited.has(rightNode.id)) {
                                    visited.add(rightNode.id);
                                    
                                    // Розміщуємо праворуч від поточного
                                    const currentBox = getNodeBox(current);
                                    const gap = 4;
                                    const newX = currentBox.right + gap;
                                    const newY = current.position.y + (current.size.height - rightNode.size.height) / 2;
                                    
                                    applyPosition(rightNode, newX, newY);
                                    queue.push(rightNode);
                                }
                            }
                            
                            // Обробляємо лівого сусіда
                            if (current.connections.left) {
                                const leftNode = nodes.get(current.connections.left);
                                if (leftNode && !visited.has(leftNode.id)) {
                                    visited.add(leftNode.id);
                                    
                                    // Розміщуємо ліворуч від поточного
                                    const gap = 4;
                                    const newX = current.position.x - leftNode.size.width - gap;
                                    const newY = current.position.y + (current.size.height - leftNode.size.height) / 2;
                                    
                                    applyPosition(leftNode, newX, newY);
                                    queue.push(leftNode);
                                }
                            }
                        }
                        
                        // Після перебудови - втискаємо групу в межі екрану
                        clampClusterIntoBounds(groupIds);
                    });
                    
                    // Оновлюємо замки з затримкою для коректного позиціонування
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                clusters.forEach(groupIds => {
                                    if (!groupIds || groupIds.length === 0) {
                                        return;
                                    }
                                    try {
                                        lockManager.repositionLocksForGroup(groupIds, getNodeBox);
                                    } catch (e) {
                                        logError('train.resizeLocks', e);
                                    }
                                });
                            });
                        });
                    });
                }, 150);
            };
            
            window.addEventListener('resize', handleResize, { passive: true });
            teardownCallbacks.push(() => {
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                window.removeEventListener('resize', handleResize);
            });
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
        detachAllLocks: () => lockManager.detachAllLocks(handleLockClick),
        nodes,
    };
}
