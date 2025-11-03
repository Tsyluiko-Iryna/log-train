// dragHandler.js — обробка drag & drop логіки
import { logError } from '../../utils/logger.js';
import { collectGroup } from './validation.js';

export function createDragHandler(state, nodes, stageEl, moveGroup, scheduleAfterMove, clearHighlight, finishDrag) {
    function bindDragEvents(node) {
        const handlePointerDown = event => {
            try {
                if (state.frozen || !event.isPrimary) {
                    return;
                }
                event.preventDefault();
                node.element.setPointerCapture(event.pointerId);
                beginDrag(node, event);
            } catch (error) {
                logError('train.beginDrag', error);
            }
        };
        node.element.addEventListener('pointerdown', handlePointerDown);
        return () => node.element.removeEventListener('pointerdown', handlePointerDown);
    }

    function beginDrag(node, event) {
        state.isDragging = true;
        try { stageEl.classList.add('is-dragging'); } catch {}
        const groupIds = Array.from(collectGroup(nodes, node.id));
        state.activeDragGroup = groupIds;
        const group = groupIds.map(id => nodes.get(id));
        group.forEach(member => member.element.classList.add('is-dragging'));

        const start = { x: event.clientX, y: event.clientY };
        const initialPositions = group.map(member => ({ id: member.id, x: member.position.x, y: member.position.y }));

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
            
            try {
                nodes.forEach(n => n.element.classList.remove('is-top'));
                group.forEach(member => member.element.classList.add('is-top'));
            } catch {}
            group.forEach(member => member.element.classList.remove('is-dragging'));
            state.isDragging = false;
            clearHighlight();
            state.activeDragGroup = null;
            try { stageEl.classList.remove('is-dragging'); } catch {}
            
            if (state.afterMoveRaf) {
                cancelAnimationFrame(state.afterMoveRaf);
                state.afterMoveRaf = null;
                state.pendingGroupForLocks = null;
            }
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

    return {
        bindDragEvents,
    };
}
