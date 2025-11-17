'use server';

/**
 * @fileOverview This file defines a deterministic flow to suggest stock option strategies based on momentum and volatility.
 */

import { z } from 'zod';
import type { MarketData } from '@/lib/types';
import { calculateBollingerBands, calculateMACD } from '@/lib/technical-analysis';

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
        return `Consider selling a short-term option with a strike around $${shortStrike.toFixed(2)}`;
    }
    const strike = isBullish ? latestClose + strikeDistance : latestClose - strikeDistance;
    return `Consider a strike price around $${strike.toFixed(2)}`;
}

const generateRationale = (strategyName: string, isBullish: boolean, latestClose: number, strikeDistance: number): string => {
    const direction = isBullish ? "upward" : "downward";
    const strikeContext = getStrikeSuggestion(latestClose, strikeDistance, isBullish, strategyName);
    
    const rationales: Record<string, string> = {
        "Long Calls": `For strong bullish momentum. A straightforward strategy to profit from an ${direction} price move with limited risk. ${strikeContext} with 30-60 days to expiration.`,
        "Call Verticals": `A risk-defined bullish strategy suitable for moderate bullish outlooks. Involves buying a call and selling another at a higher strike to finance the position and cap potential profit and loss.`,
        "Long Puts": `For strong bearish momentum. A straightforward strategy to profit from a ${direction} price move with limited risk. ${strikeContext} with 30-60 days to expiration.`,
        "Put Verticals": `A risk-defined bearish strategy suitable for moderate bearish outlooks. Involves buying a put at a higher strike and selling one at a lower strike.`,
        "Debit Spreads": `This involves buying a higher-premium option and selling a lower-premium one. In a bullish case, it's a Call Debit Spread; in a bearish case, a Put Debit Spread. It offers a directional bet with a defined risk and is best in low volatility.`,
        "Ratio Spreads": `This strategy involves buying and selling an unequal number of options. For instance, buying one call and selling two higher-strike calls. It's for capitalizing on a directional move with an expected price pinning at the short strike, best in higher volatility.`,
        "Call Credit Spreads": `A bearish, high-probability strategy where you expect the stock to stay below a certain price. You collect a premium (credit) by selling a call and buying a higher-strike call for protection. ${strikeContext}, with 2-4 weeks to expiration.`,
        "Put Credit Spreads": `A bullish, high-probability strategy where you expect the stock to stay above a certain price. You collect a premium by selling a put and buying a lower-strike put for protection. ${strikeContext}, with 2-4 weeks to expiration.`,
        "Iron Condors": `A neutral, range-bound strategy that profits if the stock stays between two price points. It involves selling both a put credit spread and a call credit spread. Best for low-volatility environments where you expect little price movement.`,
        "Calendar Spreads": `A neutral to directional strategy that profits from the passage of time and/or an increase in volatility. It involves buying a longer-term option and selling a shorter-term option of the same strike. Good for when you expect a move but are unsure of timing.`,
        "Strangles": `A strategy that profits from a large price move in either direction, typically used when high volatility is expected (like before earnings). It involves buying an out-of-the-money call and an out-of-the-money put.`,
        "Butterflies": `A neutral strategy that has a very narrow profit range. It profits if the stock price is at a specific point at expiration. It is a low-cost, low-probability, low-volatility trade.`,
        "Diagonal Spreads": `This strategy involves buying a longer-dated option and selling a shorter-dated option with a different strike price. It can be set up to be bullish, bearish, or neutral and profits from time decay and/or price movement.`,
        "Defensive Rolls": `This is a position management technique, not an initial strategy. It suggests the market is choppy or unpredictable. It involves closing an existing position and opening a new one further out in time or at a different strike to manage risk.`
    };

    return rationales[strategyName] || "This strategy is selected based on the current momentum and volatility profile.";
};

// Helper to calculate Standard Deviation
const calculateStdDev = (data: number[]): number => {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((a, b) => a + b) / n;
    const variance = data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n;
    return Math.sqrt(variance);
};

export async function suggestOptionStrategiesDeterministic(
  input: SuggestOptionStrategiesDeterministicInput
): Promise<SuggestOptionStrategiesDeterministicOutput> {

    const { totalScore, marketData, latestClose } = input;
    const latestClosePrice = parseFloat(latestClose);
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));

    if (closePrices.length < 20) {
        return {
            strategies: [],
            disclaimer: "Not enough historical data to generate rule-based option strategies."
        };
    }
    
    // Calculate a reasonable strike distance based on recent volatility
    const recentPrices = closePrices.slice(-20);
    const stdDev = calculateStdDev(recentPrices);
    const strikeDistance = stdDev / 3; // Use 1/3 of a standard deviation as a starting point for OTM


    // 1. Calculate Timing Score
    let timingScore = 0;
    if (closePrices.length >= 26) {
        const macd = calculateMACD(closePrices, 12, 26, 9);
        if (macd.length >= 2) {
            const latestMacd = macd[macd.length-1];
            const prevMacd = macd[macd.length-2];

            if(latestMacd && prevMacd && !isNaN(latestMacd.MACD!) && !isNaN(prevMacd.MACD!) && latestMacd.signal && prevMacd.signal) {
                const isCrossoverBullish = prevMacd.MACD! <= prevMacd.signal! && latestMacd.MACD! > latestMacd.signal!;
                const isCrossoverBearish = prevMacd.MACD! >= prevMacd.signal! && latestMacd.MACD! < latestMacd.signal!;
                if (isCrossoverBullish || isCrossoverBearish) timingScore += 0.7; // Strong signal
                else if (latestMacd.MACD! > latestMacd.signal! && totalScore > 0) timingScore += 0.3; // Confirming bullish
                else if (latestMacd.MACD! < latestMacd.signal! && totalScore < 0) timingScore += 0.3; // Confirming bearish
            }
        }
    }
    
    // 2. Calculate Volatility State & adjust timing score
    let volatilityState = 0;
    const bbands = calculateBollingerBands(closePrices, 20, 2);
    if (bbands.length >= 20) {
        const recentBbands = bbands.slice(-20);
        const bandWidths = recentBbands.map(b => (b && b.upper && b.lower && b.middle > 0) ? (b.upper - b.lower) / b.middle : NaN).filter(bw => !isNaN(bw));
        if (bandWidths.length > 0) {
            volatilityState = bandWidths[bandWidths.length - 1] || 0;
            const minBandwidth = Math.min(...bandWidths);
            if (volatilityState < minBandwidth * 1.2) { // Squeeze is active or recent
                timingScore = Math.min(1.0, timingScore + 0.4); // Majorly boost timing score during a squeeze
            }
        }
    }


    // 3. Determine Strategies based on user logic
    let strategyNames: string[] = [];
    if (timingScore >= 0.7) { // High conviction on timing (e.g., Crossover + Squeeze)
        if (totalScore > 0.3) {
           strategyNames = volatilityState < 0.05 ? ["Long Calls", "Debit Spreads"] : ["Call Verticals", "Ratio Spreads"];
        } else if (totalScore < -0.3) {
           strategyNames = volatilityState < 0.05 ? ["Long Puts", "Debit Spreads"] : ["Put Verticals", "Ratio Spreads"];
        } else {
           strategyNames = ["Strangles"]; // High timing score but neutral momentum -> expect volatility
        }
    } else if (timingScore >= 0.4) { // Moderate conviction on timing (e.g., a strong trend)
        if (totalScore > 0.3) {
           strategyNames = volatilityState < 0.08 ? ["Call Verticals"] : ["Put Credit Spreads"];
        } else if (totalScore < -0.3) {
           strategyNames = volatilityState < 0.08 ? ["Put Verticals"] : ["Call Credit Spreads"];
        } else {
            strategyNames = ["Iron Condors", "Calendar Spreads"]
        }
    } else { // Low conviction on timing -> Neutral or choppy market expected
        if (volatilityState < 0.05) {
            strategyNames = ["Iron Condors", "Butterflies"];
        } else if (volatilityState < 0.1) {
            strategyNames = ["Calendar Spreads", "Diagonal Spreads"];
        } else {
            // Choppy, high-volatility, no clear direction or timing -> defensive
            strategyNames = ["Defensive Rolls"];
        }
    }

    const strategies = strategyNames.map(name => ({
        name,
        rationale: generateRationale(name, totalScore > 0, latestClosePrice, strikeDistance)
    }));

    return {
        strategies,
        disclaimer: "This is not financial advice. The strategies presented are for educational purposes only, based on a deterministic technical model. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions."
    };
}
