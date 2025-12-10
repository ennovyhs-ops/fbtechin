
'use server';

/**
 * @fileOverview This file defines a Genkit flow to synthesize multiple analytical models into a single, actionable trade idea.
 *
 * - synthesizeTradeIdea - A function that takes outputs from momentum, probabilistic, and volatility models to generate a trade idea.
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
  volatility: z.number().describe('The 30-day annualized historical volatility percentage.'),
});
export type SynthesizeTradeIdeaInput = z.infer<typeof SynthesizeTradeIdeaInputSchema>;

const TradeIdeaSchema = z.object({
  strategy: z.string().describe('The name of the suggested trading strategy (e.g., "Bull Call Spread").'),
  rationale: z.string().describe("A concise explanation for why this strategy was chosen, synthesizing the agreement or divergence between the momentum, Monte Carlo, and volatility models."),
  action: z.string().describe("A specific, actionable implementation of the strategy, including suggested strike prices (e.g., '~$175') and a specific expiration timeframe (e.g., '45-60 days to expiration')."),
  conviction: z.enum(["High", "Moderate", "Low", "Caution"]).describe("The conviction level based on model agreement.")
});

const SynthesizeTradeIdeaOutputSchema = z.object({
  ideas: z.array(TradeIdeaSchema).length(2).describe("An array containing the top two most suitable trade ideas.")
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
  prompt: `You are an expert quantitative trading strategist. Your task is to synthesize the outputs of three different financial models—a deterministic momentum model, a probabilistic Monte Carlo simulation, and a historical volatility reading—into the **top two most suitable, distinct trade ideas** for {{ticker}}.

**Model Inputs:**
*   **Current Price:** {{currentPrice}}
*   **Momentum Model Signal:** "{{momentumSignal}}"
*   **Momentum Model Target:** {{momentumTarget}}
*   **Monte Carlo Forecast:** {{monteCarloConfidence}}% probability of price being between {{monteCarloRange.lower}} and {{monteCarloRange.upper}} in 30 days.
*   **Volatility Model:** 30-day historical volatility is {{volatility}}%. (Consider >40% as high, <20% as low, and 20-40% as moderate).

**Your Task:**

1.  **Analyze Model Agreement & Conviction:**
    *   Do the Momentum Target and the Monte Carlo range point in the same direction relative to the current price?
    *   Strong agreement (e.g., bullish signal, target within a higher range) implies **High Conviction**.
    *   Moderate agreement (e.g., bullish signal, but target is near the edge of the range) implies **Moderate Conviction**.
    *   Disagreement (e.g., bullish signal, but target is outside the range) implies **Low Conviction** or **Caution**.

2.  **Select Volatility-Aware Strategies:** Based on the conviction level AND the volatility, choose the **two most appropriate, distinct** strategies. The first idea should be the primary, most suitable one. The second should be a good alternative (e.g., slightly more or less aggressive, or using a different structure).
    *   **High Volatility + Directional Conviction:** Suggest premium-selling strategies that match the direction (e.g., Bull Put Spread, Bear Call Spread). These benefit from high premiums.
    *   **Low Volatility + Directional Conviction:** Suggest premium-buying strategies (e.g., Call/Put Debit Spreads, Long Calls/Puts). These are cheaper to enter in low-vol environments.
    *   **High Volatility + Low/Neutral Conviction:** Suggest strategies that profit from volatility itself (e.g., Strangles) or range-bound premium selling (Iron Condors).
    *   **Low Volatility + Low/Neutral Conviction:** Suggest strategies that profit from time decay (e.g., Calendar Spreads) or advise staying out.

3.  **Formulate the Output:**
    *   You must generate an array called 'ideas' containing exactly two distinct trade ideas.
    *   For each idea object in the array, provide:
        *   **strategy:** The name of your chosen strategy.
        *   **conviction:** Your calculated conviction level for that specific idea.
        *   **rationale:** A 1-2 sentence explanation of *why* you chose this strategy, referencing the model agreement AND the volatility context.
        *   **action:** A concrete, actionable trade structure. You **MUST** suggest specific strike prices (e.g., '~$175') based on the current price/targets and a specific expiration timeframe (e.g., '30-60 days to expiration').

**Example for a "STRONG BULLISH" signal, price $150, target $165, range $160-$175, volatility 45% (High):**
- Idea 1: { strategy: "Bull Put Spread", conviction: "High", rationale: "Models agree on the upward move. High volatility makes selling premium attractive.", action: "Sell a put at ~$145, buy a put at ~$140, with 30-45 days to expiration." }
- Idea 2: { strategy: "Bull Call Spread", conviction: "High", rationale: "A risk-defined way to participate in the upside while offsetting some cost by selling a further out-of-the-money call, which is beneficial in high volatility.", action: "Buy a call at ~$150, sell a call at ~$165, with 45-60 days to expiration." }

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
