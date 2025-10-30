const store = {
    selection: null,
};

export function setSelection(payload) {
    store.selection = payload;
}

export function getSelection() {
    return store.selection;
}

export function clearSelection() {
    store.selection = null;
}
