
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

const AggressiveOptionStrategySchema = z.object({
    name: z.string().describe('The name of the aggressive, high-risk/high-reward option strategy.'),
    rationale: z.string().describe('A brief explanation of why this strategy is aggressive and what scenario it would profit from, including strike and very short-term expiration (e.g., "weekly" or "less than 2 weeks").')
});

const SuggestOptionStrategiesOutputSchema = z.object({
  strategies: z.array(OptionStrategySchema).describe('An array of 2-3 standard, AI-suggested option strategies.'),
  aggressivePlay: AggressiveOptionStrategySchema.optional().describe('A single, very aggressive, high-risk/high-reward option play.'),
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
  prompt: `You are an expert options trading strategist. Your task is to suggest suitable option strategies for {{ticker}} based on the provided momentum signal and its latest closing price.

**Ticker:** {{ticker}}
**Latest Closing Price:** {{latestClose}}
**Momentum Signal:** "{{signal}}"

**Instructions:**

**Part 1: Standard Strategies**
1.  Analyze the signal (e.g., "STRONG BULLISH", "NEUTRAL", "MODERATE BEARISH").
2.  Suggest 2-3 distinct and appropriate **standard option strategies**. For each strategy, you **MUST** provide a concise 'rationale'.
3.  In the 'rationale' for standard strategies, you **MUST** provide context for selecting a strike price relative to the latest close price (e.g., "slightly out-of-the-money", "at-the-money").
4.  In the 'rationale' for standard strategies, you **MUST** also suggest a suitable time frame for the option's expiration (e.g., "with 30-60 days to expiration", "with 2-4 weeks to expiration").
5.  Do not suggest overly complex or obscure strategies for this part. Stick to well-known ones.

**Part 2: Aggressive Play**
1.  Based on the signal, devise a **single, aggressive, high-risk/high-reward** 'aggressivePlay'. This should be a speculative play.
2.  Examples of aggressive plays include buying short-dated, far out-of-the-money options (a "lotto ticket" play) or using complex spreads to capitalize on a very specific predicted event (like a sharp, fast move).
3.  For the 'aggressivePlay' rationale, you **MUST** explain why it is high-risk and describe the specific scenario it's designed to profit from.
4.  You **MUST** suggest a very short-term expiration (e.g., "weekly expiration," "in the next 1-2 weeks") and a specific strike price context (e.g., "far out-of-the-money").

**Part 3: Disclaimer**
1.  You **MUST** include the following disclaimer verbatim in the 'disclaimer' field: "This is not financial advice. The strategies presented are for educational purposes only, based on a technical momentum signal. Options trading involves significant risk and is not suitable for all investors. Consult a qualified financial advisor before making any trading decisions."

**Example for a "STRONG BULLISH" signal and a price of $150:**
- Strategy: "Long Call"
- Rationale: "Allows the trader to profit from an upward price move with limited risk. Consider a strike price slightly out-of-the-money, like $155, with 30-60 days to expiration to give the thesis time to play out."
- Aggressive Play:
  - name: "Weekly OTM Call"
  - rationale: "This is a high-risk 'lotto ticket' play. It will only be profitable if the stock makes a very large, very fast move upwards before expiration. Consider buying a call with a $165 strike expiring this Friday. The premium is low, but the probability of success is also very low."
`,
});
