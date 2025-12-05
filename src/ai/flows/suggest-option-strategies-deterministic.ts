
'use server';

/**
 * @fileOverview This file defines a deterministic flow to suggest stock option strategies based on momentum and volatility.
 */

import { z } from 'zod';
import type { MarketData } from '@/lib/types';
import { calculateBollingerBands, calculateMACD, calculateStdDev } from '@/lib/technical-analysis';

const SuggestOptionStrategiesDeterministicInputSchema = z.object({
  ticker: z.string(),
  totalScore: z.number(),
  marketData: z.array(z.any()), // Using `any` for simplicity as it's internal
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

const getStrikeSuggestion = (latestClose: number, strikeDistance: number, isBullish: boolean, strategyName: string) => {
    if (strategyName.includes("Credit Spread") || strategyName.includes("Iron Condor")) {
        const shortStrike = isBullish ? latestClose * 0.98 : latestClose * 1.02;
        return `Consider selling an option with a strike around $${shortStrike.toFixed(2)}`;
    }
    const strike = isBullish ? latestClose * (1 + strikeDistance) : latestClose * (1- strikeDistance);
    return `Consider a strike price around $${strike.toFixed(2)}`;
}

const generateRationale = (strategyName: string, isBullish: boolean, isLowVol: boolean, latestClose: number, strikeDistance: number): string => {
    const strikeContext = getStrikeSuggestion(latestClose, strikeDistance, isBullish, strategyName);
    const volatilityContext = isLowVol ? "in the current low-volatility environment" : "to take advantage of high implied volatility";

    const rationales: Record<string, string> = {
        "Long Call": `A straightforward directional bet on a price increase. Best used ${volatilityContext} as premium is cheaper. ${strikeContext} with 30-60 days to expiration.`,
        "Long Put": `A straightforward directional bet on a price decrease. Best used ${volatilityContext} as premium is cheaper. ${strikeContext} with 30-60 days to expiration.`,
        "Bull Call Spread": `A risk-defined bullish strategy. Cheaper than a long call and benefits from a moderate upward move. Good for capitalizing on a directional bias ${volatilityContext}. ${strikeContext} for the lower strike, with 30-45 days to expiration.`,
        "Bear Put Spread": `A risk-defined bearish strategy. Cheaper than a long put and benefits from a moderate downward move. Good for capitalizing on a directional bias ${volatilityContext}. ${strikeContext} for the higher strike, with 30-45 days to expiration.`,
        "Put Credit Spread": `A bullish, high-probability strategy that profits if the stock stays above a certain price. It collects a premium, making it ideal ${volatilityContext}. ${strikeContext} for the short put, with 14-30 days to expiration.`,
        "Call Credit Spread": `A bearish, high-probability strategy that profits if the stock stays below a certain price. It collects a premium, making it ideal ${volatilityContext}. ${strikeContext} for the short call, with 14-30 days to expiration.`,
        "Iron Condor": `A neutral, range-bound strategy that profits if the stock stays between two price points. This is ideal when you expect low volatility and for the stock to not move much. ${strikeContext} for the short strikes, with 14-30 days to expiration.`,
        "Strangle": `A strategy that profits from a large price move in either direction, typically used when high volatility is expected (like before earnings). It involves buying an out-of-the-money call and an out-of-the-money put. Consider strikes one standard deviation away from the current price, with 30-45 days to expiration.`,
    };

    return rationales[strategyName] || "This strategy is selected based on the current momentum and volatility profile.";
};


export async function suggestOptionStrategiesDeterministic(
  input: SuggestOptionStrategiesDeterministicInput
): Promise<SuggestOptionStrategiesDeterministicOutput> {

    const { totalScore, marketData, latestClose } = input;
    const latestClosePrice = parseFloat(latestClose);
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));

    if (closePrices.length < 26) { // Increased requirement for MACD
        return {
            strategies: [],
            disclaimer: "Not enough historical data to generate rule-based option strategies. At least 26 days of data are required for MACD calculation."
        };
    }
    
    // Calculate a reasonable strike distance based on recent volatility
    const recentPrices = closePrices.slice(-20);
    const stdDev = calculateStdDev(recentPrices);
    const strikeDistance = stdDev / latestClosePrice; // As a percentage


    // 1. Determine Volatility State
    let isLowVolatility = false;
    const bbands = calculateBollingerBands(closePrices, 20, 2);
    if (bbands.length >= 20) {
        const recentBbands = bbands.slice(-20).filter(b => b && b.upper && b.lower && b.middle > 0);
        if (recentBbands.length > 0) {
            const bandWidths = recentBbands.map(b => (b.upper - b.lower) / b.middle).filter(bw => !isNaN(bw));
            if (bandWidths.length > 0) {
                const currentBandwidth = bandWidths[bandWidths.length - 1] || 0;
                const minBandwidth = Math.min(...bandWidths);
                // A "squeeze" happens when current bandwidth is near its recent minimum
                if (currentBandwidth < minBandwidth * 1.15) { 
                    isLowVolatility = true;
                }
            }
        }
    }


    // 2. Determine Primary Strategies based on Momentum Score and Volatility
    let strategyNames: string[] = [];
    const isBullish = totalScore >= 0.1;
    const isBearish = totalScore <= -0.1;
    
    if (isBullish) {
        if (isLowVolatility) {
            strategyNames = ["Long Call", "Bull Call Spread"]; // Premium buying strategies
        } else {
            strategyNames = ["Put Credit Spread"]; // Premium selling strategy
        }
    } else if (isBearish) {
        if (isLowVolatility) {
            strategyNames = ["Long Put", "Bear Put Spread"]; // Premium buying strategies
        } else {
            strategyNames = ["Call Credit Spread"]; // Premium selling strategy
        }
    } else { // Neutral
        if (isLowVolatility) {
             strategyNames = ["Iron Condor"]; // Expect range-bound
        } else {
             strategyNames = ["Strangle"]; // Expect a large move, but direction is unknown
        }
    }

    const strategies = strategyNames.map(name => ({
        name,
        rationale: generateRationale(name, isBullish, isLowVolatility, latestClosePrice, strikeDistance)
    }));

    return {
        strategies,
        disclaimer: "This is not financial advice. The strategies presented are for educational purposes only, based on a deterministic technical model. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions."
    };
}
