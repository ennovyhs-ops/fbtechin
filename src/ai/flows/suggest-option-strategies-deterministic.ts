
'use server';

/**
 * @fileOverview This file defines a deterministic flow to suggest the top three optimal stock option strategies 
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
  rationale: z.string().describe("A brief explanation of why this strategy is suitable for the given signal and volatility environment."),
  action: z.string().describe("A specific, actionable implementation of the strategy, including example strike prices and an expiration timeframe."),
  isAggressive: z.boolean(),
});

const SuggestOptionStrategiesDeterministicOutputSchema = z.object({
  strategies: z.array(OptionStrategySchema),
  disclaimer: z.string(),
});
export type SuggestOptionStrategiesDeterministicOutput = z.infer<typeof SuggestOptionStrategiesDeterministicOutputSchema>;


const strategyLibrary = {
    'Long Call': {
        rationale: 'A straightforward bullish bet with limited risk. It offers high profit potential for a strong directional move.',
        action: (price: number) => `Buy a call with a strike slightly out-of-the-money (e.g., ~$${(price * 1.05).toFixed(2)}) with 30-60 days to expiration.`,
        isAggressive: false,
    },
    'Bull Call Spread': {
        rationale: 'A risk-defined bullish strategy that profits from a moderate price increase. It reduces the cost of entry compared to a Long Call, but caps profit.',
        action: (price: number) => `Buy an at-the-money call (e.g., ~$${price.toFixed(2)}) and sell an out-of-the-money call (e.g., ~$${(price * 1.075).toFixed(2)}) with 30-45 days to expiration.`,
        isAggressive: false,
    },
    'Bull Put Spread': {
        rationale: 'A high-probability bullish strategy that profits if the stock stays above a certain price. It collects a premium and benefits from time decay, making it ideal in higher volatility.',
        action: (price: number) => `Sell an out-of-the-money put (e.g., ~$${(price * 0.95).toFixed(2)}) and buy a further OTM put for protection (e.g., ~$${(price * 0.90).toFixed(2)}) with 30-45 days to expiration.`,
        isAggressive: false,
    },
    'Long Put': {
        rationale: 'A simple bearish bet with limited risk. It offers substantial profit potential on a significant downward move.',
        action: (price: number) => `Buy a put with a strike slightly out-of-the-money (e.g., ~$${(price * 0.95).toFixed(2)}) with 30-60 days to expiration.`,
        isAggressive: false,
    },
    'Bear Put Spread': {
        rationale: 'A risk-defined bearish strategy that profits from a moderate price decrease. It is cheaper and less risky than a simple Long Put.',
        action: (price: number) => `Buy an at-the-money put (e.g., ~$${price.toFixed(2)}) and sell an out-of-the-money put (e.g., ~$${(price * 0.925).toFixed(2)}) with 30-45 days to expiration.`,
        isAggressive: false,
    },
    'Bear Call Spread': {
        rationale: 'A high-probability bearish strategy that profits if the stock remains below a certain price. It collects premium and benefits from time decay, making it ideal in higher volatility.',
        action: (price: number) => `Sell an out-of-the-money call (e.g., ~$${(price * 1.05).toFixed(2)}) and buy a further OTM call for protection (e.g., ~$${(price * 1.10).toFixed(2)}) with 30-45 days to expiration.`,
        isAggressive: false,
    },
    'Iron Condor': {
        rationale: 'A neutral, range-bound strategy that profits from low volatility and time decay, betting the price will not make a large move in either direction.',
        action: (price: number) => `Sell an OTM put spread (e.g., selling $${(price * 0.95).toFixed(2)} / buying $${(price * 0.90).toFixed(2)}) and an OTM call spread (e.g., selling $${(price * 1.05).toFixed(2)} / buying $${(price * 1.10).toFixed(2)}) with 30-60 days to expiration.`,
        isAggressive: false,
    },
    'Strangle': {
        rationale: 'A neutral strategy that profits from a large price move in either direction. Best used when expecting a significant increase in volatility from a current low-volatility state.',
        action: (price: number) => `Buy an out-of-the-money call (e.g., ~$${(price * 1.07).toFixed(2)}) and an out-of-the-money put (e.g., ~$${(price * 0.93).toFixed(2)}) with 30-60 days to expiration.`,
        isAggressive: false,
    },
    'Straddle': {
        rationale: 'A more aggressive neutral strategy that profits from a large and rapid price move. It has a higher cost than a Strangle but provides greater profit potential if volatility expands significantly.',
        action: (price: number) => `Buy both an at-the-money call and an at-the-money put (e.g., strike ~$${price.toFixed(2)}) with 30-60 days to expiration.`,
        isAggressive: true,
    },
    'Call Ratio Spread': {
        rationale: 'A flexible bullish strategy, typically entered for a credit. It profits most if the stock price rises to the strike of the sold calls by expiration. It has unlimited risk if the price rises sharply.',
        action: (price: number) => `Buy one at-the-money call (e.g., ~$${price.toFixed(2)}) and sell two out-of-the-money calls (e.g., ~$${(price * 1.05).toFixed(2)}) with 30-45 days to expiration.`,
        isAggressive: true,
    },
    'Put Ratio Spread': {
        rationale: 'A flexible bearish strategy, often entered for a credit. It profits most if the stock price falls to the strike of the sold puts by expiration. It has large, but defined, risk if the price drops sharply.',
        action: (price: number) => `Buy one at-the-money put (e.g., ~$${price.toFixed(2)}) and sell two out-of-the-money puts (e.g., ~$${(price * 0.95).toFixed(2)}) with 30-45 days to expiration.`,
        isAggressive: true,
    },
     'Call Calendar Spread': {
        rationale: 'A neutral to slightly bullish strategy that profits from time decay and low volatility. It bets the stock will stay near the strike price in the short term.',
        action: (price: number) => `Sell a front-month call (e.g., ~30 DTE) and buy a back-month call (e.g., ~60 DTE) at the same, near-the-money strike (e.g., ~$${price.toFixed(2)}).`,
        isAggressive: false,
    },
    'Put Calendar Spread': {
        rationale: 'A neutral to slightly bearish strategy that profits from time decay. It is ideal for when you expect the stock to be range-bound or drift slightly lower.',
        action: (price: number) => `Sell a front-month put (e.g., ~30 DTE) and buy a back-month put (e.g., ~60 DTE) at the same, near-the-money strike (e.g., ~$${price.toFixed(2)}).`,
        isAggressive: false,
    },
    'Weekly OTM Call': {
        rationale: "This is a high-risk 'lotto ticket' play for a massive short-term rally. The probability of success is low, but the potential reward is high.",
        action: (price: number) => `Buy a far out-of-the-money call (e.g., strike at ~$${(price * 1.10).toFixed(2)}) expiring in the next 1-2 weeks.`,
        isAggressive: true,
    },
    'Weekly OTM Put': {
        rationale: "This is a high-risk 'lotto ticket' play for a massive short-term drop. The probability of success is low, but the potential reward is high.",
        action: (price: number) => `Buy a far out-of-the-money put (e.g., strike at ~$${(price * 0.90).toFixed(2)}) expiring in the next 1-2 weeks.`,
        isAggressive: true,
    }
};

type StrategyName = keyof typeof strategyLibrary;


const getTopStrategies = (signal: AnalyzeStockMomentumOutput['signal'], isLowVolatility: boolean): StrategyName[] => {
    // Bullish Signals
    if (signal.includes("STRONG BULLISH")) {
        return isLowVolatility 
            ? ['Long Call', 'Bull Call Spread', 'Weekly OTM Call'] 
            : ['Bull Put Spread', 'Bull Call Spread', 'Weekly OTM Call'];
    }
    if (signal.includes("MODERATE BULLISH")) {
        return isLowVolatility 
            ? ['Bull Call Spread', 'Long Call', 'Call Ratio Spread'] 
            : ['Bull Put Spread', 'Bull Call Spread', 'Long Call'];
    }
    if (signal.includes("MILD BULLISH")) {
        return isLowVolatility 
            ? ['Bull Call Spread', 'Call Calendar Spread', 'Iron Condor'] 
            : ['Bull Put Spread', 'Bull Call Spread', 'Iron Condor'];
    }

    // Bearish Signals
    if (signal.includes("STRONG BEARISH")) {
        return isLowVolatility 
            ? ['Long Put', 'Bear Put Spread', 'Weekly OTM Put'] 
            : ['Bear Call Spread', 'Bear Put Spread', 'Weekly OTM Put'];
    }
    if (signal.includes("MODERATE BEARISH")) {
        return isLowVolatility 
            ? ['Bear Put Spread', 'Long Put', 'Put Ratio Spread'] 
            : ['Bear Call Spread', 'Bear Put Spread', 'Long Put'];
    }
    if (signal.includes("MILD BEARISH")) {
        return isLowVolatility 
            ? ['Bear Put Spread', 'Put Calendar Spread', 'Iron Condor'] 
            : ['Bear Call Spread', 'Bear Put Spread', 'Iron Condor'];
    }
    
    // Neutral Signal
    if (signal.includes("NEUTRAL")) {
        return isLowVolatility 
            ? ['Iron Condor', 'Call Calendar Spread', 'Strangle'] 
            : ['Iron Condor', 'Straddle', 'Strangle'];
    }
    
    return [];
}


export async function suggestOptionStrategiesDeterministic(
  input: SuggestOptionStrategiesDeterministicInput
): Promise<SuggestOptionStrategiesDeterministicOutput> {

    const { analysis, marketData, latestClose } = input;
    const { signal } = analysis as AnalyzeStockMomentumOutput;
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));
    const latestClosePrice = parseFloat(latestClose);

    const disclaimer = "This is not financial advice. The strategy presented is for educational purposes only, based on a deterministic technical model. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions.";

    if (closePrices.length < 26 || isNaN(latestClosePrice)) {
        const reason = isNaN(latestClosePrice) ? "The latest closing price is not a valid number." : "At least 26 days of data are required.";
        return {
            strategies: [],
            disclaimer: `Not enough historical data to generate a rule-based option strategy. ${reason}`
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

    // 2. Follow the Decision Tree to get top strategies
    const strategyNames = getTopStrategies(signal, isLowVolatility);

    if (strategyNames.length === 0) {
        return { strategies: [], disclaimer };
    }

    const strategies = strategyNames.map(name => {
        const strategyInfo = strategyLibrary[name];
        return {
            name,
            rationale: strategyInfo.rationale,
            action: strategyInfo.action(latestClosePrice),
            isAggressive: strategyInfo.isAggressive,
        }
    });


    return {
        strategies,
        disclaimer
    };
}
