
'use server';

/**
 * @fileOverview This file defines a Genkit flow to explain the reasoning behind a stock's momentum signal.
 *
 * - explainMomentumSignal - A function that takes technical indicator states and returns a natural language explanation.
 * - ExplainMomentumSignalInput - The input type for the function.
 * - ExplainMomentumSignalOutput - The output type for the function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const ExplainMomentumSignalInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  signal: z.string().describe("The overall momentum signal (e.g., 'STRONG BULLISH')."),
  score: z.number().describe('The numeric momentum score from -1.0 to 1.0.'),
  rsi: z.string().describe("The latest RSI value and its state (e.g., 'RSI is 55 (Neutral)')."),
  macd: z.string().describe("The state of the MACD indicator (e.g., 'A bullish crossover just occurred')."),
  bollingerBands: z.string().describe("The position of the price relative to the Bollinger Bands (e.g., 'Price is above the middle band (20-day average)')."),
  trends: z.string().describe("The alignment of short, medium, and long-term trends (e.g., 'Short, medium, and long-term trends are all bullish')."),
  volume: z.string().describe("The recent volume trend (e.g., 'Recent volume is high on a positive day (Accumulation)')."),
  stochastic: z.string().describe("The state of the Stochastic Oscillator (e.g., 'Stochastic is 85 (Overbought)')."),
  obv: z.string().describe("The trend of the On-Balance Volume (e.g., 'OBV is rising, confirming buying pressure')."),
  cmf: z.string().describe("The state of the Chaikin Money Flow (e.g., 'CMF is positive, indicating accumulation')."),
});
export type ExplainMomentumSignalInput = z.infer<typeof ExplainMomentumSignalInputSchema>;

const ExplainMomentumSignalOutputSchema = z.object({
  explanation: z.string().describe("A concise, easy-to-understand explanation of the factors driving the momentum signal."),
});
export type ExplainMomentumSignalOutput = z.infer<typeof ExplainMomentumSignalOutputSchema>;

export async function explainMomentumSignal(
  input: ExplainMomentumSignalInput
): Promise<ExplainMomentumSignalOutput> {
  return explainMomentumSignalFlow(input);
}

const explainMomentumSignalPrompt = ai.definePrompt({
  name: 'explainMomentumSignalPrompt',
  input: { schema: ExplainMomentumSignalInputSchema },
  output: { schema: ExplainMomentumSignalOutputSchema },
  prompt: `You are an expert financial analyst who is brilliant at explaining complex technical indicators in a simple, clear, and insightful way.

Your task is to explain why the momentum signal for **{{ticker}}** is **"{{signal}}"** (with a score of {{score}}).

Analyze the following contributing factors and synthesize them into a concise, 2-3 sentence explanation. Your goal is to provide insight, not just list the data.

*   **Trend Alignment:** {{trends}}
*   **RSI (Momentum Oscillator):** {{rsi}}
*   **MACD (Trend Strength):** {{macd}}
*   **Stochastic (Short-term Momentum):** {{stochastic}}
*   **Bollinger Bands (Volatility & Price Level):** {{bollingerBands}}
*   **Volume:** {{volume}}
*   **On-Balance Volume (Volume Trend):** {{obv}}
*   **Chaikin Money Flow (Accumulation/Distribution):** {{cmf}}

**Your Thought Process:**
1.  **Identify the Primary Driver:** What is the strongest piece of evidence? Is it the perfect alignment of all trends? Or a recent powerful MACD crossover? Start your explanation there.
2.  **Find Confirmation:** What other indicators support the primary driver? Mention one or two confirming factors, now including money flow and volume trends. (e.g., "...this is confirmed by an RSI in bullish territory and positive money flow shown by the CMF." or "...additionally, the rising On-Balance Volume validates the price trend with strong volume.")
3.  **Note Nuances (if any):** Are there any minor conflicts? (e.g., "While the overall trend is bullish, the Stochastic oscillator is in the overbought zone, suggesting the rally might be due for a brief consolidation.") Avoid generic hedging language. Be specific.

**Example Explanation (for a Bullish signal):**
"The bullish signal is primarily driven by strong trend alignment across all timeframes, indicating broad market agreement. This is further confirmed by a recent bullish MACD crossover and a rising On-Balance Volume, which validates the uptrend with significant buying pressure. While the Stochastic Oscillator is nearing overbought territory, the price holding above its key 20-day average reinforces the positive outlook."

**Your Turn:**
Based on the data provided, generate the 'explanation'.
`,
});

const explainMomentumSignalFlow = ai.defineFlow(
  {
    name: 'explainMomentumSignalFlow',
    inputSchema: ExplainMomentumSignalInputSchema,
    outputSchema: ExplainMomentumSignalOutputSchema,
  },
  async (input) => {
    const { output } = await explainMomentumSignalPrompt(input);
    return output!;
  }
);
