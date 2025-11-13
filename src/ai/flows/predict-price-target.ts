'use server';

/**
 * @fileOverview This file defines a function to predict a short-term price target for a stock.
 *
 * - predictPriceTarget - A function that takes market data and a momentum score to project a price target.
 * - PredictPriceTargetOutput - The output type for the predictPriceTarget function.
 */

import { z } from 'zod';
import type { MarketData } from '@/lib/types';
import type { AnalyzeStockMomentumOutput } from './analyze-stock-momentum';

const PredictPriceTargetOutputSchema = z.object({
  priceTarget: z.number().describe("The calculated short-term price target."),
  timeframe: z.string().describe("The estimated timeframe for this prediction (e.g., 'in the next 3-4 weeks')."),
  interpretation: z.string().describe("A brief explanation of what the price target means."),
  confidence: z.string().describe("The confidence level of the prediction (e.g., 'High', 'Moderate', 'Low')."),
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

const getConfidenceFromSignal = (signal: string): string => {
    if (signal.includes('STRONG')) return 'High';
    if (signal.includes('MODERATE')) return 'Moderate';
    if (signal.includes('MILD')) return 'Low';
    return 'Very Low';
};

export async function predictPriceTarget(
  marketData: MarketData[],
  analysis: AnalyzeStockMomentumOutput,
): Promise<PredictPriceTargetOutput | { error: string }> {
  try {
    if (!marketData || marketData.length < 50) {
      return { error: "Insufficient data for prediction. At least 50 days of data are required." };
    }

    const currentPrice = parseFloat(marketData[0].close);
    const totalScore = analysis.totalScore;
    const trendStrength = Math.abs(totalScore);
    
    // Use last 22 days of closing prices for volatility calculation
    const recentPrices = marketData.slice(0, 22).map(d => parseFloat(d.close));
    const priceStdDev = calculateStdDev(recentPrices);
    
    // Normalize volatility as a percentage of current price
    const avgVolatilityMove = (priceStdDev / currentPrice) * 100;

    // Project the move using trend strength, volatility, and a multiplier
    const projectedMovePercent = trendStrength * avgVolatilityMove * 3;

    // Apply the projected move to the current price in the direction of the trend
    const priceTarget = currentPrice * (1 + (Math.sign(totalScore) * projectedMovePercent) / 100);

    const roundedPriceTarget = parseFloat(priceTarget.toFixed(2));
    
    const direction = totalScore > 0 ? "upward" : "downward";
    const timeframe = "in the next 3-4 weeks";
    const confidence = getConfidenceFromSignal(analysis.signal);

    return {
        priceTarget: roundedPriceTarget,
        timeframe,
        interpretation: `Based on the current ${direction} momentum and recent volatility, the price could move towards this target ${timeframe}. This is a projection, not a guarantee.`,
        confidence
    };

  } catch (e: any) {
    console.error("Error in predictPriceTarget:", e);
    return { error: e.message || 'An unexpected error occurred during price target calculation.' };
  }
}
