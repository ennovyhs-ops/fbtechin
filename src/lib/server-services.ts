
'use server';

import type { MarketData, FetchResult, SearchResult } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { isCurrencyPair, isCryptoPair, getCurrencyOrCryptoPair } from '@/lib/utils';

const BASE_URL = 'https://www.alphavantage.co/query';

async function fetchCurrencyForTicker(ticker: string, apiKey: string): Promise<string> {
    const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${apiKey}`;
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return 'USD'; 

        const data = await response.json();
        const bestMatch = data?.bestMatches?.[0] as SearchResult;
        
        if (bestMatch && bestMatch.symbol.toLowerCase() === ticker.toLowerCase()) {
            return bestMatch.currency;
        }
        
        // Default for US stocks if no specific match is found
        if (!ticker.includes('.')) {
            return 'USD';
        }

        return 'USD';
    } catch (error) {
        console.error("Could not fetch currency for ticker:", error);
        return 'USD'; // Default to USD on error
    }
}


export async function fetchMarketDataService(ticker: string): Promise<FetchResult> {
  const apiKey = serverConfig.alphaVantageApiKey;
  if (!apiKey) {
    return { error: 'API key for Alpha Vantage is not configured. Please set ALPHAVANTAGE_API_KEY in your environment variables.' };
  }
  
  let url = '';
  let timeSeriesKey = '';
  let openKey: string, highKey: string, lowKey: string, closeKey: string, volumeKey: string;
  let precision = 2;
  let currency: string | null = null;

  if (isCryptoPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${from_symbol}&market=${to_symbol}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series (Digital Currency Daily)';
    openKey = `1a. open (${to_symbol})`;
    highKey = `2a. high (${to_symbol})`;
    lowKey = `3a. low (${to_symbol})`;
    closeKey = `4a. close (${to_symbol})`;
    volumeKey = '5. volume';
    precision = 2;
    currency = to_symbol;
  } else if (isCurrencyPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series FX (Daily)';
    openKey = '1. open';
    highKey = '2. high';
    lowKey = '3. low';
    closeKey = '4. close';
    volumeKey = '5. volume';
    precision = 4;
    currency = to_symbol;
  } else {
    currency = await fetchCurrencyForTicker(ticker, apiKey);
    url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series (Daily)';
    openKey = '1. open';
    highKey = '2. high';
    lowKey = '3. low';
    closeKey = '4. close';
    volumeKey = '5. volume';
    precision = 2;
  }

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { error: 'Failed to fetch data from the provider. The service may be temporarily unavailable.' };
    }

    const data = await response.json();

    if (data['Note']) {
        return { error: data['Note'] };
    }
    
    const timeSeries = data[timeSeriesKey];
    
    if (data['Error Message'] || data['Information'] || !timeSeries) {
      const errorMessage = data['Error Message'] || data['Information'] || `No data found for symbol "${ticker}". Please check if the symbol is correct and listed.`;
      return { error: `${errorMessage}` };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values[openKey]).toFixed(precision),
      high: parseFloat(values[highKey]).toFixed(precision),
      low: parseFloat(values[lowKey]).toFixed(precision),
      close: parseFloat(values[closeKey]).toFixed(precision),
      volume: values[volumeKey] || 'N/A',
    }));

    return { data: marketData.slice(0, 730), currency };
  } catch (err) {
    console.error(err);
    return { error: 'An unexpected error occurred while fetching data. Please check your network connection and try again.' };
  }
}
