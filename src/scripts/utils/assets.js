const cache = new Map();

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

const toTrimmedString = value => {
    if (value instanceof URL) {
        return value.href;
    }
    return String(value ?? '').trim();
};

const isAbsoluteUrl = value =>
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    ABSOLUTE_URL_PATTERN.test(value);

const normalizeRelativePath = value => {
    const path = value.replace(/^[\\/]+/, '');
    if (!path) {
        return '';
    }
    const segments = path.split(/[\\/]+/);
    const safe = [];
    segments.forEach(segment => {
        if (!segment || segment === '.') {
            return;
        }
        if (segment === '..') {
            safe.pop();
            return;
        }
        safe.push(segment);
    });
    return safe.join('/');
};

export function getImageUrl(fileName) {
    const raw = toTrimmedString(fileName);
    if (!raw) {
        return '';
    }

    if (isAbsoluteUrl(raw)) {
        return raw;
    }

    const cached = cache.get(raw);
    if (cached) {
        return cached;
    }

    const normalized = normalizeRelativePath(raw);
    if (!normalized) {
        return '';
    }

    const cacheKey = normalized === raw ? raw : `${raw}::${normalized}`;

    try {
        const url = new URL(`../../images/${normalized}`, import.meta.url);
        const href = url.href;
        cache.set(normalized, href);
        cache.set(raw, href);
        if (normalized !== raw) {
            cache.set(`${raw}::${normalized}`, href);
        }
        return href;
    } catch {
        return '';
    }
}
