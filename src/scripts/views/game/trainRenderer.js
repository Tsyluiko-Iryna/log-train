// trainRenderer.js — рендеринг заблокованого потяга
import { createElement } from '../../utils/dom.js';
import { texts } from '../../data/texts.js';
import { getImageUrl } from '../../utils/assets.js';
import { logError } from '../../utils/logger.js';

function createTrainCar(item, isCab) {
    const classes = ['train-car'];
    if (isCab) {
        classes.push('train-car--cab');
    } else {
        classes.push('train-car--interactive');
    }
    const element = createElement('div', { classes });
    const img = createElement('img', {
        classes: 'train-car__image',
        attrs: {
            src: getImageUrl(item.file),
            alt: item.text,
            draggable: 'false',
        },
    });
    const label = createElement('div', {
        classes: 'train-car__label',
        text: item.text,
    });
    element.dataset.word = item.text;
    element.append(img, label);
    return { element, isCab };
}

export function renderLockedTrain(stageEl, orderData) {
    const area = createElement('div', { classes: 'train-locked-area' });
    const label = createElement('div', { classes: 'train-locked-area__label', text: texts.game.lockedTrainLabel });
    const row = createElement('div', { classes: 'train-locked-row' });
    const interactive = [];
    
    orderData.forEach((item, index) => {
        const car = createTrainCar(item, index === 0);
        row.append(car.element);
        if (!car.isCab) {
            interactive.push(car);
        }
    });
    
    area.append(label, row);
    stageEl.append(area);
    
    const cleanupListeners = [];
    return {
        area,
        wagons: interactive,
        addWagonListener(handler) {
            interactive.forEach(car => {
                const fn = () => handler(car);
                car.element.addEventListener('click', fn);
                cleanupListeners.push(() => car.element.removeEventListener('click', fn));
            });
        },
        removeListeners() {
            cleanupListeners.splice(0).forEach(fn => {
                try {
                    fn();
                } catch (error) {
                    logError('trainRenderer.removeListeners', error);
                }
            });
        },
        destroy() {
            this.removeListeners();
            area.remove();
        },
    };
}
