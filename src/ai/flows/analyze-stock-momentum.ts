
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
  if (score >= 0.7) return { signal: "🚀 STRONG BULLISH", interpretation: "Multiple indicators are aligned, signaling a strong upward trend.", tradeAction: "Use pullbacks to enter" };
  if (score >= 0.4) return { signal: "✅ MODERATE BULLISH", interpretation: "Indicators are broadly positive, suggesting a potential uptrend.", tradeAction: "Manage risk with stop losses" };
  if (score >= 0.1) return { signal: "⚠️ MILD BULLISH", interpretation: "Some bullish signs are present, but confirmation is needed.", tradeAction: "Look for additional confirmation" };
  if (score > -0.1) return { signal: "⚖️ NEUTRAL", interpretation: "Indicators are mixed, with no clear directional advantage.", tradeAction: "Market is choppy, avoid new trades" };
  if (score > -0.4) return { signal: "⚠️ MILD BEARISH", interpretation: "Some bearish signs are present, suggesting caution is warranted.", tradeAction: "Caution is advised, consider hedging" };
  if (score > -0.7) return { signal: "✅ MODERATE BEARISH", interpretation: "Indicators are broadly negative, suggesting a potential downtrend.", tradeAction: "Manage risk with stop losses" };
  return { signal: "🚨 STRONG BEARISH", interpretation: "Multiple indicators are aligned, signaling a strong downward trend.", tradeAction: "Use rallies to enter" };
};


export async function analyzeStockMomentum(
  ticker: string,
  marketData: MarketData[],
): Promise<AnalyzeStockMomentumOutput | { error: string }> {
  try {
    if (!marketData || marketData.length < 50) { // Need enough data for all indicators
        return { error: "Insufficient market data for analysis. At least 50 days of data are required." };
    }

    const isForexOrCrypto = isCurrencyPair(ticker) || isCryptoPair(ticker);
    
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

    // If data is synthesized or it's a currency pair, Volume-Price Confirmation is not possible. Redistribute its weight.
    if (isSynthesizedData || isCurrencyPair(ticker)) {
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
    
    // For forex/crypto, we only want to calculate the 52-week range, not the full momentum score.
    if (isForexOrCrypto) {
        return {
            totalScore: 0,
            signal: 'N/A',
            interpretation: 'AI momentum analysis is not applicable to currency or crypto pairs.',
            tradeAction: 'Technical indicator analysis is not supported for currency or crypto pairs.'
        };
    }

    const dataChronological = [...marketData].reverse(); // Reverse once to get chronological for all calculations.
    const closePrices = dataChronological.map(d => parseFloat(d.close));
    const volumes = dataChronological.map(d => parseFloat(d.volume));
    
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
    if (!isSynthesizedData && maVol.length > 0 && weights.volume > 0) {
        const latestVolume = volumes.at(-1);
        const latestAvgVolume = maVol.at(-1);

        if (latestVolume !== undefined && latestAvgVolume !== undefined && !isNaN(latestAvgVolume)) {
            const isHighVolume = latestVolume > latestAvgVolume * 1.5;
            if (isHighVolume) {
                const latestDay = dataChronological.at(-1);
                if (latestDay) {
                    const isUpDay = parseFloat(latestDay.close) > parseFloat(latestDay.open);
                    if (isUpDay) {
                        totalScore += weights.volume; // Accumulation
                    } else {
                        totalScore -= weights.volume; // Distribution
                    }
                }
            }
        }
    }
    
    const latestClose = closePrices.at(-1)!;

    // Step 3: VWMA Trend Confirmation (Weight: 15%)
    if (!isNaN(latestVwma) && weights.vwma > 0) {
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
    const rsiScoreFactor = 0.6; // 60% of weight is for current RSI level
    const divergenceScoreFactor = 1 - rsiScoreFactor; // 40% of weight for divergence

    if (latestRsi > 60) totalScore += (weights.rsi * rsiScoreFactor);
    else if (latestRsi > 50) totalScore += (weights.rsi * rsiScoreFactor * 0.5);
    else if (latestRsi < 40) totalScore -= (weights.rsi * rsiScoreFactor);
    else if (latestRsi < 50) totalScore -= (weights.rsi * rsiScoreFactor * 0.5);
    
    // --- CLASSIC DIVERGENCE DETECTION (last 20 days) ---
    const divergenceLookback = 20;
    if (dataChronological.length > divergenceLookback && rsi.length > divergenceLookback) {
        const priceSlice = dataChronological.slice(-divergenceLookback);
        const rsiSlice = rsi.slice(-divergenceLookback);
        
        const currentPriceLow = isSynthesizedData ? latestClose : parseFloat(dataChronological.at(-1)!.low);
        const currentPriceHigh = isSynthesizedData ? latestClose : parseFloat(dataChronological.at(-1)!.high);
        const currentRsi = rsi.at(-1)!;

        // Find the lowest price and highest price (and their RSIs) in the lookback period *excluding the last bar*
        let lookbackLow = Infinity, lookbackLowRsi = Infinity;
        let lookbackHigh = -Infinity, lookbackHighRsi = -Infinity;
        
        for (let i = 0; i < priceSlice.length - 1; i++) {
            const low = isSynthesizedData ? parseFloat(priceSlice[i].close) : parseFloat(priceSlice[i].low);
            if (low < lookbackLow) {
                lookbackLow = low;
                lookbackLowRsi = rsiSlice[i];
            }
            
            const high = isSynthesizedData ? parseFloat(priceSlice[i].close) : parseFloat(priceSlice[i].high);
            if (high > lookbackHigh) {
                lookbackHigh = high;
                lookbackHighRsi = rsiSlice[i];
            }
        }

        // Classic Bullish Divergence: Price makes a lower low, but RSI makes a higher low.
        if (currentPriceLow < lookbackLow && currentRsi > lookbackLowRsi) {
            totalScore += (weights.rsi * divergenceScoreFactor);
        }
        
        // Classic Bearish Divergence: Price makes a higher high, but RSI makes a lower high.
        if (currentPriceHigh > lookbackHigh && currentRsi < lookbackHighRsi) {
            totalScore -= (weights.rsi * divergenceScore-score);
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
    const oneYearDataPoints = 252;
    if (marketData.length >= oneYearDataPoints) {
        const oneYearData = marketData.slice(0, oneYearDataPoints);
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
    } else {
      // If less than a year of data, this factor cannot be calculated. Redistribute weight.
      const redistributedWeight = weights.fiftyTwoWeek / 4;
      weights.multiRoc += redistributedWeight;
      weights.rsi += redistributedWeight;
      weights.macd += redistributedWeight;
      weights.vwma += redistributedWeight;
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

    

    