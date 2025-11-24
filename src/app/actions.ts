
'use server';

import type { MarketData, FetchResult, NewsSentimentData } from '@/lib/types';
import { fetchMarketDataService, fetchNewsSentimentService } from '@/lib/server-services';

export async function fetchMarketData(ticker: string, functionType?: 'TIME_SERIES_DAILY' | 'AUTO'): Promise<FetchResult> {
  return fetchMarketDataService(ticker, functionType);
}

export async function fetchNewsSentiment(ticker: string): Promise<NewsSentimentData> {
    return fetchNewsSentimentService(ticker);
}
