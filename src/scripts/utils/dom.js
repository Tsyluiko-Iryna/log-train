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

const addEventListenerSafe = (element, type, descriptor) => {
    if (!descriptor) {
        return;
    }

    if (typeof descriptor === 'function') {
        element.addEventListener(type, descriptor);
        return;
    }

    if (Array.isArray(descriptor)) {
        const [handler, options] = descriptor;
        if (typeof handler === 'function') {
            element.addEventListener(type, handler, options);
        }
        return;
    }

    if (isPlainObject(descriptor)) {
        const { handler, options } = descriptor;
        if (typeof handler === 'function') {
            element.addEventListener(type, handler, options);
        }
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
        html,
        attrs,
        dataset,
        children,
        onClick,
        events,
        props,
        style,
        styles,
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

    if (typeof html === 'string') {
        element.innerHTML = html;
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

    const inlineStyles = styles || style;
    if (inlineStyles && isPlainObject(inlineStyles)) {
        Object.entries(inlineStyles).forEach(([property, value]) => {
            if (value !== undefined && value !== null) {
                element.style[property] = typeof value === 'number' && !Number.isNaN(value)
                    ? `${value}`
                    : String(value);
            }
        });
    }

    if (props && isPlainObject(props)) {
        Object.entries(props).forEach(([key, value]) => {
            if (value !== undefined) {
                element[key] = value;
            }
        });
    }

    if (children !== undefined) {
        appendChildNode(element, children);
    }

    if (typeof onClick === 'function') {
        element.addEventListener('click', onClick);
    }

    if (events && isPlainObject(events)) {
        Object.entries(events).forEach(([type, descriptor]) => {
            addEventListenerSafe(element, type, descriptor);
        });
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

export function setVisibility(element, isVisible) {
    if (!element) {
        return;
    }
    element.style.display = isVisible ? '' : 'none';
}
