'use server';

/**
 * @fileOverview This file defines a Genkit flow to analyze stock momentum based on a detailed scoring model.
 *
 * - analyzeStockMomentum - A function that takes a stock ticker and returns a comprehensive momentum analysis.
 * - AnalyzeStockMomentumOutput - The output type for the analyzeStockMomentum function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchMarketDataService, fetchAllIndicatorsService } from '@/lib/server-services';
import type { MarketData, RsiData, MacdData, BbandsData, RocData, MomentumAnalysisInput } from '@/lib/types';
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

// This schema contains pre-calculated metrics for the AI to analyze.
const MomentumAnalysisInputSchema = z.object({
  ticker: z.string(),
  isRocPositive: z.boolean().describe("True if the latest 22-Day Rate of Change is > 0."),
  priceAboveMiddleBand: z.boolean().describe("True if the latest Close Price is > the 20-Day BBands Middle Band."),
  isBBSqueezing: z.boolean().describe("True if the Bollinger Band Width is the narrowest it's been in the last 20 days."),
  breakoutSignal: z.enum(["above_upper", "below_lower", "none"]).describe("Indicates if a price breakout has occurred ('above_upper' or 'below_lower')."),
  isRsiBullish: z.boolean().describe("True if the latest 14-Day RSI is > 50."),
  divergence: z.enum(["bullish", "bearish", "none"]).describe("Indicates if bullish or bearish RSI divergence is detected."),
  isVolumeUp: z.boolean().describe("True if the latest volume is greater than the 20-day average volume."),
  isUpDay: z.boolean().describe("True if the latest close price is > the latest open price."),
  isMacdBullish: z.boolean().describe("True if the MACD line is above the Signal line."),
  isMacdCrossoverBullish: z.boolean().describe("True if the MACD line has just crossed above the Signal line."),
});


export async function analyzeStockMomentum(
  ticker: string
): Promise<AnalyzeStockMomentumOutput | { error: string }> {
  try {
    if (isCurrencyPair(ticker) || isCryptoPair(ticker)) {
      return {
        totalScore: 0,
        signal: 'N/A',
        interpretation: 'AI momentum analysis is not applicable to currency or crypto pairs.',
        tradeAction: 'Technical indicator analysis is not supported for currency or crypto pairs.'
      };
    }

    const marketDataResult = await fetchMarketDataService(ticker);
    if (marketDataResult.error || !marketDataResult.data || marketDataResult.data.length < 22) {
        return { error: marketDataResult.error || "Insufficient market data for analysis." };
    }

    const indicatorsResult = await fetchAllIndicatorsService(ticker);
    if (indicatorsResult.error) {
        return { error: indicatorsResult.error };
    }
    
    if (!indicatorsResult.rsi || indicatorsResult.rsi.length === 0 || 
        !indicatorsResult.bbands || indicatorsResult.bbands.length === 0 || 
        !indicatorsResult.roc || indicatorsResult.roc.length === 0 ||
        !indicatorsResult.macd || indicatorsResult.macd.length < 2) {
      return { error: "One or more required technical indicators could not be fetched. Analysis cannot be completed." };
    }
    
    // Pre-calculation logic
    const marketData = marketDataResult.data;
    const { rsi, macd, bbands, roc } = indicatorsResult;

    // Step 1: ROC
    const isRocPositive = parseFloat(roc[0].ROC) > 0;

    // Step 2: Bollinger Bands
    const latestClose = parseFloat(marketData[0].close);
    const middleBand = parseFloat(bbands[0]['Real Middle Band']);
    const priceAboveMiddleBand = latestClose > middleBand;
    
    const bbWidths = bbands.slice(0, 20).map(b => (parseFloat(b['Real Upper Band']) - parseFloat(b['Real Lower Band'])) / parseFloat(b['Real Middle Band']));
    const latestWidth = bbWidths[0];
    const isBBSqueezing = Math.min(...bbWidths) === latestWidth;

    let breakoutSignal: "above_upper" | "below_lower" | "none" = "none";
    if (latestClose > parseFloat(bbands[0]['Real Upper Band'])) {
        breakoutSignal = "above_upper";
    } else if (latestClose < parseFloat(bbands[0]['Real Lower Band'])) {
        breakoutSignal = "below_lower";
    }

    // Step 3: RSI
    const latestRsi = parseFloat(rsi[0].RSI);
    const isRsiBullish = latestRsi > 50;

    let divergence: "bullish" | "bearish" | "none" = "none";
    if (marketData.length >= 11 && rsi.length >= 11) {
        const priceLow5 = parseFloat(marketData[5].low);
        const priceLow0 = parseFloat(marketData[0].low);
        const rsiLow5 = parseFloat(rsi[5].RSI);
        const rsiLow0 = parseFloat(rsi[0].RSI);
        if (priceLow0 < priceLow5 && rsiLow0 > rsiLow5) {
            divergence = "bullish";
        }
        
        const priceHigh5 = parseFloat(marketData[5].high);
        const priceHigh0 = parseFloat(marketData[0].high);
        const rsiHigh5 = parseFloat(rsi[5].RSI);
        const rsiHigh0 = parseFloat(rsi[0].RSI);
        if (priceHigh0 > priceHigh5 && rsiHigh0 < rsiHigh5) {
            divergence = "bearish";
        }
    }

    // Step 4: Volume
    const volumes = marketData.slice(0, 20).map(d => parseFloat(d.volume));
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const latestVolume = parseFloat(marketData[0].volume);
    const isVolumeUp = latestVolume > avgVolume;
    const isUpDay = parseFloat(marketData[0].close) > parseFloat(marketData[0].open);

    // Step 5: MACD
    const latestMacdValue = parseFloat(macd[0]['MACD']);
    const latestSignalValue = parseFloat(macd[0]['MACD_Signal']);
    const isMacdBullish = latestMacdValue > latestSignalValue;
    
    const previousMacdValue = parseFloat(macd[1]['MACD']);
    const previousSignalValue = parseFloat(macd[1]['MACD_Signal']);
    const isMacdCrossoverBullish = previousMacdValue <= previousSignalValue && latestMacdValue > latestSignalValue;


    const analysisInput: MomentumAnalysisInput = {
        ticker,
        isRocPositive,
        priceAboveMiddleBand,
        isBBSqueezing,
        breakoutSignal,
        isRsiBullish,
        divergence,
        isVolumeUp,
        isUpDay,
        isMacdBullish,
        isMacdCrossoverBullish
    };

    const result = await analyzeStockMomentumFlow(analysisInput);
    if ('error' in result) {
        return { error: (result as any).message || 'Flow execution failed.' };
    }
    return result;

  } catch (e: any) {
    console.error("Error in analyzeStockMomentum:", e);
    return { error: e.message || 'An unexpected error occurred during analysis.' };
  }
}

const momentumAnalysisPrompt = ai.definePrompt({
  name: 'momentumAnalysisPrompt',
  input: { schema: MomentumAnalysisInputSchema },
  output: { schema: AnalyzeStockMomentumOutputSchema },
  prompt: `You are an expert financial analyst AI. Your task is to analyze the pre-calculated metrics for "{{ticker}}" and determine a momentum score.

**Analysis Rules:**

You must calculate a \`totalScore\` by summing points from the following 5 steps.

**Step 1: Rate of Change (ROC) Momentum (+/- 0.2 points)**
- **Rule:** If \`isRocPositive\` is true, add +0.2 points. Otherwise, subtract -0.2 points.

**Step 2: Bollinger Bands (BBands) Analysis (+/- 0.2 points, +/- 0.1 points)**
- **2a. Price vs. Middle Band:** If \`priceAboveMiddleBand\` is true, add +0.1 points. Otherwise, subtract -0.1 points.
- **2b. Breakout/Squeeze Analysis:**
    - If \`breakoutSignal\` is "above_upper", add +0.1 points.
    - If \`breakoutSignal\` is "below_lower", subtract -0.1 points.
    - Otherwise, 0 points.

**Step 3: RSI Confirmation & Divergence (+/- 0.1 points, +/- 0.1 bonus points)**
- **3a. RSI Level:** If \`isRsiBullish\` is true, add +0.1 points. If false, subtract -0.1 points.
- **3b. RSI Divergence (Bonus):**
    - If \`divergence\` is "bullish", add +0.1 bonus points.
    - If \`divergence\` is "bearish", subtract -0.1 bonus points.
    - Otherwise, 0 bonus points.

**Step 4: Volume Confirmation (+/- 0.1 points)**
- If \`isVolumeUp\` is true AND \`isUpDay\` is true, add +0.1 points.
- If \`isVolumeUp\` is true AND \`isUpDay\` is false, subtract -0.1 points.
- Otherwise, 0 points.

**Step 5: MACD Analysis (+/- 0.2 points, +/- 0.1 bonus points)**
- **5a. MACD State:** If \`isMacdBullish\` is true (MACD > Signal), add +0.2 points. Otherwise, subtract -0.2 points.
- **5b. MACD Crossover (Bonus):** If \`isMacdCrossoverBullish\` is true, add a bonus of +0.1 points.

**Final Calculation & Interpretation:**

1.  **Calculate \`totalScore\`:** Sum all the points from steps 1-5. The score must be between -1.0 and 1.0.
2.  **Determine \`signal\`, \`interpretation\`, and \`tradeAction\`** based on the score using this table:
    - **+0.8 to +1.0:** "🚀 STRONG BULLISH", "High conviction long", "Use pullbacks to enter"
    - **+0.4 to +0.7:** "✅ MODERATE BULLISH", "Consider long positions", "Manage risk with stop losses"
    - **+0.1 to +0.3:** "⚠️ MILD BULLISH", "Wait for confirmation", "Look for additional confirmation"
    - **-0.3 to +0.0:** "⚖️ NEUTRAL", "Stay out or wait", "Market is choppy, avoid new trades"
    - **-0.6 to -0.4:** "⚠️ MILD BEARISH", "Consider reducing exposure", "Caution is advised, consider hedging"
    - **-0.8 to -0.7:** "✅ MODERATE BEARISH", "Consider short positions", "Manage risk with stop losses"
    - **-1.0 to -0.9:** "🚨 STRONG BEARISH", "High conviction short", "Use rallies to enter"

Strictly follow this logic and output a valid JSON object matching the output schema.
`,
});


const analyzeStockMomentumFlow = ai.defineFlow(
  {
    name: 'analyzeStockMomentumFlow',
    inputSchema: MomentumAnalysisInputSchema,
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
