/**
 * Mobile Haptic Vibration & Tactile Feedback Service for TASC IIoT Studio
 * Supports Android Chrome, Edge, Samsung Internet, WebKit, and mobile browsers.
 */

// Safe helper to invoke the navigator vibration API across browser prefixes
export function triggerHaptic(pattern: number | number[] = [400, 150, 400, 150, 400]): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  try {
    const nav = navigator as any;
    const vibrateFn =
      nav.vibrate ||
      nav.webkitVibrate ||
      nav.mozVibrate ||
      nav.msVibrate;

    if (typeof vibrateFn === 'function') {
      try {
        const result = vibrateFn.call(nav, pattern);
        return Boolean(result);
      } catch (err) {
        // Fallback for browsers that only accept single numbers
        if (Array.isArray(pattern) && pattern.length > 0) {
          const singleDuration = pattern[0];
          return Boolean(vibrateFn.call(nav, singleDuration));
        }
      }
    }
  } catch (err) {
    console.debug('Haptic vibration not supported or blocked by browser:', err);
  }

  return false;
}

// Stop all ongoing vibrations immediately
export function stopHaptic(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  try {
    const nav = navigator as any;
    const vibrateFn =
      nav.vibrate ||
      nav.webkitVibrate ||
      nav.mozVibrate ||
      nav.msVibrate;
    if (typeof vibrateFn === 'function') {
      vibrateFn.call(nav, 0);
    }
  } catch {}
}

// Short tactile click feedback for button presses (e.g. 35ms)
export function triggerClickHaptic(): void {
  triggerHaptic(35);
}

// Crisp dual-pulse feedback for acknowledging alarms or toggling settings
export function triggerAckHaptic(): void {
  triggerHaptic([80, 40, 80]);
}

let isPrimed = false;

// Global initializer to prime mobile vibration upon first touch/pointer gesture
export function initMobileHapticPriming(): void {
  if (typeof window === 'undefined' || isPrimed) return;

  const primeListener = () => {
    try {
      // Fire a tiny 1ms vibration to register User Activation for Vibration API
      triggerHaptic(1);
      isPrimed = true;
    } catch {}

    window.removeEventListener('touchstart', primeListener);
    window.removeEventListener('pointerdown', primeListener);
    window.removeEventListener('click', primeListener);
  };

  window.addEventListener('touchstart', primeListener, { passive: true, once: true });
  window.addEventListener('pointerdown', primeListener, { passive: true, once: true });
  window.addEventListener('click', primeListener, { passive: true, once: true });
}
