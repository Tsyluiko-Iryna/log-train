// selectionState.js — управління станом вибору на домашньому екрані
export function createSelectionState() {
    const state = {
        selectedLetter: null,
        selectedType: null,
        selectedTypePos: null,
        selectedPairDiff: null,
        selectedLetterDiff: null,
        selectedTypeDiff: null,
        activeSection: null, // 'lex' | 'pos' | 'diff'
    };

    function setLetterSelection(letter) {
        state.selectedLetter = letter;
        state.selectedType = null;
        state.selectedTypePos = null;
    }

    function setTypeSelection(type) {
        state.selectedType = type;
        state.selectedTypePos = null;
        state.selectedTypeDiff = null;
        state.activeSection = 'lex';
    }

    function setTypePosSelection(type) {
        state.selectedTypePos = type;
        state.selectedType = null;
        state.selectedTypeDiff = null;
        state.activeSection = 'pos';
    }

    function setPairSelection(pair) {
        state.selectedPairDiff = pair;
        const [first] = pair.split('-');
        state.selectedLetterDiff = first;
        state.selectedTypeDiff = null;
    }

    function setTypeDiffSelection(type) {
        state.selectedTypeDiff = type;
        state.selectedType = null;
        state.selectedTypePos = null;
        state.activeSection = 'diff';
    }

    function isReady() {
        const readyLex = Boolean(state.selectedLetter && state.selectedType);
        const readyPos = Boolean(state.selectedLetter && state.selectedTypePos);
        const readyDiff = Boolean(state.selectedLetterDiff && state.selectedTypeDiff);
        return { readyLex, readyPos, readyDiff, anyReady: readyLex || readyPos || readyDiff };
    }

    function getSelection() {
        const { readyLex, readyPos, readyDiff } = isReady();
        if (!(readyLex || readyPos || readyDiff)) {
            return null;
        }

        let use = state.activeSection;
        if (!use) {
            use = readyLex ? 'lex' : (readyPos ? 'pos' : 'diff');
        }

        const letter = use === 'diff' ? state.selectedLetterDiff : state.selectedLetter;
        const type = use === 'lex' ? state.selectedType : (use === 'pos' ? state.selectedTypePos : state.selectedTypeDiff);

        return { letter, type };
    }

    return {
        state,
        setLetterSelection,
        setTypeSelection,
        setTypePosSelection,
        setPairSelection,
        setTypeDiffSelection,
        isReady,
        getSelection,
    };
}
