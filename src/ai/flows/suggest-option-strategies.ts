
'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest stock option strategies using an AI model.
 *
 * - suggestOptionStrategies - A function that returns potential AI-driven option strategies.
 * - SuggestOptionStrategiesInput - The input type for the suggestOptionStrategies function.
 * - SuggestOptionStrategiesOutput - The output type for the suggestOptionStrategies function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';
import type { AnalyzeStockMomentumOutput } from './analyze-stock-momentum';

const SuggestOptionStrategiesInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  latestClose: z.string().describe("The latest closing price of the stock, to be used as a reference for strike prices."),
  signal: z.string().describe("The AI-generated momentum signal for the stock (e.g. 'STRONG BULLISH').")
});
export type SuggestOptionStrategiesInput = z.infer<typeof SuggestOptionStrategiesInputSchema>;


const OptionStrategySchema = z.object({
    name: z.string().describe('The name of the option strategy (e.g., "Covered Call", "Protective Put").'),
    rationale: z.string().describe('A brief explanation of why this strategy is suitable for the given signal, including context for strike price and time frame selection (e.g., "slightly out-of-the-money" and "30-60 days to expiration").')
});

const SuggestOptionStrategiesOutputSchema = z.object({
  strategies: z.array(OptionStrategySchema).describe('An array of 2-3 AI-suggested option strategies.'),
  disclaimer: z.string().describe('A mandatory disclaimer that this is not financial advice.')
});
export type SuggestOptionStrategiesOutput = z.infer<typeof SuggestOptionStrategiesOutputSchema>;

export async function suggestOptionStrategies(
  input: SuggestOptionStrategiesInput
): Promise<SuggestOptionStrategiesOutput> {
  const { output } = await suggestOptionStrategiesPrompt(input);
  if (!output) throw new Error("AI failed to generate a valid response.");
  return output;
}

const suggestOptionStrategiesPrompt = ai.definePrompt({
  name: 'suggestOptionStrategiesPrompt',
  input: { schema: SuggestOptionStrategiesInputSchema },
  output: { schema: SuggestOptionStrategiesOutputSchema },
  prompt: `You are an expert options trading strategist. Your task is to suggest 2-3 suitable, common option strategies for {{ticker}} based on the provided momentum signal and its latest closing price.

**Ticker:** {{ticker}}
**Latest Closing Price:** {{latestClose}}
**Momentum Signal:** "{{signal}}"

**Instructions:**
1.  Analyze the signal (e.g., "STRONG BULLISH", "NEUTRAL", "MODERATE BEARISH").
2.  Suggest 2-3 distinct and appropriate option strategies. For each strategy, you **MUST** provide a concise 'rationale'.
3.  In the 'rationale', you **MUST** provide context for selecting a strike price relative to the latest close price (e.g., "slightly out-of-the-money", "at-the-money").
4.  In the 'rationale', you **MUST** also suggest a suitable time frame for the option's expiration (e.g., "with 30-60 days to expiration", "with 2-4 weeks to expiration").
5.  Do not suggest overly complex or obscure strategies. Stick to well-known ones.
6.  You **MUST** include the following disclaimer verbatim in the 'disclaimer' field: "This is not financial advice. The strategies presented are for educational purposes only, based on a technical momentum signal. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions."

**Example for a "STRONG BULLISH" signal and a price of $150:**
- Strategy: "Long Call"
- Rationale: "Allows the trader to profit from an upward price move with limited risk. Consider a strike price slightly out-of-the-money, like $155, with 30-60 days to expiration to give the thesis time to play out."
- Strategy: "Bull Call Spread"
- Rationale: "A moderately bullish strategy that profits from an increase in the stock price while capping risk. One might buy a call at $152.50 and sell a call at $157.50, with about 45 days to expiration."
`,
});
