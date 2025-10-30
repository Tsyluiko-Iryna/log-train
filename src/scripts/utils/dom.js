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
    } = options;

    if (Array.isArray(classes)) {
        element.classList.add(...classes.filter(Boolean));
    } else if (typeof classes === 'string') {
        element.classList.add(classes);
    }

    if (typeof text === 'string') {
        element.textContent = text;
    }

    if (typeof html === 'string') {
        element.innerHTML = html;
    }

    if (attrs && typeof attrs === 'object') {
        Object.entries(attrs).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                element.setAttribute(key, String(value));
            }
        });
    }

    if (dataset && typeof dataset === 'object') {
        Object.entries(dataset).forEach(([key, value]) => {
            element.dataset[key] = String(value);
        });
    }

    if (Array.isArray(children)) {
        children.forEach(child => {
            if (child instanceof Node) {
                element.appendChild(child);
            }
        });
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

export function setVisibility(element, isVisible) {
    if (!element) {
        return;
    }
    element.style.display = isVisible ? '' : 'none';
}
