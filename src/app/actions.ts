
'use server';

import type { MarketData, FetchResult, NewsSentimentData, AnalyzeOptionPlayInput, AnalyzeOptionPlayOutput } from '@/lib/types';
import { fetchMarketDataService, fetchNewsSentimentService } from '@/lib/server-services';
import { analyzeOptionPlay } from '@/ai/flows/analyze-option-play';

export async function fetchMarketData(ticker: string, outputsize: 'compact' | 'full' = 'full'): Promise<FetchResult> {
  return fetchMarketDataService(ticker, outputsize);
}

export async function fetchNewsSentiment(ticker: string): Promise<NewsSentimentData> {
    return fetchNewsSentimentService(ticker);
}

export async function analyzeOptionPlayAction(input: AnalyzeOptionPlayInput): Promise<AnalyzeOptionPlayOutput> {
    return analyzeOptionPlay(input);
}
