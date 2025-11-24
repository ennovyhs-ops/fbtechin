
'use server';

import type { MarketData, FetchResult, NewsSentimentData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { isCurrencyPair, isCryptoPair, getCurrencyOrCryptoPair } from '@/lib/utils';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';


export async function fetchMarketDataService(ticker: string): Promise<FetchResult> {
  const avApiKey = serverConfig.alphaVantageApiKey;
  if (!avApiKey) {
    return { error: 'API key for Alpha Vantage is not configured. Please set ALPHAVANTAGE_API_KEY in your environment variables.' };
  }

  // --- Step 1: Handle Crypto and Forex directly as they have a clear format ---
  if (isCryptoPair(ticker) || isCurrencyPair(ticker)) {
    return fetchDirectMarketData(ticker, avApiKey);
  }

  // --- Step 2: Use SYMBOL_SEARCH for all other tickers to find the best match and metadata ---
  const searchUrl = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${avApiKey}`;
  const searchUrlForDisplay = searchUrl.replace(avApiKey, '[HIDDEN_API_KEY]');

  try {
    const searchResponse = await fetch(searchUrl, { cache: 'no-store' });
    if (!searchResponse.ok) throw new Error('Symbol search request failed.');
    
    const searchData = await searchResponse.json();

    if (searchData['Note'] || searchData['Information']) {
       return { error: searchData['Note'] || searchData['Information'], url: searchUrlForDisplay };
    }
    if (!searchData.bestMatches || searchData.bestMatches.length === 0) {
      return { error: `No matching symbols found for "${ticker}".`, url: searchUrlForDisplay };
    }

    // Find the best match, preferring US markets if multiple matches exist with the same symbol
    const bestMatch = searchData.bestMatches.find((m: any) => m['1. symbol'].toUpperCase() === ticker.toUpperCase() && m['4. region'] === 'United States') 
                   || searchData.bestMatches[0];
    
    const symbol = bestMatch['1. symbol'];
    const region = bestMatch['4. region'];
    const currency = bestMatch['8. currency'];
    
    // --- Step 3: Fetch the time series data using the confirmed symbol ---
    const dataUrl = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${avApiKey}&outputsize=full`;
    const dataUrlForDisplay = dataUrl.replace(avApiKey, '[HIDDEN_API_KEY]');

    const dataResponse = await fetch(dataUrl, { cache: 'no-store' });
    if (!dataResponse.ok) throw new Error('Time series data request failed.');
    
    const data = await dataResponse.json();

    if (data['Note'] || data['Information'] || data['Error Message']) {
      return { error: data['Note'] || data['Information'] || data['Error Message'], url: dataUrlForDisplay };
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      return { error: `Time series data not available for symbol "${symbol}".`, url: dataUrlForDisplay };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']).toFixed(2),
      high: parseFloat(values['2. high']).toFixed(2),
      low: parseFloat(values['3. low']).toFixed(2),
      close: parseFloat(values['4. close']).toFixed(2),
      volume: values['5. volume'] || 'N/A',
    }));

    return { data: marketData.slice(0, 730), currency, region };

  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred during symbol search and data fetch.', url: searchUrlForDisplay };
  }
}

// Handles direct fetching for assets with a clear, non-ambiguous format like Forex and Crypto
async function fetchDirectMarketData(ticker: string, apiKey: string): Promise<FetchResult> {
  let url = '';
  let timeSeriesKey = '';
  let openKey: string, highKey: string, lowKey: string, closeKey: string, volumeKey: string;
  let precision = 2;
  let currency: string | null = null;
  let region: string | null = null;
  
  if (isCryptoPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${from_symbol}&market=${to_symbol}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series (Digital Currency Daily)';
    openKey = `1a. open (${to_symbol})`;
    highKey = `2a. high (${to_symbol})`;
    lowKey = `3a. low (${to_symbol})`;
    closeKey = `4a. close (${to_symbol})`;
    volumeKey = '5. volume';
    precision = 2;
    currency = to_symbol;
    region = 'Cryptocurrency';
  } else if (isCurrencyPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series FX (Daily)';
    openKey = '1. open';
    highKey = '2. high';
    lowKey = '3. low';
    closeKey = '4. close';
    volumeKey = '5. volume'; // This key doesn't exist for FX, will result in 'N/A'
    precision = 4;
    currency = to_symbol;
    region = 'Forex';
  } else {
    return { error: 'This function is only for direct crypto/forex fetching.' };
  }
  
  const urlForDisplay = url.replace(apiKey, '[HIDDEN_API_KEY]');

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Data request failed.');
    
    const data = await response.json();
    
    if (data['Note'] || data['Information'] || data['Error Message']) {
      return { error: data['Note'] || data['Information'] || data['Error Message'], url: urlForDisplay };
    }
    
    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      return { error: `No time series data found for "${ticker}".`, url: urlForDisplay };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values[openKey]).toFixed(precision),
      high: parseFloat(values[highKey]).toFixed(precision),
      low: parseFloat(values[lowKey]).toFixed(precision),
      close: parseFloat(values[closeKey]).toFixed(precision),
      volume: values[volumeKey] || 'N/A',
    }));

    return { data: marketData.slice(0, 730), currency, region };

  } catch(err: any) {
    return { error: err.message || 'An unexpected error occurred.', url: urlForDisplay };
  }
}


export async function fetchNewsSentimentService(ticker: string): Promise<NewsSentimentData> {
  const apiKey = serverConfig.alphaVantageApiKey;
  if (!apiKey) {
    return { error: 'API key is not configured.' };
  }

  const url = `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT&tickers=${ticker}&apikey=${apiKey}&limit=50`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { error: 'Failed to fetch news data.' };
    }
    const data = await response.json();
    
    if (data['Note'] || data['Information']) {
        return { error: data['Note'] || data['Information'] };
    }
    if (data['Error Message']) {
      return { error: data['Error Message'] };
    }

    return { articles: data.feed || [] };
  } catch (err) {
    return { error: 'An unexpected error occurred while fetching news.' };
  }
}
