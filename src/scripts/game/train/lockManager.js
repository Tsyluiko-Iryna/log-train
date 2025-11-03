// lockManager.js — управління замками між вагонами
import { createElement } from '../../utils/dom.js';
import { logError } from '../../utils/logger.js';
import { nextFrame } from '../helpers.js';

export function createLockManager(stageEl, nodes) {
    const locks = new Map();

    function updateNodeSizes(nodesToUpdate) {
        nodesToUpdate.forEach(node => {
            try {
                const rect = node.element.getBoundingClientRect();
                if (rect && rect.width > 0 && rect.height > 0) {
                    node.size.width = rect.width;
                    node.size.height = rect.height;
                }
            } catch (error) {
                logError('lockManager.updateNodeSizes', error);
            }
        });
    }

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
        
        // Синхронізуємо розміри перед позиціонуванням
        updateNodeSizes([nodeA, nodeB]);
        
        stageEl.append(lock);
        
        try {
            nextFrame().then(() => {
                positionLock(lock, nodeA, nodeB, getNodeBox);
            });
        } catch (e) {
            logError('lockManager.createLock', e);
        }
    }

    function positionLock(lock, nodeA, nodeB, getNodeBox) {
        try {
            // Оновлюємо розміри перед позиціонуванням
            updateNodeSizes([nodeA, nodeB]);
            
            const boxA = getNodeBox(nodeA);
            const boxB = getNodeBox(nodeB);
            
            if (!boxA || !boxB || boxA.left === undefined || boxB.left === undefined) {
                return;
            }
            
            // Динамічно отримуємо розмір замочка з DOM
            const lockRect = lock.getBoundingClientRect();
            const lockHalfWidth = lockRect.width / 2 || 16;
            const lockHalfHeight = lockRect.height / 2 || 16;
            
            const aIsLeft = boxA.centerX <= boxB.centerX;
            const seamX = aIsLeft ? boxA.right : boxB.right;
            const centerX = seamX;
            const centerY = (boxA.centerY + boxB.centerY) / 2;
            
            const finalX = centerX - lockHalfWidth;
            const finalY = centerY - lockHalfHeight;
            
            lock.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
        } catch (e) {
            logError('lockManager.positionLock', e);
        }
    }

    function repositionLocksForGroup(group, getNodeBox) {
        // Спочатку оновлюємо розміри всіх вагончиків групи
        const groupNodes = group.map(nodeIdOrNode => {
            const nodeId = typeof nodeIdOrNode === 'string' ? nodeIdOrNode : nodeIdOrNode.id;
            return nodes.get(nodeId);
        }).filter(Boolean);
        
        updateNodeSizes(groupNodes);
        
        // Тепер позиціонуємо замочки
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
        updateNodeSizes,
    };
}
