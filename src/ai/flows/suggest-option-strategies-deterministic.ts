
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
    'Long Call': {
        base: 'A straightforward bullish bet with limited risk. Best for strong upward momentum.',
        strike: "Consider a strike price slightly out-of-the-money",
        expiration: "with 30-60 days to expiration to give the thesis time to play out."
    },
    'Bull Call Spread': {
        base: 'A risk-defined bullish strategy that profits from a moderate price increase while lowering cost.',
        strike: "Consider buying an at-the-money call and selling an out-of-the-money call",
        expiration: "with 30-45 days to expiration."
    },
    'Put Credit Spread': {
        base: 'A high-probability bullish strategy that profits if the stock stays above a certain price. It benefits from high volatility and time decay.',
        strike: "Consider selling an out-of-the-money put and buying a further OTM put for protection",
        expiration: "with 30-45 days to expiration."
    },
    'Long Put': {
        base: 'A simple bearish bet with limited risk. Best for strong downward momentum.',
        strike: "Consider a strike price slightly out-of-the-money",
        expiration: "with 30-60 days to expiration to allow the trend to develop."
    },
    'Bear Put Spread': {
        base: 'A risk-defined bearish strategy that profits from a moderate price decrease while lowering cost.',
        strike: "Consider buying an at-the-money put and selling an out-of-the-money put",
        expiration: "with 30-45 days to expiration."
    },
    'Call Credit Spread': {
        base: 'A high-probability bearish strategy that profits if the stock remains below a certain price. Benefits from high volatility.',
        strike: "Consider selling an out-of-the-money call and buying a further OTM call for protection",
        expiration: "with 30-45 days to expiration."
    },
    'Iron Condor': {
        base: 'A neutral, range-bound strategy that profits from low volatility and time decay.',
        strike: "Sell an OTM put spread and an OTM call spread around the expected trading range",
        expiration: "with 30-60 days to expiration."
    },
    'Strangle': {
        base: 'A neutral strategy that profits from a large price move in either direction, capitalizing on an expansion of volatility.',
        strike: "Buy an out-of-the-money call and an out-of-the-money put",
        expiration: "with 30-60 days to expiration, ideally ahead of an expected catalyst."
    },
};

type StrategyName = keyof typeof strategyLibrary;

const generateRationale = (strategyName: StrategyName): string => {
    const strategyInfo = strategyLibrary[strategyName];
    if (!strategyInfo) {
        return "This strategy is selected based on the current momentum and volatility profile.";
    }
    return `${strategyInfo.base} ${strategyInfo.strike}, typically ${strategyInfo.expiration}`;
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
        // In low volatility, an Iron Condor is often preferred to collect premium while expecting a range. 
        // A Strangle is better if you expect volatility to *increase* from a low base.
        // In high volatility, a Strangle is less attractive due to high cost, but an Iron Condor benefits from selling rich premium. We will reverse the typical logic.
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
