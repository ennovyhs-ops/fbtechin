
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

  let url: string;
  let dataKey: string;
  const isForex = isCurrencyPair(ticker);
  const isCrypto = isCryptoPair(ticker);

  if (isForex) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${avApiKey}&outputsize=full`;
    dataKey = 'Time Series FX (Daily)';
  } else if (isCrypto) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${from_symbol}&market=${to_symbol}&apikey=${avApiKey}&outputsize=full`;
    dataKey = `Time Series (Digital Currency Daily)`;
  } else {
    url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${avApiKey}&outputsize=full`;
    dataKey = 'Time Series (Daily)';
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
      return { error: `Time series data not found for "${ticker}". It may be an invalid symbol, or the API function is not supported for this asset type.`, url: urlForDisplay };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => {
      if (isForex) {
        return {
          date,
          open: values['1. open'],
          high: values['2. high'],
          low: values['3. low'],
          close: values['4. close'],
          volume: 'N/A',
        }
      } else if (isCrypto) {
         return {
          date,
          // Crypto uses keys like "1a. open (USD)"
          open: values[Object.keys(values).find(k => k.startsWith('1a. open'))!],
          high: values[Object.keys(values).find(k => k.startsWith('2a. high'))!],
          low: values[Object.keys(values).find(k => k.startsWith('3a. low'))!],
          close: values[Object.keys(values).find(k => k.startsWith('4a. close'))!],
          volume: values[Object.keys(values).find(k => k.startsWith('5. volume'))!],
        }
      } else { // Stocks
        return {
          date,
          open: values['1. open'],
          high: values['2. high'],
          low: values['3. low'],
          close: values['4. close'],
          volume: values['5. volume'],
        }
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
