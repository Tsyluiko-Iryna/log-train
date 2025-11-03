// connectionLogic.js — логіка зчеплення вагонів
import { logError } from '../../utils/logger.js';
import { clamp } from '../helpers.js';
import { collectGroup } from './validation.js';

const ATTACH_THRESHOLD = 40;
const ATTACH_OVERLAP = 40;

export function findAttachmentCandidate(groupIds, nodes, getNodeBox) {
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
            const candidate = evaluateConnection(dragNode, targetNode, dragBox, getNodeBox);
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

function evaluateConnection(dragNode, targetNode, dragBox, getNodeBox) {
    const targetBox = getNodeBox(targetNode);
    const verticalOverlap = Math.min(dragBox.bottom, targetBox.bottom) - Math.max(dragBox.top, targetBox.top);
    if (verticalOverlap < ATTACH_OVERLAP) {
        return null;
    }

    const options = [];
    const dragRightEdge = dragBox.right;
    const dragLeftEdge = dragBox.left;
    const targetLeftEdge = targetBox.left;
    const targetRightEdge = targetBox.right;

    if (!dragNode.connections.right && !targetNode.connections.left) {
        const leftAllowed = (targetNode.type !== 'cab') && (dragNode.type === 'wagon' || dragNode.type === 'cab');
        if (leftAllowed) {
            const distance = Math.abs(dragRightEdge - targetLeftEdge);
            if (distance < ATTACH_THRESHOLD) {
                options.push({ side: 'left', score: distance });
            }
        }
    }

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

export function applyAttachment(candidate, nodes, connectNodes) {
    try {
        const dragNode = nodes.get(candidate.dragId);
        const targetNode = nodes.get(candidate.targetId);
        if (!dragNode || !targetNode) {
            return;
        }
        const dragGroupIds = Array.from(collectGroup(nodes, dragNode.id)).filter(id => id !== targetNode.id);
        
        if (candidate.side === 'left') {
            connectNodes(dragNode, targetNode, 'right', 'left', dragGroupIds, 'left');
        } else {
            connectNodes(dragNode, targetNode, 'left', 'right', dragGroupIds, 'right');
        }
    } catch (error) {
        logError('train.applyAttachment', error);
    }
}

export function connectNodes(dragNode, targetNode, dragSide, targetSide, dragGroupIds, attachmentSide, alignGroupToTarget, createLock, soundManager) {
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

export function disconnectNodes(idA, idB, nodes, removeLock) {
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
    removeLock(idA, idB);
}
