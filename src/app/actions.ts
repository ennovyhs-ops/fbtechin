'use server';

import type { MarketData, SearchResult, RsiData, MacdData, BbandsData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { isCurrencyPair, isCryptoPair, getCurrencyOrCryptoPair } from '@/lib/utils';

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
  if (!apiKey) {
    return { error: 'API key for Alpha Vantage is not configured. Please set ALPHAVANTAGE_API_KEY in your environment variables.' };
  }
  
  let url = '';
  let timeSeriesKey = '';
  let openKey: string, highKey: string, lowKey: string, closeKey: string, volumeKey: string;
  let precision = 2;

  if (isCryptoPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${from_symbol}&market=${to_symbol}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series (Digital Currency Daily)';
    openKey = `1a. open (${to_symbol})`;
    highKey = `2a. high (${to_symbol})`;
    lowKey = `3a. low (${to_symbol})`;
    closeKey = `4a. close (${to_symbol})`;
    volumeKey = '5. volume';
    precision = 2; // Keep it simple for crypto for now
  } else if (isCurrencyPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series FX (Daily)';
    openKey = '1. open';
    highKey = '2. high';
    lowKey = '3. low';
    closeKey = '4. close';
    volumeKey = '5. volume';
    precision = 4;
  } else {
    url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${apiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series (Daily)';
    openKey = '1. open';
    highKey = '2. high';
    lowKey = '3. low';
    closeKey = '4. close';
    volumeKey = '5. volume';
    precision = 2;
  }


  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { error: 'Failed to fetch data from the provider. The service may be temporarily unavailable.' };
    }

    const data = await response.json();

    if (data['Note']) {
        return { error: `API rate limit likely exceeded. Please wait a moment and try again. The free plan is limited.` };
    }
    
    const timeSeries = data[timeSeriesKey];
    
    if (data['Error Message'] || data['Information'] || !timeSeries) {
      const errorMessage = data['Error Message'] || data['Information'] || `No data found for symbol "${ticker}". Please check if the symbol is correct and listed.`;
      return { error: `Invalid symbol or API error: ${errorMessage}` };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values[openKey]).toFixed(precision),
      high: parseFloat(values[highKey]).toFixed(precision),
      low: parseFloat(values[lowKey]).toFixed(precision),
      close: parseFloat(values[closeKey]).toFixed(precision),
      volume: values[volumeKey] || 'N/A',
    }));

    return { data: marketData.slice(0, 730) };
  } catch (err) {
    console.error(err);
    return { error: 'An unexpected error occurred while fetching data. Please check your network connection and try again.' };
  }
}

async function fetchIndicatorData(apiKey: string, ticker: string, func: 'RSI' | 'MACD' | 'BBANDS', timePeriod: number = 20): Promise<any> {
    const isForex = isCurrencyPair(ticker);
    const isCrypto = isCryptoPair(ticker);
    let symbol = ticker;

    if (isForex || isCrypto) {
        // Indicators for forex/crypto use the symbols directly
    }

    let url = `${BASE_URL}?function=${func}&symbol=${symbol}&interval=daily&series_type=close&apikey=${apiKey}`;
    if(func === 'RSI') url += `&time_period=14`;
    if(func === 'MACD') url += `&fastperiod=12&slowperiod=26&signalperiod=9`;
    if(func === 'BBANDS') url += `&time_period=${timePeriod}&nbdevup=2&nbdevdn=2`;

    try {
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();

        if (data['Note']) {
            return { error: 'Rate limit' };
        }
        if (data['Error Message'] || !data[`Technical Analysis: ${func}`]) {
            return null;
        }

        const indicatorData = data[`Technical Analysis: ${func}`];
        return Object.entries(indicatorData).map(([date, values]: [string, any]) => ({
            date,
            ...values,
        }));
    } catch (err) {
        console.error(`Failed to fetch ${func} for ${ticker}`, err);
        return null;
    }
}

export async function fetchAllIndicators(ticker: string, apiKey: string | null): Promise<IndicatorsResult> {
    if (!apiKey) {
        return { error: 'API key not configured.' };
    }

    if (isCurrencyPair(ticker) || isCryptoPair(ticker)) {
        return { error: 'Technical indicators are not supported for currency or crypto pairs in this version.' };
    }

    try {
        const [rsi, macd, bbands] = await Promise.all([
            fetchIndicatorData(apiKey, ticker, 'RSI'),
            fetchIndicatorData(apiKey, ticker, 'MACD'),
            fetchIndicatorData(apiKey, ticker, 'BBANDS'),
        ]);

        const createError = (name: string, data: any) => {
            if (data?.error === 'Rate limit') return `API rate limit exceeded while fetching ${name}. Please wait and try again.`;
            return null;
        };

        const rsiError = createError('RSI', rsi);
        if (rsiError) return { error: rsiError };
        
        const macdError = createError('MACD', macd);
        if (macdError) return { error: macdError };

        const bbandsError = createError('BBANDS', bbands);
        if (bbandsError) return { error: bbandsError };

        return {
            rsi: rsi?.slice(0, 730) || [],
            macd: macd?.slice(0, 730) || [],
            bbands: bbands?.slice(0, 730) || [],
        };
    } catch (err) {
        console.error('An unexpected error occurred while fetching indicators', err);
        return { error: 'Could not fetch technical indicators.' };
    }
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
