const overrides = new Map([
    ['жираф', 'жирафа.png'],
]);

function normalize(word) {
    return word.toLowerCase().replace(/\s+/g, '');
}

export function resolveImage(word) {
    const normalized = normalize(word);
    if (overrides.has(normalized)) {
        return overrides.get(normalized);
    }
    return `${normalized}.png`;
}
