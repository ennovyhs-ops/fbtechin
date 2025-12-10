
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
  rationale: z.string(),
  isAggressive: z.boolean(),
});

const SuggestOptionStrategiesDeterministicOutputSchema = z.object({
  strategies: z.array(OptionStrategySchema),
  disclaimer: z.string(),
});
export type SuggestOptionStrategiesDeterministicOutput = z.infer<typeof SuggestOptionStrategiesDeterministicOutputSchema>;


const strategyLibrary = {
    'Long Call': {
        base: 'This is a straightforward bullish bet with limited risk. Employ this when you have a strong directional view that the stock will rise significantly, as it offers unlimited profit potential with a known maximum loss (the premium paid).',
        strike: (price: number) => `Consider a strike price slightly out-of-the-money (e.g., ~\$${(price * 1.05).toFixed(2)})`,
        expiration: "with 30-60 days to expiration to give the thesis time to play out.",
        isAggressive: false,
    },
    'Bull Call Spread': {
        base: 'A risk-defined bullish strategy that profits from a moderate price increase. Employ this to reduce the cost of a bullish position; you cap your potential profit, but you also significantly lower the premium paid compared to a Long Call.',
        strike: (price: number) => `Consider buying an at-the-money call (e.g., ~\$${price.toFixed(2)}) and selling an out-of-the-money call (e.g., ~\$${(price * 1.075).toFixed(2)})`,
        expiration: "with 30-45 days to expiration.",
        isAggressive: false,
    },
    'Put Credit Spread': {
        base: 'A high-probability bullish strategy that profits if the stock stays above a certain price. Employ this when you are neutral to moderately bullish, as you collect a premium (income) and benefit from time decay, as long as the stock doesn\'t drop significantly.',
        strike: (price: number) => `Consider selling an out-of-the-money put (e.g., ~\$${(price * 0.95).toFixed(2)}) and buying a further OTM put for protection (e.g., ~\$${(price * 0.90).toFixed(2)})`,
        expiration: "with 30-45 days to expiration.",
        isAggressive: false,
    },
    'Long Put': {
        base: 'A simple bearish bet with limited risk. Employ this when you have a strong directional conviction that the stock will fall significantly, as it offers substantial profit potential on a downward move with a known maximum loss (the premium paid).',
        strike: (price: number) => `Consider a strike price slightly out-of-the-money (e.g., ~\$${(price * 0.95).toFixed(2)})`,
        expiration: "with 30-60 days to expiration to allow the trend to develop.",
        isAggressive: false,
    },
    'Bear Put Spread': {
        base: 'A risk-defined bearish strategy that profits from a moderate price decrease. Employ this to express a bearish view with a defined maximum loss, making it less risky and cheaper than buying a simple Long Put.',
        strike: (price: number) => `Consider buying an at-the-money put (e.g., ~\$${price.toFixed(2)}) and selling an out-of-the-money put (e.g., ~\$${(price * 0.925).toFixed(2)})`,
        expiration: "with 30-45 days to expiration.",
        isAggressive: false,
    },
    'Call Credit Spread': {
        base: 'A high-probability bearish strategy that profits if the stock remains below a certain price. Employ this when you are neutral to moderately bearish, as it allows you to collect premium and benefit from time decay, provided the stock does not rally significantly.',
        strike: (price: number) => `Consider selling an out-of-the-money call (e.g., ~\$${(price * 1.05).toFixed(2)}) and buying a further OTM call for protection (e.g., ~\$${(price * 1.10).toFixed(2)})`,
        expiration: "with 30-45 days to expiration.",
        isAggressive: false,
    },
    'Iron Condor': {
        base: 'A neutral, range-bound strategy that profits from low volatility and time decay. Employ this when you expect the stock to trade within a well-defined price range, as you are essentially betting that the price will not make a large move in either direction.',
        strike: (price: number) => `Sell an OTM put spread (e.g., selling \$${(price * 0.95).toFixed(2)} / buying \$${(price * 0.90).toFixed(2)}) and an OTM call spread (e.g., selling \$${(price * 1.05).toFixed(2)} / buying \$${(price * 1.10).toFixed(2)})`,
        expiration: "with 30-60 days to expiration.",
        isAggressive: false,
    },
    'Strangle': {
        base: 'A neutral strategy that profits from a large price move in either direction. Employ this when you expect a significant increase in volatility (a big price swing) but are unsure of the direction, such as before an earnings announcement or other major catalyst.',
        strike: (price: number) => `Buy an out-of-the-money call (e.g., ~\$${(price * 1.07).toFixed(2)}) and an out-of-the-money put (e.g., ~\$${(price * 0.93).toFixed(2)})`,
        expiration: "with 30-60 days to expiration, ideally ahead of an expected catalyst.",
        isAggressive: false,
    },
    'Weekly OTM Call': {
        base: "This is a high-risk 'lotto ticket' play. It profits only if the stock makes a very large, very fast move upwards before expiration. Employ this for a purely speculative bet on a massive short-term rally; the probability of success is low, but the potential reward is high.",
        strike: (price: number) => `Consider buying a call with a far out-of-the-money strike, like ~\$${(price * 1.10).toFixed(2)}`,
        expiration: "expiring in the next 1-2 weeks.",
        isAggressive: true,
    },
    'Weekly OTM Put': {
        base: "This is a high-risk 'lotto ticket' play. It profits only if the stock makes a very large, very fast move downwards before expiration. Employ this for a purely speculative bet on a massive short-term drop; the probability of success is low, but the potential reward is high.",
        strike: (price: number) => `Consider buying a put with a far out-of-the-money strike, like ~\$${(price * 0.90).toFixed(2)}`,
        expiration: "expiring in the next 1-2 weeks.",
        isAggressive: true,
    }
};

type StrategyName = keyof typeof strategyLibrary;

const generateRationale = (strategyName: StrategyName, latestClose: number): string => {
    const strategyInfo = strategyLibrary[strategyName];
    if (!strategyInfo) {
        return "This strategy is selected based on the current momentum and volatility profile.";
    }
    const strikeText = strategyInfo.strike(latestClose);
    return `${strategyInfo.base} For example, ${strikeText}, typically ${strategyInfo.expiration}`;
};

const getTopStrategies = (signal: AnalyzeStockMomentumOutput['signal'], isLowVolatility: boolean): StrategyName[] => {
    // Bullish Signals
    if (signal.includes("STRONG BULLISH")) {
        return isLowVolatility 
            ? ['Long Call', 'Bull Call Spread', 'Weekly OTM Call'] 
            : ['Bull Call Spread', 'Put Credit Spread', 'Weekly OTM Call'];
    }
    if (signal.includes("MODERATE BULLISH")) {
        return isLowVolatility 
            ? ['Bull Call Spread', 'Long Call', 'Put Credit Spread'] 
            : ['Put Credit Spread', 'Bull Call Spread', 'Long Call'];
    }
    if (signal.includes("MILD BULLISH")) {
        return isLowVolatility 
            ? ['Bull Call Spread', 'Put Credit Spread', 'Iron Condor'] 
            : ['Put Credit Spread', 'Bull Call Spread', 'Iron Condor'];
    }

    // Bearish Signals
    if (signal.includes("STRONG BEARISH")) {
        return isLowVolatility 
            ? ['Long Put', 'Bear Put Spread', 'Weekly OTM Put'] 
            : ['Bear Put Spread', 'Call Credit Spread', 'Weekly OTM Put'];
    }
    if (signal.includes("MODERATE BEARISH")) {
        return isLowVolatility 
            ? ['Bear Put Spread', 'Long Put', 'Call Credit Spread'] 
            : ['Call Credit Spread', 'Bear Put Spread', 'Long Put'];
    }
    if (signal.includes("MILD BEARISH")) {
        return isLowVolatility 
            ? ['Bear Put Spread', 'Call Credit Spread', 'Iron Condor'] 
            : ['Call Credit Spread', 'Bear Put Spread', 'Iron Condor'];
    }
    
    // Neutral Signal
    if (signal.includes("NEUTRAL")) {
        return isLowVolatility 
            ? ['Iron Condor', 'Strangle'] 
            : ['Strangle', 'Iron Condor'];
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

    const strategies = strategyNames.map(name => ({
        name,
        rationale: generateRationale(name, latestClosePrice),
        isAggressive: strategyLibrary[name]?.isAggressive || false,
    }));


    return {
        strategies,
        disclaimer
    };
}
