
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
  pivots: z.object({
      pp: z.number(),
      s1: z.number(),
      s2: z.number(),
      r1: z.number(),
      r2: z.number(),
    }).optional().describe('Standard daily pivot points (Support S1, S2; Resistance R1, R2).'),
    fibonacci: z.object({
        level236: z.number(),
        level382: z.number(),
        level500: z.number(),
        level618: z.number(),
        level786: z.number(),
        rangeHigh: z.number(),
        rangeLow: z.number(),
    }).optional().describe('Fibonacci retracement levels based on the 90-day price swing.'),
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
  prompt: `You are an expert quantitative trading strategist. Your task is to synthesize the outputs of multiple financial models into the **top two most suitable, distinct trade ideas** for {{ticker}}.

**Model Inputs:**
*   **Current Price:** {{currentPrice}}
*   **Momentum Model Signal:** "{{momentumSignal}}"
*   **Momentum Model Target:** {{momentumTarget}}
*   **Monte Carlo Forecast:** {{monteCarloConfidence}}% probability of price being between {{monteCarloRange.lower}} and {{monteCarloRange.upper}} in 30 days.
*   **Volatility Model:** 30-day historical volatility is {{volatility}}%. (Consider >40% as high, <20% as low, and 20-40% as moderate).
*   **Support/Resistance Levels:**
    *   **Pivot Points:** {{#if pivots}}S2:{{pivots.s2}}, S1:{{pivots.s1}}, PP:{{pivots.pp}}, R1:{{pivots.r1}}, R2:{{pivots.r2}}{{else}}Not available.{{/if}}
    *   **Fibonacci Retracement:** {{#if fibonacci}}Key levels are {{fibonacci.level382}} (38.2%), {{fibonacci.level618}} (61.8%).{{else}}Not available.{{/if}}

**Your Task:**

1.  **Analyze Model Agreement & Conviction:**
    *   Do the Momentum Target and the Monte Carlo range point in the same direction? Strong agreement implies **High Conviction**. Disagreement implies **Low Conviction** or **Caution**.

2.  **Select Volatility-Aware & Creative Strategies:** Based on conviction AND volatility, choose the **two most appropriate, distinct** strategies. Your toolkit is broad.
    *   **Standard Plays:**
        *   High Vol + Directional Conviction: Favor premium-selling (e.g., Bull Put Spread, Bear Call Spread).
        *   Low Vol + Directional Conviction: Favor premium-buying (e.g., Debit Spreads, Long Calls/Puts).
        *   High Vol + Low/Neutral Conviction: Favor volatility-profiting (e.g., Strangles, Straddles).
    *   **Creative/Advanced Plays:**
        *   Consider **Calendar or Diagonal Spreads** if you expect range-bound action in the short-term followed by a directional move, or if you want to capitalize on time decay.
        *   Consider **Ratio Spreads** if you have a directional bias but also want to profit from high volatility, creating a position with a wider profit range or even a credit.
        *   Think about combining strategies or using creative strike placements.

3.  **Formulate the Output:**
    *   You must generate an array called 'ideas' containing exactly two distinct trade ideas. The first should be the primary, most suitable one.
    *   For each idea, provide:
        *   **strategy:** Name of the strategy.
        *   **conviction:** Your calculated conviction level.
        *   **rationale:** A 1-2 sentence explanation referencing model agreement, volatility, and why this specific strategy (standard or creative) is a good fit.
        *   **action:** A concrete trade structure. You **MUST** use the Pivot Points and Fibonacci levels to inform your choice of strike prices. For example, for a bullish spread, you might sell a put at a strike near a support level (like S1 or a Fibonacci level). State the strike prices clearly (e.g., '~$175') and suggest a specific expiration (e.g., '30-60 days').

**Example for a "STRONG BULLISH" signal, price $150, target $165, range $160-$175, volatility 45% (High), pivots {R1: 158, S1: 145}, fibonacci {level382: 142}:**
- Idea 1: { strategy: "Bull Put Spread", conviction: "High", rationale: "Models agree on the upward move and high volatility makes selling premium attractive.", action: "Sell a put at the ~$145 strike, aligning with the S1 pivot support, and buy a put at ~$140 for protection, with 30-45 days to expiration." }
- Idea 2: { strategy: "Bull Call Spread", conviction: "High", rationale: "A risk-defined way to participate in the upside, with the short strike providing a buffer against high volatility.", action: "Buy a call at ~$150 and sell a call at ~$165, near the momentum target, with 45-60 days to expiration." }

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
