'use server';

import type { MarketData, SearchResult, RsiData, MacdData, BbandsData, RocData } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { fetchMarketDataService } from '@/lib/server-services';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateROC } from '@/lib/technical-analysis';

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

const formatNumber = (num: number | null | undefined, precision: number = 2): string | null => {
    if (num === null || num === undefined || isNaN(num)) {
        return null;
    }
    return num.toFixed(precision);
}

export async function calculateAllIndicators(marketData: MarketData[]): Promise<IndicatorsResult> {
    if (!marketData || marketData.length === 0) {
        return { error: 'Market data is required for indicator calculation.' };
    }
    
    // The data comes in descending order, but calculations need ascending.
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));

    try {
        const rsi = calculateRSI(closePrices, 14).reverse();
        const macd = calculateMACD(closePrices, 12, 26, 9).reverse();
        const bbands = calculateBollingerBands(closePrices, 20, 2).reverse();
        const roc = calculateROC(closePrices, 22).reverse();

        // Match dates from original data (which is descending)
        const datedRsi = rsi.map((val, i) => ({ 
            date: marketData[i].date, 
            RSI: formatNumber(val) 
        }));
        const datedMacd = macd.map((val, i) => ({ 
            date: marketData[i].date, 
            MACD: formatNumber(val.MACD),
            MACD_Signal: formatNumber(val.signal),
            MACD_Hist: formatNumber(val.histogram)
        }));
        const datedBbands = bbands.map((val, i) => ({ 
            date: marketData[i].date, 
            'Real Upper Band': formatNumber(val.upper),
            'Real Middle Band': formatNumber(val.middle),
            'Real Lower Band': formatNumber(val.lower)
        }));
        const datedRoc = roc.map((val, i) => ({ 
            date: marketData[i].date, 
            'ROC': formatNumber(val, 2)
        }));

        return {
            rsi: datedRsi as RsiData[],
            macd: datedMacd as MacdData[],
            bbands: datedBbands as BbandsData[],
            roc: datedRoc as RocData[]
        };

    } catch(e: any) {
        return { error: `An error occurred during indicator calculation: ${e.message}`};
    }
}
