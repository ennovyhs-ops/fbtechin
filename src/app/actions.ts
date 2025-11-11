
'use server';

import type { MarketData, RsiData, MacdData, BbandsData, RocData, FetchResult, NewsSentimentData, IndicatorPeriods, SearchResult } from '@/lib/types';
import { serverConfig } from '@/lib/server-config';
import { fetchMarketDataService, fetchNewsSentimentService, searchSymbolsService } from '@/lib/server-services';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateROC } from '@/lib/technical-analysis';

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

export async function searchSymbols(keywords: string): Promise<SearchResult[]> {
    return searchSymbolsService(keywords);
}


const formatNumber = (num: number | null | undefined, precision: number = 2): string | null => {
    if (num === null || num === undefined || isNaN(num)) {
        return null;
    }
    return num.toFixed(precision);
}

export async function calculateAllIndicators(marketData: MarketData[], periods: IndicatorPeriods): Promise<IndicatorsResult> {
    if (!marketData || marketData.length === 0) {
        return { error: 'Market data is required for indicator calculation.' };
    }
    
    // The data comes in descending order, but calculations need ascending.
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));

    try {
        const rsi = calculateRSI(closePrices, periods.rsi).reverse();
        const macd = calculateMACD(closePrices, periods.macd.fast, periods.macd.slow, periods.macd.signal).reverse();
        const bbands = calculateBollingerBands(closePrices, periods.bbands.period, periods.bbands.stdDev).reverse();
        const roc = calculateROC(closePrices, periods.roc).reverse();

        // Match dates from original data (which is descending)
        const datedRsi = marketData.map((_, i) => ({ 
            date: marketData[i].date, 
            RSI: formatNumber(rsi[i]) 
        }));
        const datedMacd = marketData.map((_, i) => ({ 
            date: marketData[i].date, 
            MACD: formatNumber(macd[i]?.MACD),
            MACD_Signal: formatNumber(macd[i]?.signal),
            MACD_Hist: formatNumber(macd[i]?.histogram)
        }));
        const datedBbands = marketData.map((_, i) => ({ 
            date: marketData[i].date, 
            'Real Upper Band': formatNumber(bbands[i]?.upper),
            'Real Middle Band': formatNumber(bbands[i]?.middle),
            'Real Lower Band': formatNumber(bbands[i]?.lower)
        }));
        const datedRoc = marketData.map((_, i) => ({ 
            date: marketData[i].date, 
            'ROC': formatNumber(roc[i], 2)
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
