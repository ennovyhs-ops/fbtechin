
'use server';

import type { MarketData, FetchResult, NewsSentimentData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { fetchMarketDataService, fetchNewsSentimentService } from '@/lib/server-services';

export async function getApiKey() {
  return serverConfig.alphaVantageApiKey;
}

export async function fetchMarketData(ticker: string): Promise<FetchResult> {
  return fetchMarketDataService(ticker);
}

export async function fetchNewsSentiment(ticker: string): Promise<NewsSentimentData> {
    return fetchNewsSentimentService(ticker);
}
