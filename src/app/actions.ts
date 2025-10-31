'use server';

import type { MarketData, SearchResult, RsiData, MacdData, BbandsData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { fetchMarketDataService, fetchAllIndicatorsService } from '@/lib/server-services';

const BASE_URL = 'https://www.alphavantage.co/query';

interface FetchResult {
  data?: MarketData[] | null;
  error?: string | null;
}

interface SearchFetchResult {
  data?: SearchResult[] | null;
  error?: string | null;
}

interface IndicatorsResult {
    rsi?: RsiData[];
    macd?: MacdData[];
    bbands?: BbandsData[];
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

export async function searchSymbols(keywords: string, apiKey: string | null): Promise<SearchFetchResult> {
  if (!apiKey) {
    return { error: 'API key is not configured.' };
  }
  if (!keywords) {
    return { data: [] };
  }

  const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { error: 'Failed to fetch search results.' };
    }

    const data = await response.json();

    if (data['Note']) {
      // This is to avoid showing a rate limit error in the search dropdown
      return { data: [] };
    }

    if (data['Error Message'] || !data.bestMatches) {
      return { error: 'Error searching for symbols.' };
    }

    const searchData: SearchResult[] = data.bestMatches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      currency: match['8. currency'],
    }));

    return { data: searchData };
  } catch (err) {
    console.error(err);
    return { error: 'An unexpected error occurred during search.' };
  }
}
