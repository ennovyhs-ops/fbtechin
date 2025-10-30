import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


const FOREX_CURRENCIES = new Set([
  'EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD', 'CNY'
  // Add more major currency codes as needed
]);

const CRYPTO_CURRENCIES = new Set([
  'BTC', 'ETH', 'XRP', 'LTC', 'BCH', 
  // Add more major crypto codes as needed
]);

export function isCurrencyPair(ticker: string): boolean {
  if (ticker.length !== 6) return false;
  const from = ticker.substring(0, 3);
  const to = ticker.substring(3, 6);
  return FOREX_CURRENCIES.has(from) && FOREX_CURRENCIES.has(to);
}

export function isCryptoPair(ticker: string): boolean {
  if (ticker.length < 6) return false; // e.g. BTCUSD
  const to = ticker.substring(ticker.length - 3);
  const from = ticker.substring(0, ticker.length - 3);
  return CRYPTO_CURRENCIES.has(from) && FOREX_CURRENCIES.has(to);
}

export function getCurrencyOrCryptoPair(ticker: string): { from_symbol: string, to_symbol: string } {
    const to_symbol = ticker.substring(ticker.length - 3);
    const from_symbol = ticker.substring(0, ticker.length - 3);
    return { from_symbol, to_symbol };
}
