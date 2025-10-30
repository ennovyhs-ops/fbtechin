'use server';

import type { MarketData, SearchResult } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';

const BASE_URL = 'https://www.alphavantage.co/query';

interface FetchResult {
  data?: MarketData[] | null;
  error?: string | null;
}

interface SearchFetchResult {
  data?: SearchResult[] | null;
  error?: string | null;
}

export async function getApiKey() {
  return serverConfig.alphaVantageApiKey;
}

function isCurrencyPair(ticker: string): boolean {
  // Simple check for a 6-letter string, common for currency pairs like EURUSD
  return /^[A-Z]{6}$/.test(ticker);
}

export async function fetchMarketData(ticker: string, apiKey: string | null): Promise<FetchResult> {
  if (!apiKey) {
    return { error: 'API key for Alpha Vantage is not configured. Please set ALPHAVANTAGE_API_KEY in your environment variables.' };
  }
  
  let url = '';
  let isForex = false;

  if (isCurrencyPair(ticker)) {
    const from_symbol = ticker.substring(0, 3);
    const to_symbol = ticker.substring(3, 6);
    url = `${BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${apiKey}&outputsize=full`;
    isForex = true;
  } else {
    url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${apiKey}&outputsize=full`;
  }


  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { error: 'Failed to fetch data from the provider. The service may be temporarily unavailable.' };
    }

    const data = await response.json();

    if (data['Note']) {
        return { error: `API rate limit likely exceeded. Please wait a moment and try again. The free plan is limited.` };
    }
    
    const timeSeriesKey = isForex ? 'Time Series FX (Daily)' : 'Time Series (Daily)';
    const timeSeries = data[timeSeriesKey];
    
    if (data['Error Message'] || data['Information'] || !timeSeries) {
      const errorMessage = data['Error Message'] || data['Information'] || `No data found for ticker symbol "${ticker}". Please check if the symbol is correct and listed.`;
      return { error: `Invalid ticker symbol or API error: ${errorMessage}` };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']).toFixed(isForex ? 4 : 2),
      high: parseFloat(values['2. high']).toFixed(isForex ? 4 : 2),
      low: parseFloat(values['3. low']).toFixed(isForex ? 4 : 2),
      close: parseFloat(values['4. close']).toFixed(isForex ? 4 : 2),
      volume: values['5. volume'] || 'N/A',
    }));

    return { data: marketData.slice(0, 730) };
  } catch (err) {
    console.error(err);
    return { error: 'An unexpected error occurred while fetching data. Please check your network connection and try again.' };
  }
}

export async function searchSymbols(keywords: string, apiKey: string | null): Promise<SearchFetchResult> {
  if (!apiKey) {
    return { error: 'API key is not configured.' };
  }
  if (!keywords) {
    return { data: [] };
  }

  const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { error: 'Failed to fetch search results.' };
    }

    const data = await response.json();

    if (data['Note']) {
      // This is to avoid showing a rate limit error in the search dropdown
      return { data: [] };
    }

    if (data['Error Message'] || !data.bestMatches) {
      return { error: 'Error searching for symbols.' };
    }

    const searchData: SearchResult[] = data.bestMatches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      currency: match['8. currency'],
    }));

    return { data: searchData };
  } catch (err) {
    console.error(err);
    return { error: 'An unexpected error occurred during search.' };
  }
}
