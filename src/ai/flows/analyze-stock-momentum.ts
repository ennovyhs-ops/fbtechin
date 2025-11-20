
'use server';

/**
 * @fileOverview This file defines a function to analyze stock momentum based on a detailed, deterministic scoring model.
 *
 * - analyzeStockMomentum - A function that takes a stock ticker and market data and returns a comprehensive momentum analysis.
 * - AnalyzeStockMomentumOutput - The output type for the analyzeStockMomentum function.
 */

import { z } from 'zod';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateMultiROC, calculateVWMA, calculateMAVol } from '@/lib/technical-analysis';
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
    
    // Check if data is synthesized (close-only)
    const isSynthesizedData = marketData.every(d => d.open === d.close && d.high === d.close && d.low === d.close);
    
    // Define weights
    let weights = {
        multiRoc: 0.25,
        macd: 0.20,
        vwma: 0.15,
        rsi: 0.15,
        volume: 0.10,
        bbands: 0.05,
        fiftyTwoWeek: 0.10,
    };

    // If data is synthesized, Volume-Price Confirmation is not possible. Redistribute its weight.
    if (isSynthesizedData) {
        const redistributedWeight = weights.volume / 4;
        weights = {
            ...weights,
            multiRoc: weights.multiRoc + redistributedWeight,
            volume: 0, // Set volume weight to 0
            vwma: weights.vwma + redistributedWeight,
            rsi: weights.rsi + redistributedWeight,
            macd: weights.macd + redistributedWeight,
        };
    }

    const data = [...marketData].reverse(); // Reverse once to get chronological for all calculations.
    const closePrices = data.map(d => parseFloat(d.close));
    const volumes = data.map(d => parseFloat(d.volume));
    
    const rsi = calculateRSI(closePrices, 14);
    const macd = calculateMACD(closePrices, 12, 26, 9);
    const bbands = calculateBollingerBands(closePrices, 20, 2);
    const multiRoc = calculateMultiROC(closePrices, [5, 22, 50]);
    const vwma = calculateVWMA(closePrices, volumes, 20);
    const maVol = calculateMAVol(volumes, 50);
    
    const latestRoc5 = multiRoc.roc5.at(-1);
    const latestRoc22 = multiRoc.roc22.at(-1);
    const latestRoc50 = multiRoc.roc50.at(-1);
    const latestRsi = rsi.at(-1);
    const latestMacd = macd.at(-1);
    const prevMacd = macd.at(-2);
    const latestBbands = bbands.at(-1);
    const latestVwma = vwma.at(-1);
    
    if (latestRoc5 === undefined || latestRoc22 === undefined || latestRoc50 === undefined || latestRsi === undefined || !latestMacd || !prevMacd || !latestBbands || latestVwma === undefined) {
        return { error: "Could not calculate one or more required technical indicators. The asset may not have enough historical data." };
    }

    let totalScore = 0;

    // Step 1: Multi-Timeframe Alignment (Weight: 25%)
    const isRoc5Bullish = latestRoc5 > 0;
    const isRoc22Bullish = latestRoc22 > 0;
    const isRoc50Bullish = latestRoc50 > 0;

    if (isRoc5Bullish && isRoc22Bullish && isRoc50Bullish) {
        totalScore += weights.multiRoc; // Strong bullish alignment
    } else if (!isRoc5Bullish && !isRoc22Bullish && !isRoc50Bullish) {
        totalScore -= weights.multiRoc; // Strong bearish alignment
    } else {
        // Mixed signals, partial score based on longer-term trends
        let rocScore = 0;
        rocScore += isRoc50Bullish ? 0.5 : -0.5;
        rocScore += isRoc22Bullish ? 0.3 : -0.3;
        rocScore += isRoc5Bullish ? 0.2 : -0.2;
        totalScore += weights.multiRoc * (rocScore);
    }

    // Step 2: Volume-Price Confirmation (Weight: 10%) - Skipped if data is synthesized
    if (!isSynthesizedData && data.length >= 50 && maVol.length === data.length) {
        const recentData = data.slice(-10); // Look at last 10 days
        const avgVolume = maVol.at(-1); // Get latest 50-day average volume

        if (avgVolume) {
            let highVolUpDays = 0;
            let highVolDownDays = 0;

            for (const day of recentData) {
                const isUpDay = parseFloat(day.close) > parseFloat(day.open);
                const isHighVolume = parseFloat(day.volume) > avgVolume * 1.2;

                if (isHighVolume) {
                    if (isUpDay) highVolUpDays++;
                    else highVolDownDays++;
                }
            }
            
            if (highVolUpDays > highVolDownDays + 1) { // Clear Accumulation
                totalScore += weights.volume;
            } else if (highVolDownDays > highVolUpDays + 1) { // Clear Distribution
                totalScore -= weights.volume;
            }
        }
    }
    
    const latestClose = closePrices.at(-1)!;

    // Step 3: VWMA Trend Confirmation (Weight: 15%)
    if (!isNaN(latestVwma)) {
        if (latestClose > latestVwma) {
            totalScore += weights.vwma;
        } else if (latestClose < latestVwma) {
            totalScore -= weights.vwma;
        }
    }


    // Step 4: Bollinger Bands Position & Volatility Context (Weight: 5%)
    const { upper: upperBand, lower: lowerBand, middle: middleBand } = latestBbands;
    if (latestClose > middleBand) totalScore += (weights.bbands * 0.5);
    else if (latestClose < middleBand) totalScore -= (weights.bbands * 0.5);
    
    // Breakout signal
    if (latestClose > upperBand) totalScore += (weights.bbands * 0.3); 
    else if (latestClose < lowerBand) totalScore -= (weights.bbands * 0.3);
    
    // Volatility (Squeeze)
    if (bbands.length >= 20) {
        const recentBbands = bbands.slice(-20);
        const bandWidths = recentBbands.map(b => (b && b.upper && b.lower && b.middle > 0) ? (b.upper - b.lower) / b.middle : NaN).filter(bw => !isNaN(bw));
        if (bandWidths.length > 0) {
            const currentBandwidth = bandWidths[bandWidths.length - 1];
            const minBandwidth = Math.min(...bandWidths);
            if (currentBandwidth < minBandwidth * 1.15) { // Squeeze is active
                if (isRoc22Bullish) totalScore += (weights.bbands * 0.2);
                else totalScore -= (weights.bbands * 0.2);
            }
        }
    }

    // Step 5: RSI Strength & Divergence (Weight: 15%)
    if (latestRsi > 60) totalScore += (weights.rsi * 0.66);
    else if (latestRsi > 50) totalScore += (weights.rsi * 0.33);
    else if (latestRsi < 40) totalScore -= (weights.rsi * 0.66);
    else if (latestRsi < 50) totalScore -= (weights.rsi * 0.33);

    // Divergence (last 10 days)
    if (data.length >= 11 && rsi.length >= data.length) {
        const priceSlice = data.slice(-10);
        const rsiSlice = rsi.slice(-10);
        
        const priceLow5 = isSynthesizedData ? priceSlice[5].close : priceSlice[5].low;
        const priceLow0 = isSynthesizedData ? priceSlice[0].close : priceSlice[0].low;
        const rsiLow5 = rsiSlice[5];
        const rsiLow0 = rsiSlice[0];

        if (priceLow0 < parseFloat(priceLow5) && rsiLow0 > rsiLow5) {
            totalScore += (weights.rsi * 0.34); // Bullish divergence
        }
        
        const priceHigh5 = isSynthesizedData ? priceSlice[5].close : priceSlice[5].high;
        const priceHigh0 = isSynthesizedData ? priceSlice[0].close : priceSlice[0].high;
        const rsiHigh5 = rsiSlice[5];
        const rsiHigh0 = rsiSlice[0];

        if (priceHigh0 > parseFloat(priceHigh5) && rsiHigh0 < rsiHigh5) {
            totalScore -= (weights.rsi * 0.34); // Bearish divergence
        }
    }

    // Step 6: MACD Trend Acceleration (Weight: 20%)
    if (latestMacd.MACD && latestMacd.signal && prevMacd.MACD && prevMacd.signal) {
      const isMacdBullish = latestMacd.MACD > latestMacd.signal;
      totalScore += isMacdBullish ? (weights.macd * 0.5) : -(weights.macd * 0.5);

      const isMacdCrossoverBullish = prevMacd.MACD <= prevMacd.signal && latestMacd.MACD > latestMacd.signal;
      if (isMacdCrossoverBullish) {
          totalScore += (weights.macd * 0.5);
      }
      const isMacdCrossoverBearish = prevMacd.MACD >= prevMacd.signal && latestMacd.MACD < latestMacd.signal;
      if (isMacdCrossoverBearish) {
          totalScore -= (weights.macd * 0.5);
      }
    }
    
    // Step 7: 52-Week Range Context (Weight: 10%)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearData = marketData.filter(d => new Date(d.date) >= oneYearAgo);
    
    if (oneYearData.length > 0) {
        let high52 = -Infinity;
        let low52 = Infinity;

        oneYearData.forEach(d => {
            const h = isSynthesizedData ? parseFloat(d.close) : parseFloat(d.high);
            const l = isSynthesizedData ? parseFloat(d.close) : parseFloat(d.low);
            if (!isNaN(h) && h > high52) high52 = h;
            if (!isNaN(l) && l < low52) low52 = l;
        });

        if (high52 !== -Infinity && low52 !== Infinity && high52 > low52) {
            const currentPosition = (latestClose - low52) / (high52 - low52); // Position as % of range (0-1)
            
            if (currentPosition > 0.95) { // Near 52-week high
                totalScore += weights.fiftyTwoWeek;
            } else if (currentPosition > 0.75) {
                totalScore += weights.fiftyTwoWeek * 0.5;
            } else if (currentPosition < 0.05) { // Near 52-week low
                totalScore -= weights.fiftyTwoWeek;
            } else if (currentPosition < 0.25) {
                totalScore -= weights.fiftyTwoWeek * 0.5;
            }
        }
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
    

    

    


