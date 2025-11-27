
'use server';

/**
 * @fileOverview This file defines a Genkit flow to synthesize multiple analytical models into a single, actionable trade idea.
 *
 * - synthesizeTradeIdea - A function that takes outputs from momentum and probabilistic models to generate a trade idea.
 * - SynthesizeTradeIdeaInput - The input type for the function.
 * - SynthesizeTradeIdeaOutput - The output type for the function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const SynthesizeTradeIdeaInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  currentPrice: z.number().describe('The latest closing price of the stock.'),
  momentumSignal: z.string().describe("The deterministic momentum signal (e.g., 'STRONG BULLISH')."),
  momentumTarget: z.number().describe('The price target calculated by the deterministic momentum model.'),
  monteCarloRange: z.object({
    lower: z.number(),
    upper: z.number(),
  }).describe('The probable price range calculated by the Monte Carlo simulation.'),
  monteCarloConfidence: z.number().describe('The confidence level of the Monte Carlo range (e.g., 70 for 70%).'),
});
export type SynthesizeTradeIdeaInput = z.infer<typeof SynthesizeTradeIdeaInputSchema>;

const SynthesizeTradeIdeaOutputSchema = z.object({
  strategy: z.string().describe('The name of the suggested trading strategy (e.g., "Bull Call Spread").'),
  rationale: z.string().describe("A concise explanation for why this strategy was chosen, synthesizing the agreement or divergence between the momentum and Monte Carlo models."),
  action: z.string().describe("A specific, actionable implementation of the strategy, including suggested strike prices and expiration timeframes (e.g., 'Consider buying a call with a $175 strike and selling a call with a $180 strike, with 45-60 days to expiration.')."),
  conviction: z.enum(["High", "Moderate", "Low", "Caution"]).describe("The conviction level based on model agreement.")
});
export type SynthesizeTradeIdeaOutput = z.infer<typeof SynthesizeTradeIdeaOutputSchema>;

export async function synthesizeTradeIdea(
  input: SynthesizeTradeIdeaInput
): Promise<SynthesizeTradeIdeaOutput> {
  return synthesizeTradeIdeaFlow(input);
}

const synthesizeTradeIdeaPrompt = ai.definePrompt({
  name: 'synthesizeTradeIdeaPrompt',
  input: { schema: SynthesizeTradeIdeaInputSchema },
  output: { schema: SynthesizeTradeIdeaOutputSchema },
  prompt: `You are an expert quantitative trading strategist. Your task is to synthesize the outputs of two different financial models—a deterministic momentum model and a probabilistic Monte Carlo simulation—into a single, actionable trade idea for {{ticker}}.

**Model Inputs:**
*   **Current Price:** {{currentPrice}}
*   **Momentum Model Signal:** "{{momentumSignal}}"
*   **Momentum Model Target:** {{momentumTarget}}
*   **Monte Carlo Forecast:** {{monteCarloConfidence}}% probability of price being between {{monteCarloRange.lower}} and {{monteCarloRange.upper}} in 30 days.

**Your Task:**

1.  **Analyze Model Agreement:**
    *   Does the Momentum Target fall within the Monte Carlo range?
    *   Is the Momentum Signal direction (bullish/bearish) consistent with the Monte Carlo range relative to the current price?
    *   Strong agreement (e.g., bullish signal, target within a higher range) implies **High Conviction**.
    *   Moderate agreement (e.g., bullish signal, but target is near the edge of the range) implies **Moderate Conviction**.
    *   Disagreement (e.g., bullish signal, but target is outside the range, or models point in different directions) implies **Low Conviction** or a need for **Caution**.

2.  **Select a Strategy:** Based on the conviction level and model outputs, choose the **single most appropriate** strategy.
    *   **High Conviction (Strong Trend):** Suggest more aggressive directional strategies (e.g., Long Calls/Puts).
    *   **Moderate Conviction (Defined Trend):** Suggest risk-defined strategies (e.g., Bull Call Spreads, Bear Put Spreads).
    *   **Low Conviction / High Uncertainty (Wide Range):** Suggest strategies that profit from volatility or a neutral stance (e.g., Strangles, Iron Condors).
    *   **Divergence/Caution:** Advise caution and suggest waiting for confirmation or using a very low-risk strategy.

3.  **Formulate the Output:**
    *   **strategy:** The name of your chosen strategy.
    *   **conviction:** Your calculated conviction level.
    *   **rationale:** A 1-2 sentence explanation of *why* you chose this strategy, referencing the model agreement.
    *   **action:** Provide a concrete, actionable trade structure. Suggest specific strike prices relative to the current price and targets, and a suitable expiration timeframe (typically 30-60 days).

**Example:**
*Inputs:* Current Price: $150, Signal: "STRONG BULLISH", Target: $165, Range: $160-$175.
*Output:*
- **strategy:** "Bull Call Spread"
- **conviction:** "High"
- **rationale:** "Both the momentum and Monte Carlo models show strong agreement on a significant upward move. A spread is chosen to define risk while capturing the upside potential indicated by both analyses."
- **action:** "Consider buying a call with a strike near $160 and selling a call with a strike near $170, with an expiration of 45-60 days to capture the forecasted move."

Now, analyze the inputs provided and generate your response.
`,
});

const synthesizeTradeIdeaFlow = ai.defineFlow(
  {
    name: 'synthesizeTradeIdeaFlow',
    inputSchema: SynthesizeTradeIdeaInputSchema,
    outputSchema: SynthesizeTradeIdeaOutputSchema,
  },
  async (input) => {
    const { output } = await synthesizeTradeIdeaPrompt(input);
    return output!;
  }
);
