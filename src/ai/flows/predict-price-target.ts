'use server';

/**
 * @fileOverview This file defines a function to predict a short-term price target for a stock.
 *
 * - predictPriceTarget - A function that takes market data and a momentum score to project a price target.
 * - PredictPriceTargetOutput - The output type for the predictPriceTarget function.
 */

import type { MarketData } from '@/lib/types';
import type { AnalyzeStockMomentumOutput } from './analyze-stock-momentum';
import { z } from 'zod';


const PriceTargetObjectSchema = z.object({
  priceTarget: z.number().describe("The calculated price target."),
  timeframe: z.string().describe("The estimated timeframe for this prediction."),
  interpretation: z.string().describe("A brief explanation of what the price target means."),
});

const PredictPriceTargetOutputSchema = z.object({
    shortTerm: PriceTargetObjectSchema,
    longTerm: PriceTargetObjectSchema
});
export type PredictPriceTargetOutput = z.infer<typeof PredictPriceTargetOutputSchema>;

// Helper to calculate Standard Deviation
const calculateStdDev = (data: number[]): number => {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((a, b) => a + b) / n;
    const variance = data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n;
    return Math.sqrt(variance);
};

const getVariableTimeframe = (trendStrength: number): { timeframe: string, multiplier: number } => {
    if (trendStrength >= 0.7) { // Strong signal
        return { timeframe: "in the next 1-3 weeks", multiplier: 2.5 };
    }
    if (trendStrength >= 0.4) { // Moderate signal
        return { timeframe: "in the next 3-5 weeks", multiplier: 3.0 };
    }
    if (trendStrength >= 0.1) { // Mild signal
        return { timeframe: "in the next 4-8 weeks", multiplier: 3.5 };
    }
    // Neutral
    return { timeframe: "is uncertain due to neutral momentum", multiplier: 1.0 };
}

export async function predictPriceTarget(
  marketData: MarketData[],
  analysis: AnalyzeStockMomentumOutput,
): Promise<PredictPriceTargetOutput | { error: string }> {
  try {
    const requiredDataPoints = 90; // For long-term volatility
    if (!marketData || marketData.length < requiredDataPoints) {
      return { error: `Insufficient data for prediction. At least ${requiredDataPoints} days of data are required.` };
    }

    const currentPrice = parseFloat(marketData[0].close);
    const totalScore = analysis.totalScore;
    const trendStrength = Math.abs(totalScore);
    const direction = totalScore > 0 ? "upward" : "downward";
    
    // --- Short-Term Calculation ---
    const shortTermPrices = marketData.slice(0, 22).map(d => parseFloat(d.close));
    const shortTermStdDev = calculateStdDev(shortTermPrices);
    const shortTermAvgVolatility = (shortTermStdDev / currentPrice) * 100;
    const { timeframe: shortTermTimeframe, multiplier: shortTermMultiplier } = getVariableTimeframe(trendStrength);
    const shortTermMovePercent = trendStrength * shortTermAvgVolatility * shortTermMultiplier;
    const shortTermPriceTarget = currentPrice * (1 + (Math.sign(totalScore) * shortTermMovePercent) / 100);
    
    let shortTermInterpretation = `Based on the current ${direction} momentum and recent volatility, the price could move towards this target ${shortTermTimeframe}. This is a projection, not a guarantee.`;
    if (totalScore < 0.1 && totalScore > -0.1) {
        shortTermInterpretation = "The current momentum is neutral, making a directional price prediction unreliable at this time."
    }
    
    // --- Long-Term Calculation (6-month outlook) ---
    const longTermPrices = marketData.slice(0, 90).map(d => parseFloat(d.close));
    const longTermStdDev = calculateStdDev(longTermPrices);
    const longTermAvgVolatility = (longTermStdDev / currentPrice) * 100;
    const longTermTimeframe = "~6 months";
    const longTermMultiplier = 5.0; // Static multiplier for a longer horizon projection
    const longTermMovePercent = trendStrength * longTermAvgVolatility * longTermMultiplier;
    const longTermPriceTarget = currentPrice * (1 + (Math.sign(totalScore) * longTermMovePercent) / 100);
    
    let longTermInterpretation = `This projection leverages the same momentum score but uses a longer volatility window to forecast a potential ${longTermTimeframe} price level.`;
     if (totalScore < 0.1 && totalScore > -0.1) {
        longTermInterpretation = "Neutral momentum makes a long-term directional forecast unreliable."
    }


    return {
        shortTerm: {
            priceTarget: parseFloat(shortTermPriceTarget.toFixed(2)),
            timeframe: shortTermTimeframe,
            interpretation: shortTermInterpretation,
        },
        longTerm: {
            priceTarget: parseFloat(longTermPriceTarget.toFixed(2)),
            timeframe: longTermTimeframe,
            interpretation: longTermInterpretation,
        }
    };

  } catch (e: any) {
    console.error("Error in predictPriceTarget:", e);
    return { error: e.message || 'An unexpected error occurred during price target calculation.' };
  }
}
