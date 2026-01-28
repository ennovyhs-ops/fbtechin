'use server';

/**
 * @fileOverview This file defines a Genkit flow to analyze a user-defined option play against existing market analysis.
 *
 * - analyzeUserOptionPlay - A function that takes a user's strategy and market context to provide an educational assessment.
 * - AnalyzeUserOptionPlayInput - The input type for the function.
 * - AnalyzeUserOptionPlayOutput - The output type for the function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const OptionLegSchema = z.object({
  action: z.enum(['Buy', 'Sell']),
  type: z.enum(['Call', 'Put']),
  strike: z.number(),
});

export const AnalyzeUserOptionPlayInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  currentPrice: z.number().describe('The current price of the stock.'),
  momentumSignal: z.string().describe("The deterministic momentum signal (e.g., 'STRONG BULLISH')."),
  volatility: z.number().describe('The 30-day annualized historical volatility percentage.'),
  userStrategy: z.object({
    leg1: OptionLegSchema,
    leg2: OptionLegSchema.optional(),
    expiration: z.number().describe('The days to expiration for the option play (e.g., 14, 30, 60).'),
  }),
});
export type AnalyzeUserOptionPlayInput = z.infer<typeof AnalyzeUserOptionPlayInputSchema>;

export const AnalyzeUserOptionPlayOutputSchema = z.object({
  strategyName: z.string().describe("The common name of the user's strategy (e.g., 'Long Call', 'Bull Call Spread', 'Naked Put')."),
  assessment: z.enum(['Logical', 'Speculative', 'Contrarian', 'Illogical']).describe("A single-word assessment of how the strategy aligns with the provided market analysis."),
  analysis: z.string().describe("A concise, balanced analysis (~100 words) explaining the pros (The Good) and cons (The Bad) of the user's strategy in the current market context. It should be educational, not advisory."),
});
export type AnalyzeUserOptionPlayOutput = z.infer<typeof AnalyzeUserOptionPlayOutputSchema>;


export async function analyzeUserOptionPlay(
  input: AnalyzeUserOptionPlayInput
): Promise<AnalyzeUserOptionPlayOutput> {
  return analyzeUserOptionPlayFlow(input);
}


const analyzeUserOptionPlayPrompt = ai.definePrompt({
  name: 'analyzeUserOptionPlayPrompt',
  input: { schema: AnalyzeUserOptionPlayInputSchema },
  output: { schema: AnalyzeUserOptionPlayOutputSchema },
  prompt: `You are an expert options strategist who is excellent at providing clear, educational feedback. Your task is to analyze a user's self-constructed option play for {{ticker}} and assess its viability against the current market context.

**Market Context:**
*   **Current Price:** {{currentPrice}}
*   **Momentum Signal:** "{{momentumSignal}}"
*   **Volatility:** {{volatility}}% (Consider >40% as high, <20% as low)

**User's Option Play:**
*   **Leg 1:** {{userStrategy.leg1.action}} a {{userStrategy.leg1.type}} at strike {{userStrategy.leg1.strike}}
{{#if userStrategy.leg2}}
*   **Leg 2:** {{userStrategy.leg2.action}} a {{userStrategy.leg2.type}} at strike {{userStrategy.leg2.strike}}
{{/if}}
*   **Expiration:** {{userStrategy.expiration}} days

**Your Analysis Steps:**

1.  **Identify the Strategy:** First, determine the common name of the strategy the user has built (e.g., "Long Call", "Bull Call Spread", "Iron Condor", "Naked Put"). Set this in the 'strategyName' field.

2.  **Assess the Logic:** Compare the strategy's goal (is it bullish, bearish, neutral, or a volatility play?) with the market context.
    *   **Logical:** The strategy's goal aligns well with the momentum signal (e.g., a bullish strategy in a bullish market).
    *   **Speculative:** The strategy is logical but uses high-risk parameters (e.g., very short expiration, far out-of-the-money strikes).
    *   **Contrarian:** The strategy bets against the current momentum signal (e.g., a bearish strategy in a bullish market).
    *   **Illogical:** The strategy is constructed in a way that makes little financial sense (e.g., buying and selling the same option, or a structure that has guaranteed losses).

3.  **Write the Analysis (Pros & Cons):**
    *   Provide a concise, balanced analysis of about 100 words.
    *   Start with a brief statement on the strategy's purpose.
    *   **The Good:** Explain what's smart about the user's idea. Does it align with the trend? Is it risk-defined? Does it correctly leverage volatility?
    *   **The Bad:** Explain the risks or downsides. Is it fighting the trend? Is the chosen expiration too short/long? What has to happen for the trade to be profitable? What is the max risk?

**Example Response (for a Bull Call Spread in a Bullish market):**
{
  "strategyName": "Bull Call Spread",
  "assessment": "Logical",
  "analysis": "This is a risk-defined bullish strategy. **The Good:** This play aligns perfectly with the bullish momentum signal. By selling a higher-strike call, you've reduced the cost of the trade and capped your risk, which is a sound approach. **The Bad:** Your profit is also capped, so you would not participate in any gains beyond your short strike. The success of this trade depends on the stock moving moderately higher before expiration; a sideways or downward move will result in a loss."
}

Generate your analysis based on the user's play.
`,
});


const analyzeUserOptionPlayFlow = ai.defineFlow(
  {
    name: 'analyzeUserOptionPlayFlow',
    inputSchema: AnalyzeUserOptionPlayInputSchema,
    outputSchema: AnalyzeUserOptionPlayOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeUserOptionPlayPrompt(input);
    return output!;
  }
);
