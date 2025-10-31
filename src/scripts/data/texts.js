export const texts = {
    siteTitle: 'Логопедичні ігри',
    noscript: 'Для роботи застосунку потрібно увімкнути JavaScript.',
    gameCard: {
        title: 'Потяг',
        description: 'Гра для розвитку вимови: зберіть потяг із правильних вагончиків, потім дайте відповіді на запитання та пройдіть тест на пам’ять.',
    },
    siteSummary: 'Перейдіть до гри та тренуйте вимову у веселому форматі.<br>Складіть потяг, дайте відповіді та перевірте пам’ять.',
    selectors: {
        letterLabel: 'Оберіть літеру для тренування',
        typeLabel: 'Оберіть тему слів',
        startButton: 'Почати гру',
        noOptionsNote: '(немає варіантів)',
    },
    loader: {
        preparing: 'Готуємо дані…',
        fetchingAssets: 'Завантажуємо зображення…',
        pageLoading: 'Завантаження сторінки…',
        loading: 'Завантаження…',
    },
    images: {
        trainAlt: 'Потяг',
    },
    game: {
        back: 'Назад',
        check: 'Перевірити',
        lockedTrainLabel: 'Зафіксований потяг',
        infoTemplate: (letter, type) => `Літера: ${letter}. Тема: ${type}. Зберіть потяг зі слів з літерою «${letter}» для типу «${type}».`,
        messageSuccess: 'Правильно!',
        messageError: 'Спробуйте ще.',
        authorPlaceholder: 'Автор: (додати ім’я)',
    },
    questions: {
        title: 'Відповідайте на запитання',
        progress: (current, total) => `${current} з ${total}`,
        correct: 'Вірно!',
        incorrect: 'Помилка, спробуйте ще.',
        types: {
            position: index => `Який вагончик їде ${index}-м?`,
            before: word => `Який вагончик їде перед словом «${word}»?`,
            after: word => `Який вагончик їде після слова «${word}»?`,
            between: (left, right) => `Який вагончик їде між словами «${left}» та «${right}»?`,
        },
    },
    memory: {
        title: 'Тест на пам’ять: оберіть усі правильні вагончики',
        check: 'Перевірити',
        success: 'Чудово! Ви пам’ятаєте всі правильні слова.',
        error: 'Є помилка. Перегляньте свій вибір.',
    },
    finalScreen: {
        title: 'Гру завершено: ви успішно зібрали потяг та відповіли на запитання',
        back: 'Назад',
    },
    legal: '© 2025. Усі права захищено.',
    errors: {
        assetLoadFailed: fileName => `Не вдалося завантажити ${fileName}`,
    },
};
