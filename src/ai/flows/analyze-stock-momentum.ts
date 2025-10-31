'use server';

/**
 * @fileOverview This file defines a Genkit flow to analyze stock momentum based on technical indicators.
 *
 * - analyzeStockMomentum - A function that takes a stock ticker and its data and returns a momentum analysis.
 * - AnalyzeStockMomentumInput - The input type for the analyzeStockMomentum function.
 * - AnalyzeStockMomentumOutput - The output type for the analyzeStockMomentum function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchMarketDataService, fetchAllIndicatorsService } from '@/lib/server-services';
import type { MarketData, RsiData, MacdData, BbandsData } from '@/lib/types';


const AnalysisSchema = z.object({
  signal: z.enum(["Strong Bullish", "Bullish", "Neutral", "Bearish", "Strong Bearish", "N/A"]),
  reasoning: z.string(),
});

const AnalyzeStockMomentumOutputSchema = z.object({
  primaryTrend: AnalysisSchema.describe("Analysis of the primary trend using SMA."),
  momentum: AnalysisSchema.describe("Analysis of momentum using MACD."),
  velocity: AnalysisSchema.describe("Analysis of overbought/oversold conditions using RSI."),
  volume: AnalysisSchema.describe("Analysis of volume confirmation."),
  conclusion: z.string().describe("A final one-sentence conclusion (e.g., 'The overall momentum for the stock is bullish.')."),
  summary: z.string().describe("A concise, one-paragraph summary of the combined analysis."),
});
export type AnalyzeStockMomentumOutput = z.infer<typeof AnalyzeStockMomentumOutputSchema>;

const AnalyzeStockMomentumInputSchema = z.object({
  ticker: z.string(),
  marketData: z.custom<MarketData[]>(),
  indicators: z.custom<{ rsi: RsiData[], macd: MacdData[], bbands: BbandsData[] }>(),
});
export type AnalyzeStockMomentumInput = z.infer<typeof AnalyzeStockMomentumInputSchema>;


export async function analyzeStockMomentum(
  ticker: string
): Promise<AnalyzeStockMomentumOutput | { error: string }> {
  try {
    const marketDataResult = await fetchMarketDataService(ticker);
    if (marketDataResult.error || !marketDataResult.data) {
        return { error: marketDataResult.error || "Failed to fetch market data." };
    }

    const indicatorsResult = await fetchAllIndicatorsService(ticker);
    if (indicatorsResult.error || !indicatorsResult.rsi || !indicatorsResult.macd || !indicatorsResult.bbands) {
        return { error: indicatorsResult.error || "Failed to fetch technical indicators." };
    }
    
    const input: AnalyzeStockMomentumInput = {
        ticker,
        marketData: marketDataResult.data,
        indicators: {
            rsi: indicatorsResult.rsi,
            macd: indicatorsResult.macd,
            bbands: indicatorsResult.bbands
        }
    };

    return analyzeStockMomentumFlow(input);

  } catch (e: any) {
    console.error(e);
    return { error: 'An unexpected error occurred during analysis.' };
  }
}

const momentumAnalysisPrompt = ai.definePrompt({
  name: 'momentumAnalysisPrompt',
  input: { schema: AnalyzeStockMomentumInputSchema },
  output: { schema: AnalyzeStockMomentumOutputSchema },
  prompt: `You are an expert financial analyst AI. Your task is to analyze the provided stock data for "{{ticker}}" based on a specific momentum analysis flowchart.

Analyze the data and provide a signal (Strong Bullish, Bullish, Neutral, Bearish, Strong Bearish) and reasoning for each of the four steps. Then, provide a final conclusion and a summary paragraph.

**Provided Data:**
- **Latest Price:** {{marketData.0.close}}
- **20-day SMA (from Bollinger Bands Middle Band):** {{indicators.bbands.0.Real Middle Band}}
- **Latest Volume:** {{marketData.0.volume}}
- **20-day Average Volume:** (Calculate the average of the 'volume' field from the last 20 entries in marketData)
- **Latest RSI (14-day):** {{indicators.rsi.0.RSI}}
- **Latest MACD Line:** {{indicators.macd.0.MACD}}
- **Latest MACD Signal Line:** {{indicators.macd.0.MACD_Signal}}
- **Latest MACD Histogram:** {{indicators.macd.0.MACD_Hist}}

**Analysis Steps:**

1.  **Primary Trend (using 20-day SMA):**
    -   Is the latest price above or below the 20-day SMA?
    -   Determine if the trend is Up or Down. A price significantly above the SMA is a stronger signal.
    -   Signal: Bullish if Price > SMA, Bearish if Price < SMA.

2.  **Momentum & Acceleration (MACD):**
    -   Is the MACD line above or below the Signal line?
    -   Is the Histogram positive or negative? A large positive value indicates strong bullish momentum. A large negative value indicates strong bearish momentum.
    -   Signal: Bullish if MACD > Signal Line, Bearish if MACD < Signal Line.

3.  **Velocity & Conditions (RSI):**
    -   Is the RSI > 70 (Overbought), < 30 (Oversold), or in the neutral 30-70 zone?
    -   Overbought suggests upward momentum might be exhausting. Oversold suggests downward momentum might be exhausting.
    -   Signal: Bearish if > 70, Bullish if < 30, Neutral otherwise.

4.  **Volume Confirmation:**
    -   Is the latest volume significantly higher or lower than the 20-day average volume?
    -   High volume on a price move adds conviction. Low volume suggests a lack of conviction.
    -   Signal: Bullish if volume is high on an up-move, Bearish if volume is high on a down-move. Neutral if volume is average or low.

Synthesize these four signals to form a final conclusion and a summary of the stock's current momentum.
`,
});


const analyzeStockMomentumFlow = ai.defineFlow(
  {
    name: 'analyzeStockMomentumFlow',
    inputSchema: AnalyzeStockMomentumInputSchema,
    outputSchema: AnalyzeStockMomentumOutputSchema,
  },
  async (input) => {
    // For indicators not supported for forex/crypto, return a specific structure.
    if (isCurrencyPair(input.ticker) || isCryptoPair(input.ticker)) {
      const notApplicableAnalysis: AnalyzeStockMomentumOutput = {
        primaryTrend: { signal: 'N/A', reasoning: 'SMA analysis is not applicable to currency or crypto pairs in this context.' },
        momentum: { signal: 'N/A', reasoning: 'MACD is not available for this asset type.' },
        velocity: { signal: 'N/A', reasoning: 'RSI is not available for this asset type.' },
        volume: { signal: 'N/A', reasoning: 'Volume confirmation is not applicable.' },
        conclusion: 'Momentum analysis is not available for currency or crypto pairs.',
        summary: 'The requested momentum analysis requires technical indicators that are not supported for currency or crypto pairs with the current data provider.'
      };
      return notApplicableAnalysis;
    }

    const { output } = await momentumAnalysisPrompt(input);
    return output!;
  }
);
