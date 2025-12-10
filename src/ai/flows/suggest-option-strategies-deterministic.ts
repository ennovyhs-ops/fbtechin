
'use server';

/**
 * @fileOverview This file defines a deterministic flow to suggest the top two optimal stock option strategies 
 * based on a clear decision tree driven by momentum and volatility analysis.
 */

import { z } from 'zod';
import type { MarketData } from '@/lib/types';
import { calculateBollingerBands } from '@/lib/technical-analysis';
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
  strategies: z.array(OptionStrategySchema),
  disclaimer: z.string(),
});
export type SuggestOptionStrategiesDeterministicOutput = z.infer<typeof SuggestOptionStrategiesDeterministicOutputSchema>;


const strategyLibrary = {
    'Long Call': 'A straightforward bullish bet with limited risk, ideal for strong upward momentum, especially when options are cheap.',
    'Bull Call Spread': 'A risk-defined bullish strategy that profits from a moderate price increase. It is cheaper than a Long Call, making it suitable for moderate conviction or high-volatility environments.',
    'Put Credit Spread': 'A high-probability bullish strategy that profits if the stock stays above a certain price. It is ideal for mild bullishness or range-bound conditions, especially in high volatility.',
    'Long Put': 'A simple bearish bet with limited risk, best for strong downward momentum when options are relatively inexpensive.',
    'Bear Put Spread': 'A risk-defined bearish strategy that profits from a moderate price decrease. Cheaper than a Long Put, it fits moderate bearish conviction.',
    'Call Credit Spread': 'A high-probability bearish strategy that profits if the stock remains below a certain price. It is suitable for mild bearishness, especially when selling expensive options in high volatility.',
    'Iron Condor': 'A neutral, range-bound strategy that profits from low volatility and time decay. It is ideal when the stock is expected to trade within a specific price range.',
    'Strangle': 'A neutral strategy that profits from a large price move in either direction. It is used when a big move is expected but the direction is uncertain, capitalizing on an expansion of volatility.',
};

type StrategyName = keyof typeof strategyLibrary;

const generateRationale = (strategyName: StrategyName): string => {
    return strategyLibrary[strategyName] || "This strategy is selected based on the current momentum and volatility profile.";
};

const getTopTwoStrategies = (signal: AnalyzeStockMomentumOutput['signal'], isLowVolatility: boolean): StrategyName[] => {
    // Bullish Signals
    if (signal.includes("STRONG BULLISH")) {
        return isLowVolatility ? ['Long Call', 'Bull Call Spread'] : ['Bull Call Spread', 'Put Credit Spread'];
    }
    if (signal.includes("MODERATE BULLISH")) {
        return isLowVolatility ? ['Bull Call Spread', 'Long Call'] : ['Put Credit Spread', 'Bull Call Spread'];
    }
    if (signal.includes("MILD BULLISH")) {
        return isLowVolatility ? ['Bull Call Spread', 'Put Credit Spread'] : ['Put Credit Spread', 'Iron Condor'];
    }

    // Bearish Signals
    if (signal.includes("STRONG BEARISH")) {
        return isLowVolatility ? ['Long Put', 'Bear Put Spread'] : ['Bear Put Spread', 'Call Credit Spread'];
    }
    if (signal.includes("MODERATE BEARISH")) {
        return isLowVolatility ? ['Bear Put Spread', 'Long Put'] : ['Call Credit Spread', 'Bear Put Spread'];
    }
    if (signal.includes("MILD BEARISH")) {
        return isLowVolatility ? ['Bear Put Spread', 'Call Credit Spread'] : ['Call Credit Spread', 'Iron Condor'];
    }
    
    // Neutral Signal
    if (signal.includes("NEUTRAL")) {
        return isLowVolatility ? ['Iron Condor', 'Strangle'] : ['Strangle', 'Iron Condor'];
    }
    
    return [];
}


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
            strategies: [],
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
                // A "squeeze" is when current bandwidth is near its recent minimum
                if (currentBandwidth < minBandwidth * 1.15) { 
                    isLowVolatility = true; 
                }
            }
        }
    }

    // 2. Follow the Decision Tree to get top 2 strategies
    const strategyNames = getTopTwoStrategies(signal, isLowVolatility);

    if (strategyNames.length === 0) {
        return { strategies: [], disclaimer };
    }

    const strategies = strategyNames.map(name => ({
        name,
        rationale: generateRationale(name)
    }));


    return {
        strategies,
        disclaimer
    };
}
