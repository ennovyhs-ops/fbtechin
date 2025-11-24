
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
  
  let url = '';
  let timeSeriesKey = '';
  let openKey: string, highKey: string, lowKey: string, closeKey: string, volumeKey: string;
  let precision = 2;
  let currency: string | null = null;
  let region: string | null = null;

  if (isCryptoPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${from_symbol}&market=${to_symbol}&apikey=${avApiKey}&outputsize=full`;
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
    url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${avApiKey}&outputsize=full`;
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
    // For stocks/ETFs, we now use a two-step process.
    // 1. Search for the symbol to get accurate metadata and determine the best API function.
    const searchUrl = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${avApiKey}`;
    
    try {
        const searchResponse = await fetch(searchUrl, { cache: 'no-store' });
        const searchData = await searchResponse.json();
        
        if (searchData['Note'] || searchData['Information']) {
            return { error: searchData['Note'] || searchData['Information'] };
        }
        if (searchData['Error Message']) {
             return { error: `Symbol search failed: ${searchData['Error Message']}` };
        }
        if (!searchData.bestMatches || searchData.bestMatches.length === 0) {
            return { error: `No matching symbols found for "${ticker}".` };
        }
        
        // Find the best match, preferring exact ticker matches
        const bestMatch = searchData.bestMatches.find((m: any) => m['1. symbol'] === ticker) || searchData.bestMatches[0];
        
        const symbol = bestMatch['1. symbol'];
        currency = bestMatch['8. currency'];
        region = bestMatch['4. region'];
        
        // Determine which function to use. Adjusted is generally more robust.
        // Some asset types like ETFs might not work with TIME_SERIES_DAILY.
        const apiFunction = 'TIME_SERIES_DAILY';
        url = `${ALPHA_VANTAGE_BASE_URL}?function=${apiFunction}&symbol=${symbol}&apikey=${avApiKey}&outputsize=full`;
        timeSeriesKey = 'Time Series (Daily)';
        openKey = '1. open';
        highKey = '2. high';
        lowKey = '3. low';
        closeKey = '4. close';
        volumeKey = '5. volume';
        precision = 2;

    } catch (err: any) {
        console.error(`Symbol search failed for ${ticker}:`, err.message);
        return { error: `Failed to search for ticker symbol "${ticker}". It may be invalid or the service is temporarily down.` };
    }
  }

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Alpha Vantage service may be temporarily unavailable.');
    }

    const data = await response.json();

    // Check for API limit or other critical errors from Alpha Vantage
    if (data['Note'] || data['Information'] || data['Error Message']) {
      const errorMessage = data['Note'] || data['Information'] || data['Error Message'];
      return { error: errorMessage };
    }
    
    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
       throw new Error(`No time series data found for symbol "${ticker}". Please ensure it's a valid symbol.`);
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
  } catch (err: any) {
    console.error(`Primary fetch failed for ${ticker}:`, err.message);
    return { error: err.message || 'An unexpected error occurred while fetching data. Please check your network connection and try again.' };
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
