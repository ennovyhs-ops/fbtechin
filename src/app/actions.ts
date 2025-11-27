
'use server';

import type { MarketData, FetchResult, NewsSentimentData } from '@/lib/types';
import { fetchMarketDataService, fetchNewsSentimentService } from '@/lib/server-services';

export async function fetchMarketData(ticker: string, outputsize: 'compact' | 'full' = 'full'): Promise<FetchResult> {
  return fetchMarketDataService(ticker, outputsize);
}

export async function fetchNewsSentiment(ticker: string): Promise<NewsSentimentData> {
    return fetchNewsSentimentService(ticker);
}
