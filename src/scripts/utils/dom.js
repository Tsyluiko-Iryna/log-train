const isPlainObject = value => Object.prototype.toString.call(value) === '[object Object]';

const appendChildNode = (parent, child) => {
    if (child == null) {
        return;
    }

    if (Array.isArray(child)) {
        child.forEach(nested => appendChildNode(parent, nested));
        return;
    }

    if (child instanceof Node) {
        parent.appendChild(child);
        return;
    }

    if (typeof child === 'string' || typeof child === 'number') {
        parent.appendChild(document.createTextNode(String(child)));
    }
};

export function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (!options) {
        return element;
    }

    const {
        classes,
        text,
        attrs,
        dataset,
        children,
        onClick,
        style,
    } = options;

    if (Array.isArray(classes)) {
        const normalized = classes.filter(Boolean);
        if (normalized.length) {
            element.classList.add(...normalized);
        }
    } else if (typeof classes === 'string' && classes.trim()) {
        element.classList.add(...classes.split(/\s+/));
    }

    if (typeof text === 'string') {
        element.textContent = text;
    }

    if (attrs && isPlainObject(attrs)) {
        Object.entries(attrs).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                element.setAttribute(key, String(value));
            }
        });
    }

    if (dataset && isPlainObject(dataset)) {
        Object.entries(dataset).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                element.dataset[key] = String(value);
            }
        });
    }

    if (style && isPlainObject(style)) {
        Object.entries(style).forEach(([property, value]) => {
            if (value !== undefined && value !== null) {
                element.style[property] = typeof value === 'number' && !Number.isNaN(value)
                    ? `${value}`
                    : String(value);
            }
        });
    }

    if (children !== undefined) {
        appendChildNode(element, children);
    }

    if (typeof onClick === 'function') {
        element.addEventListener('click', onClick);
    }

    return element;
}

export function clearElement(element) {
    if (!element) {
        return;
    }
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function setTextContent(element, text) {
    if (element) {
        element.textContent = text;
    }
}
