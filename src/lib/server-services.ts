
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

  let func: string;
  let dataKey: string;
  let url: string;

  const isForex = isCurrencyPair(ticker);
  const isCrypto = isCryptoPair(ticker);

  if (isForex) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    func = 'FX_DAILY';
    dataKey = 'Time Series FX (Daily)';
    url = `${ALPHA_VANTAGE_BASE_URL}?function=${func}&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${avApiKey}&outputsize=compact`;
  } else if (isCrypto) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    func = 'DIGITAL_CURRENCY_DAILY';
    dataKey = 'Time Series (Digital Currency Daily)';
    url = `${ALPHA_VANTAGE_BASE_URL}?function=${func}&symbol=${from_symbol}&market=${to_symbol}&apikey=${avApiKey}&outputsize=compact`;
  } else {
    func = 'TIME_SERIES_DAILY';
    dataKey = 'Time Series (Daily)';
    url = `${ALPHA_VANTAGE_BASE_URL}?function=${func}&symbol=${ticker}&apikey=${avApiKey}&outputsize=compact`;
  }
  
  const urlForDisplay = url.replace(avApiKey, '[HIDDEN_API_KEY]');

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Data request failed.');
    
    const data = await response.json();
    
    if (data['Note'] || data['Information'] || data['Error Message']) {
      return { error: data['Note'] || data['Information'] || data['Error Message'], url: urlForDisplay };
    }
    
    const timeSeries = data[dataKey];
    if (!timeSeries) {
      return { error: `Time series data not found for "${ticker}". It may be an invalid symbol or the API endpoint for this asset type is unavailable.`, url: urlForDisplay };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => {
       if (isCrypto) {
         return {
            date,
            open: values['1a. open (USD)'],
            high: values['2a. high (USD)'],
            low: values['3a. low (USD)'],
            close: values['4a. close (USD)'],
            volume: values['5. volume'],
         }
       }
       if (isForex) {
         return {
            date,
            open: values['1. open'],
            high: values['2. high'],
            low: values['3. low'],
            close: values['4. close'],
            volume: 'N/A',
          }
       }
       return {
        date,
        open: values['1. open'],
        high: values['2. high'],
        low: values['3. low'],
        close: values['4. close'],
        volume: values['5. volume'],
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { data: marketData };

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
