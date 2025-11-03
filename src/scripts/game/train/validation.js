// validation.js — валідація потяга та побудова порядку вагонів
import { logError } from '../../utils/logger.js';

export function validateTrain(nodes, cabId, typeData) {
    try {
        const cab = nodes.get(cabId);
        if (!cab) {
            return { success: false, reason: 'cab-missing' };
        }
        const connected = Array.from(collectGroup(nodes, cabId));
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
        const order = buildOrder(nodes, cabId);
        if (order.length !== expected.size + 1) {
            return { success: false, reason: 'structure-mismatch' };
        }
        return { success: true, order };
    } catch (error) {
        logError('train.validate', error);
        return { success: false, reason: 'exception' };
    }
}

export function buildOrder(nodes, cabId) {
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

export function collectGroup(nodes, startId, visited = new Set()) {
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
        collectGroup(nodes, neighborLeft, visited);
    }
    if (neighborRight) {
        collectGroup(nodes, neighborRight, visited);
    }
    return visited;
}
