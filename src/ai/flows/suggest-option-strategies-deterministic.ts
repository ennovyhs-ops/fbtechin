
'use server';

/**
 * @fileOverview This file defines a deterministic flow to suggest stock option strategies based on momentum and volatility.
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
  strategies: z.array(OptionStrategySchema),
  disclaimer: z.string(),
});
export type SuggestOptionStrategiesDeterministicOutput = z.infer<typeof SuggestOptionStrategiesDeterministicOutputSchema>;

const getStrikeSuggestion = (latestClose: number, strikeDistance: number, isBullish: boolean, strategyName: string) => {
    // For credit spreads, suggest a strike that is closer to the money to collect a reasonable premium.
    if (strategyName.includes("Credit Spread")) {
        const shortStrike = isBullish ? latestClose * 0.98 : latestClose * 1.02;
        return `Consider selling an option with a strike around $${shortStrike.toFixed(2)}`;
    }
     // For debit spreads or long options, suggest a strike further out to lower cost or define risk.
    const strike = isBullish ? latestClose * (1 + strikeDistance) : latestClose * (1 - strikeDistance);
    return `Consider a strike price around $${strike.toFixed(2)}`;
};

const generateRationale = (strategyName: string, signal: AnalyzeStockMomentumOutput['signal'], isLowVol: boolean, latestClose: number, strikeDistance: number): string => {
    const isBullish = signal.includes("BULLISH");
    const strikeContext = getStrikeSuggestion(latestClose, strikeDistance, isBullish, strategyName);
    const volatilityContext = isLowVol ? "in a low-volatility environment" : "to capitalize on high implied volatility";

    const baseRationales: Record<string, string> = {
        "Long Call": `A straightforward directional bet on a price increase. Chosen due to the strong bullish signal, making a direct bet on a price increase logical. This strategy is best used ${volatilityContext}. ${strikeContext}.`,
        "Long Put": `A straightforward directional bet on a price decrease. Chosen due to the strong bearish signal. This strategy is best used ${volatilityContext}. ${strikeContext}.`,
        "Bull Call Spread": `A risk-defined bullish strategy that's cheaper than a long call. Good for capitalizing on the moderate bullish signal without taking on unlimited risk. ${strikeContext} for the lower (long) strike.`,
        "Bear Put Spread": `A risk-defined bearish strategy that's cheaper than a long put. Good for capitalizing on the moderate bearish signal without taking on unlimited risk. ${strikeContext} for the higher (long) strike.`,
        "Put Credit Spread": `A high-probability bullish strategy that profits if the stock stays above a certain price. Ideal for a mild bullish signal where you expect a drift upwards or sideways movement. This strategy profits from time decay and is best used ${volatilityContext}. ${strikeContext} for the short put.`,
        "Call Credit Spread": `A high-probability bearish strategy that profits if the stock stays below a certain price. Ideal for a mild bearish signal where you expect a drift downwards or sideways movement. This strategy profits from time decay and is best used ${volatilityContext}. ${strikeContext} for the short call.`,
        "Iron Condor": `A neutral, range-bound strategy that profits if the stock stays between two price points. This is ideal for a neutral signal when you expect low volatility and for the stock to not move much. ${strikeContext} for the short strikes.`,
        "Strangle": `A neutral strategy that profits from a large price move in either direction, typically used when high volatility is expected (like before earnings), but the direction is unknown. This aligns with a neutral signal in a high volatility environment.`,
    };

    return baseRationales[strategyName] || "This strategy is selected based on the current momentum and volatility profile.";
};


export async function suggestOptionStrategiesDeterministic(
  input: SuggestOptionStrategiesDeterministicInput
): Promise<SuggestOptionStrategiesDeterministicOutput> {

    const { analysis, marketData, latestClose } = input;
    const { totalScore, signal } = analysis as AnalyzeStockMomentumOutput;
    const latestClosePrice = parseFloat(latestClose);
    const reversedData = [...marketData].reverse();
    const closePrices = reversedData.map(d => parseFloat(d.close));

    if (closePrices.length < 26) {
        return {
            strategies: [],
            disclaimer: "Not enough historical data to generate rule-based option strategies. At least 26 days of data are required."
        };
    }
    
    const recentPrices = closePrices.slice(-20);
    const stdDev = calculateStdDev(recentPrices);
    const strikeDistance = stdDev / latestClosePrice;

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
                if (currentBandwidth < minBandwidth * 1.15) { 
                    isLowVolatility = true;
                }
            }
        }
    }

    // 2. Determine Primary Strategies based on Momentum Score and Volatility
    let strategyNames: string[] = [];
    
    if (signal.includes("STRONG")) {
        strategyNames = signal.includes("BULLISH") ? ["Long Call"] : ["Long Put"];
    } else if (signal.includes("MODERATE")) {
        strategyNames = signal.includes("BULLISH") ? ["Bull Call Spread"] : ["Bear Put Spread"];
    } else if (signal.includes("MILD")) {
        strategyNames = signal.includes("BULLISH") ? ["Put Credit Spread"] : ["Call Credit Spread"];
    } else { // Neutral
        strategyNames = isLowVolatility ? ["Iron Condor"] : ["Strangle"];
    }

    const strategies = strategyNames.map(name => ({
        name,
        rationale: generateRationale(name, signal, isLowVolatility, latestClosePrice, strikeDistance)
    }));

    return {
        strategies,
        disclaimer: "This is not financial advice. The strategies presented are for educational purposes only, based on a deterministic technical model. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions."
    };
}
