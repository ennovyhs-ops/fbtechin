
'use server';

import type { MarketData, SearchResult, RsiData, MacdData, BbandsData, RocData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { fetchMarketDataService, fetchAllIndicatorsService } from '@/lib/server-services';

const BASE_URL = 'https://www.alphavantage.co/query';

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

export async function fetchMarketData(ticker: string, apiKey: string | null): Promise<FetchResult> {
  // apiKey is kept for compatibility but the service now reads from serverConfig
  return fetchMarketDataService(ticker);
}

export async function fetchAllIndicators(ticker: string, apiKey: string | null): Promise<IndicatorsResult> {
    // apiKey is kept for compatibility but the service now reads from serverConfig
    return fetchAllIndicatorsService(ticker);
}
