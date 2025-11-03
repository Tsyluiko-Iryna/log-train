import { logError, logInfo } from './logger.js';
import { texts } from '../data/texts.js';

/**
 * Глобальний обробник помилок для додатку
 * Перехоплює необроблені помилки та Promise rejections
 */

let isInitialized = false;
let errorCallback = null;

/**
 * Ініціалізує глобальний error boundary
 * @param {Function} [onError] - Опціональний callback для обробки помилок
 */
export function initErrorBoundary(onError = null) {
  if (isInitialized) {
    logInfo('ErrorBoundary', 'Already initialized');
    return;
  }

  errorCallback = onError;

  // Перехоплення синхронних помилок
  window.addEventListener('error', (event) => {
    const { message, filename, lineno, colno, error } = event;
    
    logError('ErrorBoundary:GlobalError', {
      message,
      filename,
      lineno,
      colno,
      stack: error?.stack
    });

    // Виклик custom callback якщо є
    if (errorCallback) {
      errorCallback(error || new Error(message));
    }

    // Показати повідомлення користувачу
    const errorMessage = texts?.errors?.globalError || 'Виникла технічна помилка. Спробуйте оновити сторінку.';
    showUserError(errorMessage);

    // Не блокувати default обробку
    return false;
  });

  // Перехоплення асинхронних помилок (Promise rejections)
  window.addEventListener('unhandledrejection', (event) => {
    const { reason } = event;
    
    logError('ErrorBoundary:UnhandledRejection', {
      reason: reason?.message || reason,
      stack: reason?.stack
    });

    // Виклик custom callback якщо є
    if (errorCallback) {
      errorCallback(reason instanceof Error ? reason : new Error(String(reason)));
    }

    // Показати повідомлення користувачу
    const errorMessage = texts?.errors?.asyncError || 'Виникла помилка при обробці запиту. Спробуйте ще раз.';
    showUserError(errorMessage);

    // Prevent default console error
    event.preventDefault();
  });

  isInitialized = true;
  logInfo('ErrorBoundary', 'Initialized');
}

/**
 * Показує повідомлення про помилку користувачу
 * @param {string} message - Повідомлення для користувача
 */
function showUserError(message) {
  // Перевірка чи існує елемент для помилок
  let errorContainer = document.getElementById('global-error-message');
  
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'global-error-message';
    errorContainer.className = 'global-error';
    errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #dc3545;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 90%;
      text-align: center;
      font-size: 16px;
      animation: slideDown 0.3s ease-out;
    `;
    document.body.appendChild(errorContainer);

    // Додати CSS animation якщо ще немає
    if (!document.getElementById('error-boundary-styles')) {
      const style = document.createElement('style');
      style.id = 'error-boundary-styles';
      style.textContent = `
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  errorContainer.textContent = message;
  errorContainer.style.display = 'block';

  // Автоматично приховати через 5 секунд
  setTimeout(() => {
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }, 5000);
}
