
'use server';

import type { MarketData, RsiData, MacdData, BbandsData, RocData, FetchResult, NewsSentimentData, IndicatorPeriods } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { fetchMarketDataService, fetchNewsSentimentService } from '@/lib/server-services';

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

export async function fetchNewsSentiment(ticker: string): Promise<NewsSentimentData> {
    return fetchNewsSentimentService(ticker);
}

const formatNumber = (num: number | string | null | undefined, precision: number = 2): string | null => {
    if (num === null || num === undefined) return null;
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return null;
    return numValue.toFixed(precision);
};


async function fetchIndicatorData(ticker: string, func: string, periods: IndicatorPeriods, apiKey: string): Promise<any> {
    const { macd, rsi, bbands, roc } = periods;
    let url = `https://www.alphavantage.co/query?function=${func}&symbol=${ticker}&interval=daily&series_type=close&apikey=${apiKey}`;

    switch (func) {
        case 'RSI':
            url += `&time_period=${rsi}`;
            break;
        case 'MACD':
            url += `&fastperiod=${macd.fast}&slowperiod=${macd.slow}&signalperiod=${macd.signal}`;
            break;
        case 'BBANDS':
            url += `&time_period=${bbands.period}&nbdevup=${bbands.stdDev}&nbdevdn=${bbands.stdDev}`;
            break;
        case 'ROC':
            url += `&time_period=${roc}`;
            break;
    }

    try {
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();
        if (data['Error Message'] || data['Note'] || data['Information']) {
            throw new Error(data['Error Message'] || data['Note'] || data['Information'] || `Failed to fetch ${func}`);
        }
        return data[`Technical Analysis: ${func}`];
    } catch (e: any) {
        console.error(`Failed to fetch ${func}:`, e.message);
        throw new Error(`Could not fetch data for ${func}. This may be due to API limits.`);
    }
}


export async function calculateIndicatorsApi(ticker: string, periods: IndicatorPeriods): Promise<IndicatorsResult> {
    const apiKey = serverConfig.alphaVantageApiKey;
    if (!apiKey) {
        return { error: 'API key is not configured.' };
    }
     if (!ticker) {
        return { error: 'Ticker is required.' };
    }

    try {
        const [rsiData, macdData, bbandsData, rocData] = await Promise.all([
            fetchIndicatorData(ticker, 'RSI', periods, apiKey),
            fetchIndicatorData(ticker, 'MACD', periods, apiKey),
            fetchIndicatorData(ticker, 'BBANDS', periods, apiKey),
            fetchIndicatorData(ticker, 'ROC', periods, apiKey),
        ]);

        const dates = Object.keys(rsiData || macdData || bbandsData || rocData || {});

        const datedRsi: RsiData[] = [];
        const datedMacd: MacdData[] = [];
        const datedBbands: BbandsData[] = [];
        const datedRoc: RocData[] = [];
        
        // Sort dates descending
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        for (const date of dates) {
            if (rsiData?.[date]) {
                datedRsi.push({ date, RSI: formatNumber(rsiData[date].RSI) });
            }
            if (macdData?.[date]) {
                datedMacd.push({ 
                    date,
                    'MACD_Hist': formatNumber(macdData[date].MACD_Hist),
                    'MACD_Signal': formatNumber(macdData[date].MACD_Signal),
                    'MACD': formatNumber(macdData[date].MACD)
                });
            }
            if (bbandsData?.[date]) {
                datedBbands.push({
                    date,
                    'Real Upper Band': formatNumber(bbandsData[date]['Real Upper Band']),
                    'Real Middle Band': formatNumber(bbandsData[date]['Real Middle Band']),
                    'Real Lower Band': formatNumber(bbandsData[date]['Real Lower Band'])
                });
            }
            if (rocData?.[date]) {
                datedRoc.push({ date, 'ROC': formatNumber(rocData[date].ROC) });
            }
        }
        
        return {
            rsi: datedRsi,
            macd: datedMacd,
            bbands: datedBbands,
            roc: datedRoc,
        };

    } catch (e: any) {
        return { error: `An error occurred during indicator calculation: ${e.message}` };
    }
}
