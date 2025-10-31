'use server';

/**
 * @fileOverview This file defines a Genkit flow to analyze stock momentum based on a detailed scoring model.
 *
 * - analyzeStockMomentum - A function that takes a stock ticker and returns a comprehensive momentum analysis.
 * - AnalyzeStockMomentumInput - The input type for the analyzeStockMomentum function.
 * - AnalyzeStockMomentumOutput - The output type for the analyzeStockMomentum function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchMarketDataService, fetchAllIndicatorsService } from '@/lib/server-services';
import type { MarketData, RsiData, MacdData, BbandsData, RocData } from '@/lib/types';
import { isCurrencyPair, isCryptoPair } from '@/lib/utils';

const AnalyzeStockMomentumOutputSchema = z.object({
  totalScore: z.number().describe("The final calculated score, ranging from -1.0 to +1.0."),
  signal: z.enum([
    "🚀 STRONG BULLISH",
    "✅ MODERATE BULLISH",
    "⚠️ MILD BULLISH",
    "⚖️ NEUTRAL",
    "⚠️ MILD BEARISH",
    "✅ MODERATE BEARISH",
    "🚨 STRONG BEARISH",
    "N/A"
  ]).describe("The overall signal derived from the total score."),
  interpretation: z.string().describe("A concise interpretation of the signal (e.g., 'High conviction long')."),
  tradeAction: z.string().describe("A suggested trading action based on the signal (e.g., 'Use pullbacks to enter').")
});
export type AnalyzeStockMomentumOutput = z.infer<typeof AnalyzeStockMomentumOutputSchema>;

const AnalyzeStockMomentumInputSchema = z.object({
  ticker: z.string(),
  marketData: z.custom<MarketData[]>(),
  indicators: z.custom<{ rsi: RsiData[], macd: MacdData[], bbands: BbandsData[], roc: RocData[] }>(),
});
export type AnalyzeStockMomentumInput = z.infer<typeof AnalyzeStockMomentumInputSchema>;


export async function analyzeStockMomentum(
  ticker: string
): Promise<AnalyzeStockMomentumOutput | { error: string }> {
  try {
    // Return early if the asset type is not supported
    if (isCurrencyPair(ticker) || isCryptoPair(ticker)) {
      return {
        totalScore: 0,
        signal: 'N/A',
        interpretation: 'Analysis not available for this asset type.',
        tradeAction: 'Technical indicator analysis is not supported for currency or crypto pairs.'
      };
    }

    const marketDataResult = await fetchMarketDataService(ticker);
    if (marketDataResult.error || !marketDataResult.data) {
        return { error: marketDataResult.error || "Failed to fetch market data." };
    }

    const indicatorsResult = await fetchAllIndicatorsService(ticker);
    if (indicatorsResult.error || !indicatorsResult.rsi || !indicatorsResult.macd || !indicatorsResult.bbands || !indicatorsResult.roc) {
        return { error: indicatorsResult.error || "Failed to fetch technical indicators." };
    }
    
    const input: AnalyzeStockMomentumInput = {
        ticker,
        marketData: marketDataResult.data,
        indicators: {
            rsi: indicatorsResult.rsi,
            macd: indicatorsResult.macd,
            bbands: indicatorsResult.bbands,
            roc: indicatorsResult.roc,
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
  prompt: `You are an expert financial analyst AI. Your task is to analyze the provided stock data for "{{ticker}}" using a specific scoring model and return a structured JSON output.

**Data Provided:**
- **Market Data (last 30 days):** A list of daily OHLCV data. The latest data is at index 0.
- **22-Day ROC Data (last 30 days):** The latest ROC value is \`{{indicators.roc.0.ROC}}\`.
- **Bollinger Bands (20,2) Data (last 30 days):** The latest BBands are Upper: \`{{indicators.bbands.0.Real Upper Band}}\`, Middle: \`{{indicators.bbands.0.Real Middle Band}}\`, Lower: \`{{indicators.bbands.0.Real Lower Band}}\`.
- **RSI (14-day) Data (last 30 days):** The latest RSI value is \`{{indicators.rsi.0.RSI}}\`.
- **Price Data for Divergence Check:** To check for divergence, compare the price lows/highs from \`marketData[0]\`, \`marketData[5]\`, and \`marketData[10]\` with the RSI values from \`indicators.rsi[0]\`, \`indicators.rsi[5]\`, and \`indicators.rsi[10]\`.

**Scoring Model:**

You must calculate a total score by summing points from the following 4 steps.

**Step 1: Rate of Change (ROC) Momentum (+/- 0.3 points)**
- **Rule:** If the latest 22-Day ROC > 0, add +0.3 points. Otherwise, subtract -0.3 points.

**Step 2: Bollinger Bands (BBands) Analysis (+/- 0.2 points, +/- 0.1 points)**
- **2a. Price vs. Middle Band:** If latest Close Price > Middle Band (20 SMA), add +0.1 points. If latest Close < Middle Band, subtract -0.1 points.
- **2b. Breakout/Squeeze Analysis:**
    - Calculate Bollinger Band Width for the last 20 days: \`(Upper Band - Lower Band) / Middle Band\`.
    - **Is it squeezing?** Check if the latest BB Width is the lowest in the last 20 days.
    - **If YES (Squeezing):** Wait for a breakout. If the latest close has broken *above* the Upper Band, add +0.2 points. If it has broken *below* the Lower Band, subtract -0.2 points. Otherwise, 0 points.
    - **If NO (Not Squeezing):** Check for strong trends. If latest close > Upper Band, add +0.2 points. If latest close < Lower Band, subtract -0.2 points. Otherwise, 0 points.
- **Note:** The points from 2a and 2b are cumulative.

**Step 3: RSI Confirmation & Divergence (+/- 0.1 points, +/- 0.1 bonus points)**
- **3a. RSI Level:** If latest RSI > 50, add +0.1 points. If RSI < 50, subtract -0.1 points.
- **3b. RSI Divergence (Bonus):**
    - **Bullish Divergence:** Check if the price has made a lower low recently (e.g., \`marketData[5].low\` < \`marketData[0].low\`) while the RSI has made a higher low (e.g., \`indicators.rsi[5].RSI\` > \`indicators.rsi[0].RSI\`). If yes, add +0.1 bonus points.
    - **Bearish Divergence:** Check if the price has made a higher high while the RSI has made a lower high. If yes, subtract -0.1 bonus points.
    - If no divergence, 0 bonus points.
- **Note:** The points from 3a and 3b are cumulative.

**Step 4: Volume Confirmation (+/- 0.1 points)**
- Calculate the 20-day average volume from the \`marketData\`.
- If latest volume > 20-day average AND it was an "Up Day" (close > open), add +0.1 points.
- If latest volume > 20-day average AND it was a "Down Day" (close < open), subtract -0.1 points.
- Otherwise, 0 points.

**Final Calculation & Interpretation:**

1.  **Calculate \`totalScore\`:** Sum all the points from steps 1-4. The score must be between -1.0 and 1.0.
2.  **Determine \`signal\`, \`interpretation\`, and \`tradeAction\`** based on the score using this table:
    - **+0.7 to +1.0:** "🚀 STRONG BULLISH", "High conviction long", "Use pullbacks to enter"
    - **+0.4 to +0.6:** "✅ MODERATE BULLISH", "Consider long positions", "Manage risk with stop losses"
    - **+0.1 to +0.3:** "⚠️ MILD BULLISH", "Wait for confirmation", "Look for additional confirmation"
    - **-0.3 to +0.0:** "⚖️ NEUTRAL", "Stay out or wait", "Market is choppy, avoid new trades"
    - **-0.4 to -0.1:** "⚠️ MILD BEARISH", "Consider reducing exposure", "Caution is advised, consider hedging"
    - **-0.7 to -0.5:** "✅ MODERATE BEARISH", "Consider short positions", "Manage risk with stop losses"
    - **-1.0 to -0.8:** "🚨 STRONG BEARISH", "High conviction short", "Use rallies to enter"

Strictly follow this logic and output a valid JSON object matching the output schema.
`,
});


const analyzeStockMomentumFlow = ai.defineFlow(
  {
    name: 'analyzeStockMomentumFlow',
    inputSchema: AnalyzeStockMomentumInputSchema,
    outputSchema: AnalyzeStockMomentumOutputSchema,
  },
  async (input) => {
    // This check is now handled in the wrapper function, but kept as a safeguard.
    if (isCurrencyPair(input.ticker) || isCryptoPair(input.ticker)) {
      const notApplicableAnalysis: AnalyzeStockMomentumOutput = {
        totalScore: 0,
        signal: 'N/A',
        interpretation: 'Analysis not available for this asset type.',
        tradeAction: 'Technical indicator analysis is not supported for currency or crypto pairs.'
      };
      return notApplicableAnalysis;
    }

    const { output } = await momentumAnalysisPrompt(input);
    return output!;
  }
);
