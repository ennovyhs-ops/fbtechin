
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
  let openKey = '1. open', highKey = '2. high', lowKey = '3. low', closeKey = '4. close', volumeKey = '5. volume';
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
    precision = 2; // Keep more precision for crypto
    currency = to_symbol;
    region = 'Cryptocurrency';
  } else if (isCurrencyPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${avApiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series FX (Daily)';
    precision = 4; // More precision for forex
    currency = to_symbol;
    region = 'Forex';
  } else {
    // Default to a standard stock
    url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${avApiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series (Daily)';
    currency = 'USD';
    region = 'United States';
  }

  const urlForDisplay = url.replace(avApiKey, '[HIDDEN_API_KEY]');

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Data request failed.');
    
    const data = await response.json();
    
    if (data['Note'] || data['Information'] || data['Error Message']) {
      return { error: data['Note'] || data['Information'] || data['Error Message'], url: urlForDisplay };
    }
    
    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      return { error: `Time series data not found for "${ticker}". It may be an invalid symbol or the API function might be incorrect for this asset type.`, url: urlForDisplay };
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
