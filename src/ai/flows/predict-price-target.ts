
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
import { isCryptoPair, isCurrencyPair } from '@/lib/utils';
import { calculateATR, calculatePivotPoints, calculateFibonacciRetracement } from '@/lib/technical-analysis';


const PriceTargetObjectSchema = z.object({
  priceTarget: z.number().describe("The calculated price target."),
  timeframe: z.string().describe("The estimated timeframe for this prediction."),
  interpretation: z.string().describe("A brief explanation of what the price target means."),
});

const PredictPriceTargetOutputSchema = z.object({
    shortTerm: PriceTargetObjectSchema,
    longTerm: PriceTargetObjectSchema,
    pivots: z.object({
      pp: z.number(),
      s1: z.number(),
      s2: z.number(),
      r1: z.number(),
      r2: z.number(),
    }).optional().describe('Standard daily pivot points.'),
    fibonacci: z.object({
        level236: z.number(),
        level382: z.number(),
        level500: z.number(),
        level618: z.number(),
        rangeHigh: z.number(),
        rangeLow: z.number(),
    }).optional().describe('Fibonacci retracement levels based on the 90-day price swing.'),
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
        return { timeframe: "in the next 1-3 weeks", multiplier: 2.0 }; // ATR multiplier
    }
    if (trendStrength >= 0.4) { // Moderate signal
        return { timeframe: "in the next 3-5 weeks", multiplier: 1.5 };
    }
    if (trendStrength >= 0.1) { // Mild signal
        return { timeframe: "in the next 4-8 weeks", multiplier: 1.0 };
    }
    // Neutral
    return { timeframe: "is uncertain due to neutral momentum", multiplier: 0.5 };
}

export async function predictPriceTarget(
  ticker: string,
  marketData: MarketData[],
  analysis: AnalyzeStockMomentumOutput,
): Promise<PredictPriceTargetOutput | { error: string }> {
  try {
    const requiredDataPoints = 90; // For long-term volatility and Fibonacci calculation
    if (!marketData || marketData.length < requiredDataPoints) {
      return { error: `Insufficient data for prediction. At least ${requiredDataPoints} days of data are required. Live data may be limited to 100 days on the free API plan.` };
    }

    const currentPrice = parseFloat(marketData[0].close);
    const totalScore = analysis.totalScore;
    const trendStrength = Math.abs(totalScore);
    const direction = totalScore > 0 ? "upward" : "downward";
    
    // --- Calculate 52-Week Range ---
    const oneYearDataPoints = 252;
    const hasEnoughFor52Week = marketData.length >= oneYearDataPoints;
    let high52 = -Infinity;
    let low52 = Infinity;
    const isSynthesizedData = marketData.every(d => d.open === d.close && d.high === d.close && d.low === d.close);
    
    if (hasEnoughFor52Week) {
        const oneYearData = marketData.slice(0, oneYearDataPoints);
        oneYearData.forEach(d => {
            const h = isSynthesizedData ? parseFloat(d.close) : parseFloat(d.high);
            const l = isSynthesizedData ? parseFloat(d.close) : parseFloat(d.low);
            if (!isNaN(h) && h > high52) high52 = h;
            if (!isNaN(l) && l < low52) low52 = l;
        });
    }
    const hasValid52WeekRange = high52 !== -Infinity && low52 !== Infinity;


    // For currency/crypto, we don't predict a price target, just show the 52-week range info in the interpretation.
    if (isCurrencyPair(ticker) || isCryptoPair(ticker)) {
        let interpretation = `Price target projection is not applicable for this asset type.`;
        if(hasValid52WeekRange) {
            interpretation = `The 52-week range for ${ticker} is from a low of ${low52.toFixed(4)} to a high of ${high52.toFixed(4)}. Price target projection is not applicable for this asset type.`
        } else if (!hasEnoughFor52Week) {
            interpretation = `Not enough data for 52-week range. At least ${oneYearDataPoints} days are required.`
        }

        const neutralTarget = {
            priceTarget: currentPrice,
            timeframe: "N/A",
            interpretation: interpretation
        };
        return {
            shortTerm: neutralTarget,
            longTerm: neutralTarget,
        }
    }


    // --- ATR, Pivot Point, and Fibonacci Calculation ---
    const dataChronological = [...marketData].reverse();
    const atr = calculateATR(dataChronological.map(d => ({
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close)
    })), 14);
    const latestAtr = atr.at(-1);

    const pivots = calculatePivotPoints({
      high: parseFloat(marketData[1].high), // Yesterday's data
      low: parseFloat(marketData[1].low),
      close: parseFloat(marketData[1].close)
    });

    const fibonacci = calculateFibonacciRetracement(marketData, 90);


    // --- Short-Term Calculation using ATR ---
    const { timeframe: shortTermTimeframe, multiplier: shortTermMultiplier } = getVariableTimeframe(trendStrength);
    let shortTermPriceTarget = currentPrice;

    if (latestAtr !== undefined && !isNaN(latestAtr)) {
      const atrMove = latestAtr * shortTermMultiplier;
      shortTermPriceTarget = currentPrice + (atrMove * Math.sign(totalScore));
    }
    
    let shortTermInterpretation = `Based on the current ${direction} momentum and recent volatility (ATR), the price could move towards this target ${shortTermTimeframe}. This is a projection, not a guarantee.`;
    if (totalScore < 0.1 && totalScore > -0.1) {
        shortTermInterpretation = "The current momentum is neutral, making a directional price prediction unreliable at this time."
    } else if (pivots) {
        if(totalScore > 0 && shortTermPriceTarget > pivots.r1) {
            shortTermInterpretation = `The projection targets a move towards the R1 pivot point at ${pivots.r1.toFixed(2)}, a key short-term resistance level.`
        } else if (totalScore < 0 && shortTermPriceTarget < pivots.s1) {
            shortTermInterpretation = `The projection indicates a potential test of the S1 pivot support at ${pivots.s1.toFixed(2)}.`
        }
    } else if (hasValid52WeekRange) {
        if (totalScore > 0 && shortTermPriceTarget > high52) {
            shortTermInterpretation = `This projection suggests a potential breakout above the 52-week high, driven by strong short-term momentum.`;
        } else if (totalScore < 0 && shortTermPriceTarget < low52) {
            shortTermInterpretation = `This projection indicates a potential breakdown below the 52-week low, based on current selling pressure.`;
        }
    }
    
    // --- Long-Term Calculation (6-month outlook using Standard Deviation) ---
    const longTermPrices = marketData.slice(0, 90).map(d => parseFloat(d.close));
    const longTermStdDev = calculateStdDev(longTermPrices);
    const longTermAvgVolatility = (longTermStdDev / currentPrice) * 100;
    const longTermTimeframe = "~6 months";
    const longTermMultiplier = 5.0; // Static multiplier for a longer horizon projection
    const longTermMovePercent = trendStrength * longTermAvgVolatility * longTermMultiplier;
    const longTermPriceTarget = currentPrice * (1 + (Math.sign(totalScore) * longTermMovePercent) / 100);
    
    let longTermInterpretation = `This projection leverages the same momentum score but uses a longer-term standard deviation to forecast a potential ${longTermTimeframe} price level.`;
     if (totalScore < 0.1 && totalScore > -0.1) {
        longTermInterpretation = "Neutral momentum makes a long-term directional forecast unreliable."
    } else if (hasValid52WeekRange) {
        if (totalScore > 0 && longTermPriceTarget > high52) {
             longTermInterpretation = `The long-term outlook suggests a sustained move that could challenge and potentially surpass the 52-week high, acting as a key resistance level.`;
        } else if (totalScore < 0 && longTermPriceTarget < low52) {
             longTermInterpretation = `The longer-term forecast points towards a decline that may test the 52-week low, which could act as a significant support level.`;
        }
    } else if (!hasEnoughFor52Week) {
        longTermInterpretation = `The long-term forecast is unavailable, as this feature requires at least ${oneYearDataPoints} days of historical data to analyze the 52-week context.`
    }


    return {
        shortTerm: {
            priceTarget: parseFloat(shortTermPriceTarget.toFixed(2)),
            timeframe: shortTermTimeframe,
            interpretation: shortTermInterpretation,
        },
        longTerm: {
            priceTarget: hasEnoughFor52Week ? parseFloat(longTermPriceTarget.toFixed(2)) : currentPrice,
            timeframe: hasEnoughFor52Week ? longTermTimeframe : 'N/A',
            interpretation: longTermInterpretation,
        },
        pivots,
        fibonacci,
    };

  } catch (e: any) {
    console.error("Error in predictPriceTarget:", e);
    return { error: e.message || 'An unexpected error occurred during price target calculation.' };
  }
}
