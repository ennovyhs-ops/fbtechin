'use server';

import type { MarketData } from '@/lib/types';

const API_KEY = process.env.ALPHAVANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

interface FetchResult {
  data?: MarketData[] | null;
  error?: string | null;
}

export async function fetchMarketData(ticker: string): Promise<FetchResult> {
  if (!API_KEY) {
    return { error: 'API key for Alpha Vantage is not configured. Please set ALPHAVANTAGE_API_KEY in your environment variables.' };
  }

  const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${API_KEY}&outputsize=full`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return { error: 'Failed to fetch data from the provider. The service may be temporarily unavailable.' };
    }

    const data = await response.json();

    const timeSeries = data['Time Series (Daily)'];
    
    if (data['Note']) {
        return { error: `API rate limit likely exceeded. Please wait a moment and try again. The free plan is limited.` };
    }

    if (data['Error Message'] || !timeSeries) {
      const errorMessage = data['Error Message'] || `No data found for ticker symbol "${ticker}". Please check if the symbol is correct and listed.`;
      return { error: `Invalid ticker symbol or API error: ${errorMessage}` };
    }

    const marketData: MarketData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']).toFixed(2),
      high: parseFloat(values['2. high']).toFixed(2),
      low: parseFloat(values['3. low']).toFixed(2),
      close: parseFloat(values['4. close']).toFixed(2),
      volume: values['5. volume'],
    }));

    // Return up to 2 years of data (approximately 730 days)
    return { data: marketData.slice(0, 730) };
  } catch (err) {
    console.error(err);
    return { error: 'An unexpected error occurred while fetching data. Please check your network connection and try again.' };
  }
}
