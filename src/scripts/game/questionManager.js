import { createElement, setTextContent } from '../utils/dom.js';
import { texts } from '../data/texts.js';
import { logError } from '../utils/logger.js';

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function selectHalf(items) {
    const limit = Math.floor(items.length / 2);
    if (limit <= 0) {
        return [];
    }
    const randomized = shuffle(items);
    return randomized.slice(0, limit);
}

function buildQuestions(wagons) {
    const names = wagons.map(item => item.text);
    const questions = [];

    const positional = names.map((name, index) => ({
        type: 'position',
        answer: name,
        text: texts.questions.types.position(index + 1),
    }));
    questions.push(...selectHalf(positional));

    const before = [];
    for (let i = 1; i < names.length; i += 1) {
        before.push({
            type: 'before',
            answer: names[i - 1],
            target: names[i],
            text: texts.questions.types.before(names[i]),
        });
    }
    questions.push(...selectHalf(before));

    const after = [];
    for (let i = 0; i < names.length - 1; i += 1) {
        after.push({
            type: 'after',
            answer: names[i + 1],
            target: names[i],
            text: texts.questions.types.after(names[i]),
        });
    }
    questions.push(...selectHalf(after));

    if (names.length >= 3) {
        const between = [];
        for (let i = 0; i < names.length - 2; i += 1) {
            between.push({
                type: 'between',
                answer: names[i + 1],
                text: texts.questions.types.between(names[i], names[i + 2]),
            });
        }
        questions.push(...selectHalf(between));
    }

    if (!questions.length && positional.length) {
        questions.push(positional[0]);
    }

    return shuffle(questions);
}

export function createQuestionManager({ stageEl, wagons, soundManager, onComplete }) {
    const panel = createElement('section', { classes: 'question-panel' });
    const title = createElement('h3', { classes: 'question-panel__title', text: texts.questions.title });
    const questionText = createElement('div', { text: '' });
    const progress = createElement('div', { classes: 'question-panel__progress', text: '' });
    panel.append(title, questionText, progress);

    let questionIndex = 0;
    let active = true;
    let feedbackTimer = null;
    const preparedQuestions = buildQuestions(wagons);
    stageEl.append(panel);

    function clearFeedbackTimer() {
        if (feedbackTimer) {
            clearTimeout(feedbackTimer);
            feedbackTimer = null;
        }
    }

    function updatePanelState(state) {
        panel.classList.remove('is-success', 'is-error');
        if (state) {
            panel.classList.add(state);
        }
    }

    function showCurrentQuestion() {
        if (!preparedQuestions.length) {
            handleComplete();
            return;
        }
        clearFeedbackTimer();
        const item = preparedQuestions[questionIndex];
        setTextContent(questionText, item.text);
        setTextContent(progress, texts.questions.progress(questionIndex + 1, preparedQuestions.length));
        updatePanelState(null);
    }

    function handleComplete() {
        clearFeedbackTimer();
        active = false;
        panel.remove();
        onComplete?.();
    }

    function evaluate(word) {
        clearFeedbackTimer();
        if (!active || !preparedQuestions.length) {
            return { correct: false, finished: false };
        }
        const item = preparedQuestions[questionIndex];
        if (word === item.answer) {
            updatePanelState('is-success');
            setTextContent(questionText, texts.questions.correct);
            soundManager.playSuccess?.();
            questionIndex += 1;
            if (questionIndex >= preparedQuestions.length) {
                setTimeout(handleComplete, 600);
                return { correct: true, finished: true };
            }
            setTimeout(() => {
                showCurrentQuestion();
            }, 700);
            return { correct: true, finished: false };
        }
        updatePanelState('is-error');
        setTextContent(questionText, texts.questions.incorrect);
        soundManager.playError?.();
        feedbackTimer = setTimeout(() => {
            if (!active) {
                return;
            }
            const current = preparedQuestions[questionIndex];
            updatePanelState(null);
            if (current) {
                setTextContent(questionText, current.text);
            }
        }, 1200);
        return { correct: false, finished: false };
    }

    try {
        showCurrentQuestion();
    } catch (error) {
        logError('questions.init', error);
    }

    return {
        evaluate,
        destroy() {
            clearFeedbackTimer();
            panel.remove();
        },
    };
}
