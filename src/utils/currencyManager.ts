import { useState, useEffect } from 'react';

export type CurrencySymbol = '$' | '₹';

const STORAGE_KEY_CURRENCY = 'tasc_currency_symbol';
const CURRENCY_EVENT = 'tasc_currency_changed';

/**
 * Get active currency symbol from localStorage (defaults to '₹')
 */
export function getCurrencySymbol(): CurrencySymbol {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENCY);
    if (saved === '₹' || saved === '$') {
      return saved;
    }
  } catch (e) {
    // Ignore storage errors
  }
  return '₹';
}

/**
 * Set active currency symbol and notify all listeners
 */
export function setCurrencySymbol(symbol: CurrencySymbol): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENCY, symbol);
    window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: { symbol } }));
  } catch (e) {
    console.error('Failed to save currency symbol:', e);
  }
}

/**
 * Format numeric amount with the active or specified currency symbol
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  symbolOverride?: CurrencySymbol,
  suffix: string = ''
): string {
  const sym = symbolOverride || getCurrencySymbol();
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0)) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `${sym}${formatted}${suffix}`;
}

/**
 * React hook to reactively subscribe to currency changes across the application
 */
export function useCurrency(): [CurrencySymbol, (symbol: CurrencySymbol) => void] {
  const [currency, setCurrency] = useState<CurrencySymbol>(getCurrencySymbol);

  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ symbol: CurrencySymbol }>;
      if (customEvent.detail && customEvent.detail.symbol) {
        setCurrency(customEvent.detail.symbol);
      } else {
        setCurrency(getCurrencySymbol());
      }
    };

    window.addEventListener(CURRENCY_EVENT, handleCurrencyChange);
    return () => {
      window.removeEventListener(CURRENCY_EVENT, handleCurrencyChange);
    };
  }, []);

  const updateCurrency = (newSymbol: CurrencySymbol) => {
    setCurrency(newSymbol);
    setCurrencySymbol(newSymbol);
  };

  return [currency, updateCurrency];
}
