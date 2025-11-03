
'use server';

import type { MarketData, SearchResult, RsiData, MacdData, BbandsData, RocData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { fetchMarketDataService, fetchAllIndicatorsService } from '@/lib/server-services';

interface FetchResult {
  data?: MarketData[] | null;
  error?: string | null;
}

interface IndicatorsResult {
    rsi?: RsiData[];
    macd?: MacdData[];
    bbands?: BbandsData[];
    roc?: RocData[];
    error?: string | null;
}

export async function getApiKey() {
  return serverConfig.alphaVantageApiKey;
}

export async function fetchMarketData(ticker: string): Promise<FetchResult> {
  return fetchMarketDataService(ticker);
}

export async function fetchAllIndicators(ticker: string): Promise<IndicatorsResult> {
    return fetchAllIndicatorsService(ticker);
}
