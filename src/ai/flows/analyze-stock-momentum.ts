
'use server';

/**
 * @fileOverview This file defines a function to analyze stock momentum based on a detailed, deterministic scoring model.
 *
 * - analyzeStockMomentum - A function that takes a stock ticker and market data and returns a comprehensive momentum analysis.
 * - AnalyzeStockMomentumOutput - The output type for the analyzeStockMomentum function.
 */

import { z } from 'zod';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateMultiROC } from '@/lib/technical-analysis';
import type { MarketData } from '@/lib/types';
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


const getSignalFromScore = (score: number): Pick<AnalyzeStockMomentumOutput, 'signal' | 'interpretation' | 'tradeAction'> => {
  if (score >= 0.7) return { signal: "🚀 STRONG BULLISH", interpretation: "High conviction long", tradeAction: "Use pullbacks to enter" };
  if (score >= 0.4) return { signal: "✅ MODERATE BULLISH", interpretation: "Consider long positions", tradeAction: "Manage risk with stop losses" };
  if (score >= 0.1) return { signal: "⚠️ MILD BULLISH", interpretation: "Wait for confirmation", tradeAction: "Look for additional confirmation" };
  if (score > -0.1) return { signal: "⚖️ NEUTRAL", interpretation: "Stay out or wait", tradeAction: "Market is choppy, avoid new trades" };
  if (score > -0.4) return { signal: "⚠️ MILD BEARISH", interpretation: "Consider reducing exposure", tradeAction: "Caution is advised, consider hedging" };
  if (score > -0.7) return { signal: "✅ MODERATE BEARISH", interpretation: "Consider short positions", tradeAction: "Manage risk with stop losses" };
  return { signal: "🚨 STRONG BEARISH", interpretation: "High conviction short", tradeAction: "Use rallies to enter" };
};


export async function analyzeStockMomentum(
  ticker: string,
  marketData: MarketData[],
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
    
    if (!marketData || marketData.length < 50) { // Need enough data for all indicators
        return { error: "Insufficient market data for analysis. At least 50 days of data are required." };
    }

    // Pre-calculation logic
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));
    
    const rsi = calculateRSI(closePrices, 14);
    const macd = calculateMACD(closePrices, 12, 26, 9);
    const bbands = calculateBollingerBands(closePrices, 20, 2);
    const multiRoc = calculateMultiROC(closePrices, [5, 22, 50]);
    
    const data = marketData; // Keep variable name for clarity, it's descending

    const findLatestValid = <T, K>(
      arr: T[],
      isValid: (item: T) => boolean,
      extract: (item: T) => K
    ): K | undefined => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (isValid(arr[i])) {
          return extract(arr[i]);
        }
      }
      return undefined;
    };
    
    const findPreviousValid = <T, K>(
      arr: T[],
      isValid: (item: T) => boolean,
      extract: (item: T) => K
    ): K | undefined => {
      let latestFound = false;
      for (let i = arr.length - 1; i >= 0; i--) {
         if (isValid(arr[i])) {
           if (latestFound) {
             return extract(arr[i]);
           } else {
             latestFound = true;
           }
         }
      }
      return undefined;
    };

    const latestRoc5 = findLatestValid(multiRoc.roc5, (v) => !isNaN(v), v => v);
    const latestRoc22 = findLatestValid(multiRoc.roc22, (v) => !isNaN(v), v => v);
    const latestRoc50 = findLatestValid(multiRoc.roc50, (v) => !isNaN(v), v => v);
    const latestRsi = findLatestValid(rsi, (v) => !isNaN(v), v => v);
    const latestMacd = findLatestValid(macd, (v) => v && !isNaN(v.MACD!) && !isNaN(v.signal!), v => v);
    const prevMacd = findPreviousValid(macd, (v) => v && !isNaN(v.MACD!) && !isNaN(v.signal!), v => v);
    const latestBbands = findLatestValid(bbands, (v) => v && !isNaN(v.middle) && !isNaN(v.upper) && !isNaN(v.lower), v => v);

    if (latestRoc5 === undefined || latestRoc22 === undefined || latestRoc50 === undefined || latestRsi === undefined || !latestMacd || !prevMacd || !latestBbands) {
        return { error: "Could not calculate one or more required technical indicators. The asset may not have enough historical data." };
    }

    let totalScore = 0;

    // Step 1: Multi-Timeframe ROC Alignment (New)
    const isRoc5Bullish = latestRoc5 > 0;
    const isRoc22Bullish = latestRoc22 > 0;
    const isRoc50Bullish = latestRoc50 > 0;

    if (isRoc5Bullish && isRoc22Bullish && isRoc50Bullish) {
        totalScore += 0.3; // Strong alignment
    } else if (!isRoc5Bullish && !isRoc22Bullish && !isRoc50Bullish) {
        totalScore -= 0.3; // Strong bearish alignment
    } else {
        // Mixed signals, award points based on longer-term trend
        totalScore += isRoc50Bullish ? 0.1 : -0.1;
        totalScore += isRoc22Bullish ? 0.05 : -0.05;
    }


    // Step 2: Bollinger Bands Position
    const latestClose = parseFloat(data[0].close);
    const middleBand = latestBbands.middle;
    const priceAboveMiddleBand = latestClose > middleBand;
    totalScore += priceAboveMiddleBand ? 0.1 : -0.1;
    
    if (latestClose > latestBbands.upper) {
        totalScore += 0.1; // Bonus for breakout
    } else if (latestClose < latestBbands.lower) {
        totalScore -= 0.1; // Penalty for breakdown
    }

    // Step 3: RSI Strength & Divergence
    if (latestRsi > 60) {
        totalScore += 0.15; // Strong bullish
    } else if (latestRsi > 50) {
        totalScore += 0.05; // Mild bullish
    } else if (latestRsi < 40) {
        totalScore -= 0.15; // Strong bearish
    } else if (latestRsi < 50) {
        totalScore -= 0.05; // Mild bearish
    }

    // RSI Divergence
    if (data.length >= 11 && rsi.length >= data.length) {
        const rsiReversed = [...rsi].reverse();
        const priceLow5 = parseFloat(data[5].low);
        const priceLow0 = parseFloat(data[0].low);
        const rsiLow5 = rsiReversed[5];
        const rsiLow0 = rsiReversed[0];
        if (priceLow0 < priceLow5 && rsiLow0 > rsiLow5) {
            totalScore += 0.1; // Bullish divergence
        }
        
        const priceHigh5 = parseFloat(data[5].high);
        const priceHigh0 = parseFloat(data[0].high);
        const rsiHigh5 = rsiReversed[5];
        const rsiHigh0 = rsiReversed[0];
        if (priceHigh0 > priceHigh5 && rsiHigh0 < rsiHigh5) {
            totalScore -= 0.1; // Bearish divergence
        }
    }

    // Step 4: Volume-Weighted Momentum
    if (data.length >= 20) {
        const recentData = data.slice(0, 10);
        const volumes = data.slice(0, 20).map(d => parseFloat(d.volume));
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;

        let highVolUpDays = 0;
        let highVolDownDays = 0;

        for (const day of recentData) {
            const isUpDay = parseFloat(day.close) > parseFloat(day.open);
            const isHighVolume = parseFloat(day.volume) > avgVolume * 1.1;

            if (isHighVolume) {
                if (isUpDay) highVolUpDays++;
                else highVolDownDays++;
            }
        }
        
        if (highVolUpDays > highVolDownDays + 1) { // Clear Accumulation
            totalScore += 0.1;
        } else if (highVolDownDays > highVolUpDays + 1) { // Clear Distribution
            totalScore -= 0.1;
        }
    }

    // Step 5: Volatility Context (Bollinger Band Squeeze)
    if (bbands.length >= 20) {
        const recentBbands = [...bbands].reverse().slice(-20);
        const bandWidths = recentBbands.map(b => 
            (b && !isNaN(b.upper) && !isNaN(b.lower) && b.middle > 0) 
            ? (b.upper - b.lower) / b.middle 
            : NaN
        ).filter(bw => !isNaN(bw));
        
        if (bandWidths.length > 0) {
            const currentBandwidth = bandWidths[bandWidths.length - 1];
            const minBandwidth = Math.min(...bandWidths);

            const isSqueeze = currentBandwidth < minBandwidth * 1.1;
            if (isSqueeze) {
                if (isRoc22Bullish && latestRsi > 50) { // Squeeze with bullish bias
                    totalScore += 0.05;
                } else if (!isRoc22Bullish && latestRsi < 50) { // Squeeze with bearish bias
                    totalScore -= 0.05;
                }
            }
        }
    }

    // Step 6: MACD Momentum
    const isMacdBullish = latestMacd.MACD! > latestMacd.signal!;
    totalScore += isMacdBullish ? 0.1 : -0.1;

    // MACD Crossover
    const isMacdCrossoverBullish = prevMacd.MACD! <= prevMacd.signal! && latestMacd.MACD! > latestMacd.signal!;
    if (isMacdCrossoverBullish) {
        totalScore += 0.1;
    }
    const isMacdCrossoverBearish = prevMacd.MACD! >= prevMacd.signal! && latestMacd.MACD! < latestMacd.signal!;
    if (isMacdCrossoverBearish) {
        totalScore -= 0.1;
    }

    // Normalize score to be within -1 and 1
    totalScore = Math.max(-1, Math.min(1, totalScore));

    const { signal, interpretation, tradeAction } = getSignalFromScore(totalScore);

    return {
        totalScore,
        signal,
        interpretation,
        tradeAction,
    };

  } catch (e: any) {
    console.error("Error in analyzeStockMomentum:", e);
    return { error: e.message || 'An unexpected error occurred during analysis.' };
  }
}
