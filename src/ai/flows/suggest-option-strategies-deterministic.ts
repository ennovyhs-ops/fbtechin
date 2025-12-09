
'use server';

/**
 * @fileOverview This file defines a deterministic flow to suggest a single, optimal stock option strategy 
 * based on a clear decision tree driven by momentum and volatility analysis.
 */

import { z } from 'zod';
import type { MarketData } from '@/lib/types';
import { calculateBollingerBands, calculateStdDev } from '@/lib/technical-analysis';
import type { AnalyzeStockMomentumOutput } from './analyze-stock-momentum';

const SuggestOptionStrategiesDeterministicInputSchema = z.object({
  ticker: z.string(),
  analysis: z.any(), // Using `any` for simplicity as it's internal
  marketData: z.array(z.any()), 
  latestClose: z.string(),
});
export type SuggestOptionStrategiesDeterministicInput = z.infer<typeof SuggestOptionStrategiesDeterministicInputSchema>;

const OptionStrategySchema = z.object({
  name: z.string(),
  rationale: z.string(),
});

const SuggestOptionStrategiesDeterministicOutputSchema = z.object({
  strategy: OptionStrategySchema.optional(),
  disclaimer: z.string(),
});
export type SuggestOptionStrategiesDeterministicOutput = z.infer<typeof SuggestOptionStrategiesDeterministicOutputSchema>;

const generateRationale = (
    strategyName: string, 
    signal: AnalyzeStockMomentumOutput['signal'], 
    isLowVol: boolean,
): string => {
    const volatilityContext = isLowVol ? "in the current low-volatility environment" : "to capitalize on the current high implied volatility";

    const baseRationales: Record<string, string> = {
        "Long Call": `The momentum signal is Bullish and options are cheaper ${volatilityContext}, making a straightforward directional bet on a price increase the optimal strategy.`,
        "Bull Call Spread": `The momentum signal is Bullish and options are cheaper ${volatilityContext}. This risk-defined strategy is cheaper than a Long Call and provides a clear profit target.`,
        "Put Credit Spread": `The momentum signal is Bullish and selling expensive options is favorable ${volatilityContext}. This high-probability strategy profits if the stock stays above a key level.`,
        "Long Put": `The momentum signal is Bearish and options are cheaper ${volatilityContext}, making a straightforward directional bet on a price decrease the optimal strategy.`,
        "Bear Put Spread": `The momentum signal is Bearish and options are cheaper ${volatilityContext}. This risk-defined strategy is cheaper than a Long Put and provides a clear profit target.`,
        "Call Credit Spread": `The momentum signal is Bearish and selling expensive options is favorable ${volatilityContext}. This high-probability strategy profits if the stock stays below a key level.`,
        "Iron Condor": `The signal is Neutral and the stock is expected to stay in a range ${volatilityContext}. This strategy profits from time decay if the stock price remains between two defined strike prices.`,
        "Strangle": `The signal is Neutral but a big price move is expected ${volatilityContext}. This strategy profits from a large move in either direction, capitalizing on the expansion of volatility.`,
    };

    return baseRationales[strategyName] || "This strategy is selected based on the current momentum and volatility profile.";
};


export async function suggestOptionStrategiesDeterministic(
  input: SuggestOptionStrategiesDeterministicInput
): Promise<SuggestOptionStrategiesDeterministicOutput> {

    const { analysis, marketData } = input;
    const { signal } = analysis as AnalyzeStockMomentumOutput;
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));

    const disclaimer = "This is not financial advice. The strategy presented is for educational purposes only, based on a deterministic technical model. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions.";

    if (closePrices.length < 26) {
        return {
            disclaimer: "Not enough historical data to generate a rule-based option strategy. At least 26 days of data are required."
        };
    }

    // 1. Determine Volatility Environment
    let isLowVolatility = false;
    const bbands = calculateBollingerBands(closePrices, 20, 2);
    if (bbands.length >= 20) {
        const recentBbands = bbands.slice(-20).filter(b => b && b.upper && b.lower && b.middle > 0);
        if (recentBbands.length > 0) {
            const bandWidths = recentBbands.map(b => (b.upper - b.lower) / b.middle).filter(bw => !isNaN(bw));
            if (bandWidths.length > 0) {
                const currentBandwidth = bandWidths[bandWidths.length - 1] || 0;
                const minBandwidth = Math.min(...bandWidths);
                if (currentBandwidth < minBandwidth * 1.15) { 
                    isLowVolatility = true; // Bollinger Band Squeeze indicates low vol
                }
            }
        }
    }

    // 2. Follow the Decision Tree
    let strategyName: string | null = null;
    
    if (signal.includes("BULLISH")) {
        if (isLowVolatility) {
            // Bullish + Low Vol -> Buy Premium
            strategyName = signal.includes("STRONG") ? "Long Call" : "Bull Call Spread";
        } else {
            // Bullish + High Vol -> Sell Premium
            strategyName = "Put Credit Spread";
        }
    } else if (signal.includes("BEARISH")) {
        if (isLowVolatility) {
            // Bearish + Low Vol -> Buy Premium
            strategyName = signal.includes("STRONG") ? "Long Put" : "Bear Put Spread";
        } else {
            // Bearish + High Vol -> Sell Premium
            strategyName = "Call Credit Spread";
        }
    } else { // Neutral
        strategyName = isLowVolatility ? "Iron Condor" : "Strangle";
    }


    if (!strategyName) {
        return { disclaimer };
    }

    const strategy = {
        name: strategyName,
        rationale: generateRationale(strategyName, signal, isLowVolatility)
    };

    return {
        strategy,
        disclaimer
    };
}
