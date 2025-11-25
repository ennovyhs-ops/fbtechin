
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
  const from = ticker.substring(0, 3).toUpperCase();
  const to = ticker.substring(3, 6).toUpperCase();
  return FOREX_CURRENCIES.has(from) && FOREX_CURRENCIES.has(to);
}

export function isCryptoPair(ticker: string): boolean {
  if (ticker.length < 6) return false; // e.g. BTCUSD
  
  // A common crypto format is BTCUSD, ETHUSD, etc.
  const maybeTo = ticker.slice(-3).toUpperCase();
  const maybeFrom = ticker.slice(0, -3).toUpperCase();

  if (FOREX_CURRENCIES.has(maybeTo)) {
    // This could be a crypto-fiat pair. It's harder to definitively know all crypto symbols.
    // We'll make an assumption based on common pairs. If the 'from' is not a forex currency, it might be crypto.
    return !FOREX_CURRENCIES.has(maybeFrom);
  }

  // Fallback for direct crypto symbol check if we expand the list
  if (CRYPTO_CURRENCIES.has(maybeFrom) && FOREX_CURRENCIES.has(maybeTo)) {
    return true;
  }

  return false;
}

export function getCurrencyOrCryptoPair(ticker: string): { from_symbol: string, to_symbol: string } {
    const to_symbol = ticker.substring(ticker.length - 3).toUpperCase();
    const from_symbol = ticker.substring(0, ticker.length - 3).toUpperCase();
    return { from_symbol, to_symbol };
}

export function parseApiLimit(note: string): string | null {
  if (!note || !note.includes("Alpha Vantage")) return null;

  const dailyMatch = note.match(/(\d+)\s+calls\s+per\s+day/);
  if (dailyMatch && dailyMatch[1]) {
    return `API Limit: ${dailyMatch[1]} requests per day`;
  }

  const minuteMatch = note.match(/(\d+)\s+calls\s+per\s+minute/);
  if (minuteMatch && minuteMatch[1]) {
    return `API Limit: ${minuteMatch[1]} requests per minute`;
  }
  
  return "You have reached the Alpha Vantage API rate limit.";
}

export function formatCurrency(value: string | number | null | undefined, currency: string | null): string {
    if (value === null || value === undefined) return 'N/A';
    
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return 'N/A';

    const isForex = currency ? FOREX_CURRENCIES.has(currency.toUpperCase()) && currency !== 'USD' : false;

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: isForex ? 4 : 2,
            maximumFractionDigits: isForex ? 5 : 2,
        }).format(numberValue);
    } catch (e) {
        // Fallback for unknown currency codes
        return `${currency || '$'} ${numberValue.toFixed(isForex ? 4 : 2)}`;
    }
}
