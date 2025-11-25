
'use server';

import type { MarketData, FetchResult, NewsSentimentData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

export async function fetchMarketDataService(ticker: string): Promise<FetchResult> {
  const avApiKey = serverConfig.alphaVantageApiKey;
  if (!avApiKey) {
    return { error: 'API key for Alpha Vantage is not configured. Please set ALPHAVANTAGE_API_KEY in your environment variables.' };
  }
  
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${avApiKey}&outputsize=full`;
  const urlForDisplay = url.replace(avApiKey, '[HIDDEN_API_KEY]');

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Data request failed.');
    
    const data = await response.json();
    
    if (data['Note'] || data['Information'] || data['Error Message']) {
      return { error: data['Note'] || data['Information'] || data['Error Message'], url: urlForDisplay };
    }
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      // This is a common failure point for invalid tickers or incorrect asset types
      return { error: `Time series data not found for "${ticker}". It may be an invalid symbol or the API function is not supported for this asset type (e.g. Forex/Crypto).`, url: urlForDisplay };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: values['1. open'],
      high: values['2. high'],
      low: values['3. low'],
      close: values['4. close'],
      volume: values['5. volume'],
    }));

    // Return only the most recent 2 years of data for performance
    return { data: marketData.slice(0, 730) };

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

    