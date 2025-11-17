
'use server';

import type { MarketData, FetchResult, NewsSentimentData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { isCurrencyPair, isCryptoPair, getCurrencyOrCryptoPair } from '@/lib/utils';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';


async function fetchTickerMetadata(ticker: string, apiKey: string): Promise<{currency: string, region: string}> {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${apiKey}`;
    const defaultMetadata = { currency: 'USD', region: 'United States' };
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return { currency: 'USD', region: '' }; 

        const data = await response.json();
        
        const bestMatch = data?.bestMatches?.find((match: any) => match['1. symbol'].toLowerCase() === ticker.toLowerCase());
        
        if (bestMatch) {
            return { currency: bestMatch['8. currency'], region: bestMatch['4. region'] };
        }
        
        // Default for US stocks if no specific match is found and not an international ticker
        if (!ticker.includes('.')) {
            return defaultMetadata;
        }

        return { currency: 'USD', region: '' }; // Fallback
    } catch (error) {
        console.error("Could not fetch currency for ticker:", error);
        return { currency: 'USD', region: '' }; // Default to USD on error
    }
}


export async function fetchMarketDataService(ticker: string): Promise<FetchResult> {
  const avApiKey = serverConfig.alphaVantageApiKey;
  if (!avApiKey) {
    return { error: 'API key for Alpha Vantage is not configured. Please set ALPHAVANTAGE_API_KEY in your environment variables.' };
  }
  
  let url = '';
  let timeSeriesKey = '';
  let openKey: string, highKey: string, lowKey: string, closeKey: string, volumeKey: string;
  let precision = 2;
  let currency: string | null = null;
  let region: string | null = null;

  if (isCryptoPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${from_symbol}&market=${to_symbol}&apikey=${avApiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series (Digital Currency Daily)';
    openKey = `1a. open (${to_symbol})`;
    highKey = `2a. high (${to_symbol})`;
    lowKey = `3a. low (${to_symbol})`;
    closeKey = `4a. close (${to_symbol})`;
    volumeKey = '5. volume';
    precision = 2;
    currency = to_symbol;
    region = 'Cryptocurrency';
  } else if (isCurrencyPair(ticker)) {
    const { from_symbol, to_symbol } = getCurrencyOrCryptoPair(ticker);
    url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${avApiKey}&outputsize=full`;
    timeSeriesKey = 'Time Series FX (Daily)';
    openKey = '1. open';
    highKey = '2. high';
    lowKey = '3. low';
    closeKey = '4. close';
    volumeKey = '5. volume';
    precision = 4;
    currency = to_symbol;
    region = 'Forex';
  } else {
    // For stocks, we no longer fetch metadata to save an API call.
    // We assume USD and don't display a region.
    currency = 'USD';
    region = 'Alpha Vantage'; // Generic region
    url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${avApiKey}&outputsize=full`;
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
      throw new Error('Alpha Vantage service may be temporarily unavailable.');
    }

    const data = await response.json();

    // Check for API limit or other critical errors from Alpha Vantage
    if (data['Note'] || data['Information'] || data['Error Message']) {
      const errorMessage = data['Note'] || data['Information'] || data['Error Message'];
      return { error: errorMessage };
    }
    
    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      // Try to get metadata for a more specific error message if the symbol is not found.
       const metadata = data['Meta Data'];
       if (metadata) {
         throw new Error(`No data found for symbol "${ticker}". Please ensure it's a valid symbol.`);
       }
       throw new Error(`No data found for symbol "${ticker}" from Alpha Vantage.`);
    }


    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values[openKey]).toFixed(precision),
      high: parseFloat(values[highKey]).toFixed(precision),
      low: parseFloat(values[lowKey]).toFixed(precision),
      close: parseFloat(values[closeKey]).toFixed(precision),
      volume: values[volumeKey] || 'N/A',
    }));

    return { data: marketData.slice(0, 730), currency, region };
  } catch (err: any) {
    console.error(`Primary fetch failed for ${ticker}:`, err.message);
    return { error: err.message || 'An unexpected error occurred while fetching data. Please check your network connection and try again.' };
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
