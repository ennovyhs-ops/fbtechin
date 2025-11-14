'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest stock option strategies.
 * It runs both an AI model and a deterministic calculation in parallel for comparison.
 *
 * - suggestOptionStrategies - A function that returns potential option strategies from both systems.
 * - SuggestOptionStrategiesInput - The input type for the suggestOptionStrategies function.
 * - SuggestOptionStrategiesOutput - The output type for the suggestOptionStrategies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { MarketData } from '@/lib/types';
import { suggestOptionStrategiesDeterministic } from './suggest-option-strategies-deterministic';

const SuggestOptionStrategiesInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  latestClose: z.string().describe("The latest closing price of the stock, to be used as a reference for strike prices."),
  analysis: z.any(), // Using any for simplicity with complex nested Zod types
  marketData: z.array(z.any()),
});
export type SuggestOptionStrategiesInput = z.infer<typeof SuggestOptionStrategiesInputSchema>;


const OptionStrategySchema = z.object({
    name: z.string().describe('The name of the option strategy (e.g., "Covered Call", "Protective Put").'),
    rationale: z.string().describe('A brief explanation of why this strategy is suitable for the given signal, including context for strike price and time frame selection (e.g., "slightly out-of-the-money" and "30-60 days to expiration").')
});

const SuggestOptionStrategiesOutputSchema = z.object({
  aiStrategies: z.array(OptionStrategySchema).describe('An array of 2-3 AI-suggested option strategies.'),
  deterministicStrategies: z.array(OptionStrategySchema).describe('An array of deterministically-suggested option strategies.'),
  disclaimer: z.string().describe('A mandatory disclaimer that this is not financial advice.')
});
export type SuggestOptionStrategiesOutput = z.infer<typeof SuggestOptionStrategiesOutputSchema>;

export async function suggestOptionStrategies(
  input: SuggestOptionStrategiesInput
): Promise<SuggestOptionStrategiesOutput> {
    const aiInput = {
        ticker: input.ticker,
        latestClose: input.latestClose,
        signal: input.analysis.signal,
    };
    
    const deterministicInput = {
        ticker: input.ticker,
        totalScore: input.analysis.totalScore,
        marketData: input.marketData,
        latestClose: input.latestClose,
    };

    // Run both AI and deterministic flows in parallel
    const [aiResult, deterministicResult] = await Promise.all([
        suggestOptionStrategiesPrompt(aiInput).catch(e => {
          console.error("AI suggestion failed:", e);
          return { output: { strategies: [], disclaimer: "" } }; // Return empty on failure
        }),
        suggestOptionStrategiesDeterministic(deterministicInput).catch(e => {
            console.error("Deterministic suggestion failed:", e);
            return { strategies: [], disclaimer: "" }; // Return empty on failure
        })
    ]);

    const aiStrategies = aiResult?.output?.strategies || [];
    const deterministicStrategies = deterministicResult?.strategies || [];
    
    const disclaimer = aiResult?.output?.disclaimer || deterministicResult?.disclaimer || "This is not financial advice. Options trading involves significant risk.";

    return {
      aiStrategies,
      deterministicStrategies,
      disclaimer,
    };
}

const suggestOptionStrategiesPrompt = ai.definePrompt({
  name: 'suggestOptionStrategiesPrompt',
  input: { schema: z.object({ ticker: z.string(), signal: z.string(), latestClose: z.string() }) },
  output: { schema: SuggestOptionStrategiesOutputSchema.pick({ strategies: true, disclaimer: true }) },
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are an expert options trading strategist. Your task is to suggest 2-3 suitable, common option strategies for {{ticker}} based on the provided momentum signal and its latest closing price. The momentum signal is based on daily data with indicators over the last 14-26 days, so the strategies should be for a short-to-medium term outlook.

**Ticker:** {{ticker}}
**Latest Closing Price:** {{latestClose}}
**Momentum Signal:** "{{signal}}"

**Instructions:**
1.  Analyze the signal (e.g., "STRONG BULLISH", "NEUTRAL", "MODERATE BEARISH").
2.  Suggest 2-3 distinct and appropriate option strategies. For each strategy, provide a concise 'rationale'.
3.  In the 'rationale', you MUST provide context for selecting a strike price relative to the latest close price (e.g., "slightly out-of-the-money").
4.  In the 'rationale', you MUST ALSO suggest a suitable time frame for the option's expiration, typically between 3 to 8 weeks (e.g., "with 30-60 days to expiration").
5.  Do not suggest overly complex or obscure strategies. Stick to well-known ones.
6.  You MUST include the following disclaimer verbatim in the 'disclaimer' field: "This is not financial advice. The strategies presented are for educational purposes only, based on a technical momentum signal. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions."

**Example for a "STRONG BULLISH" signal and a price of $150:**
- Strategy: "Long Call"
- Rationale: "Allows the trader to profit from an upward price move with limited risk. Consider a strike price slightly out-of-the-money, like $155, with 30-60 days to expiration to give the thesis time to play out."
- Strategy: "Bull Call Spread"
- Rationale: "A moderately bullish strategy that profits from an increase in the stock price while capping risk. One might buy a call at $152.50 and sell a call at $157.50, with about 45 days to expiration."
`,
});

// We don't define a flow with ai.defineFlow because we are manually handling the fallback logic in the exported function.
