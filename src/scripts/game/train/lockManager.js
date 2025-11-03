// lockManager.js — управління замками між вагонами
import { createElement } from '../../utils/dom.js';
import { logError } from '../../utils/logger.js';
import { nextFrame } from '../helpers.js';

const LOCK_SIZE = 32;
const LOCK_HALF = LOCK_SIZE / 2;

export function createLockManager(stageEl, nodes) {
    const locks = new Map();

    function createLock(nodeA, nodeB, getNodeBox, handleLockClick) {
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
        locks.set(key, { element: lock, nodeA, nodeB });
        
        try {
            lock.style.transition = 'none';
        } catch {}
        positionLock(lock, nodeA, nodeB, getNodeBox);
        stageEl.append(lock);
        
        try {
            nextFrame().then(() => { lock.style.transition = ''; });
        } catch {}
    }

    function positionLock(lock, nodeA, nodeB, getNodeBox) {
        try {
            const boxA = getNodeBox(nodeA);
            const boxB = getNodeBox(nodeB);
            
            if (!boxA || !boxB || boxA.left === undefined || boxB.left === undefined) {
                return;
            }
            
            const aIsLeft = boxA.centerX <= boxB.centerX;
            const seamX = aIsLeft ? boxA.right : boxB.right;
            const centerX = seamX;
            const centerY = (boxA.centerY + boxB.centerY) / 2;
            lock.style.transform = `translate3d(${centerX - LOCK_HALF}px, ${centerY - LOCK_HALF}px, 0)`;
        } catch (e) {
            logError('lockManager.positionLock', e);
        }
    }

    function repositionLocksForGroup(group, getNodeBox) {
        group.forEach(nodeIdOrNode => {
            // Підтримка як ID так і об'єктів нод
            const nodeId = typeof nodeIdOrNode === 'string' ? nodeIdOrNode : nodeIdOrNode.id;
            const node = nodes.get(nodeId);
            
            if (!node) {
                return;
            }
            
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
                const lockData = locks.get(key);
                if (lockData) {
                    positionLock(lockData.element, node, neighbor, getNodeBox);
                }
            });
        });
    }

    function removeLock(idA, idB, handleLockClick) {
        const key = createLockKey(idA, idB);
        const lockData = locks.get(key);
        if (lockData) {
            lockData.element.removeEventListener('click', handleLockClick);
            if (lockData.element.parentElement === stageEl) {
                stageEl.removeChild(lockData.element);
            }
            locks.delete(key);
        }
    }

    function detachAllLocks(handleLockClick) {
        locks.forEach(lockData => {
            lockData.element.removeEventListener('click', handleLockClick);
            if (lockData.element.parentElement === stageEl) {
                stageEl.removeChild(lockData.element);
            }
        });
        locks.clear();
    }

    function createLockKey(a, b) {
        return [a, b].sort().join('::');
    }

    return {
        createLock,
        repositionLocksForGroup,
        removeLock,
        detachAllLocks,
    };
}
