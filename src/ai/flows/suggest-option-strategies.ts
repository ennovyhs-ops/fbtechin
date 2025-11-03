'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest stock option strategies based on a momentum signal.
 *
 * - suggestOptionStrategies - A function that takes a ticker and momentum analysis signal and returns potential option strategies.
 * - SuggestOptionStrategiesInput - The input type for the suggestOptionStrategies function.
 * - SuggestOptionStrategiesOutput - The output type for the suggestOptionStrategies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestOptionStrategiesInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  signal: z.string().describe("The momentum signal (e.g., '🚀 STRONG BULLISH', '🚨 STRONG BEARISH').")
});
export type SuggestOptionStrategiesInput = z.infer<typeof SuggestOptionStrategiesInputSchema>;

const OptionStrategySchema = z.object({
    name: z.string().describe('The name of the option strategy (e.g., "Covered Call", "Protective Put").'),
    rationale: z.string().describe('A brief explanation of why this strategy is suitable for the given signal.')
});

const SuggestOptionStrategiesOutputSchema = z.object({
  strategies: z.array(OptionStrategySchema).describe('An array of 2-3 suggested option strategies.'),
  disclaimer: z.string().describe('A mandatory disclaimer that this is not financial advice.')
});
export type SuggestOptionStrategiesOutput = z.infer<typeof SuggestOptionStrategiesOutputSchema>;

export async function suggestOptionStrategies(
  input: SuggestOptionStrategiesInput
): Promise<SuggestOptionStrategiesOutput> {
  return suggestOptionStrategiesFlow(input);
}

const suggestOptionStrategiesPrompt = ai.definePrompt({
  name: 'suggestOptionStrategiesPrompt',
  input: { schema: SuggestOptionStrategiesInputSchema },
  output: { schema: SuggestOptionStrategiesOutputSchema },
  prompt: `You are an expert options trading strategist. Your task is to suggest 2-3 suitable, common option strategies for {{ticker}} based on the provided momentum signal.

**Momentum Signal:** "{{signal}}"

**Instructions:**
1.  Analyze the signal (e.g., "STRONG BULLISH", "NEUTRAL", "MODERATE BEARISH").
2.  Suggest 2-3 distinct and appropriate option strategies. For each strategy, provide a concise 'rationale' explaining why it fits the signal.
3.  Do not suggest overly complex or obscure strategies. Stick to well-known ones.
4.  You MUST include the following disclaimer verbatim in the 'disclaimer' field: "This is not financial advice. The strategies presented are for educational purposes only, based on a technical momentum signal. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions."

**Example for a "STRONG BULLISH" signal:**
- Strategy: "Long Call"
- Rationale: "Allows the trader to profit from a significant upward price move with limited risk (the premium paid)."
- Strategy: "Bull Call Spread"
- Rationale: "A moderately bullish strategy that profits from an increase in the stock price while capping both potential profit and risk, making it cheaper to implement than a long call."
`,
});

const suggestOptionStrategiesFlow = ai.defineFlow(
  {
    name: 'suggestOptionStrategiesFlow',
    inputSchema: SuggestOptionStrategiesInputSchema,
    outputSchema: SuggestOptionStrategiesOutputSchema,
  },
  async (input) => {
    const { output } = await suggestOptionStrategiesPrompt(input);
    return output!;
  }
);
