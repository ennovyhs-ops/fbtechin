
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
  rsi: z.string().describe("The latest RSI value and its state (e.g., '55 (Neutral)')."),
  macd: z.string().describe("The state of the MACD indicator (e.g., 'Bullish Crossover')."),
  bollingerBands: z.string().describe("The position of the price relative to the Bollinger Bands (e.g., 'Price is above the middle band')."),
  trends: z.string().describe("The alignment of short, medium, and long-term trends (e.g., 'All trends aligned bullish')."),
  volume: z.string().describe("The recent volume trend (e.g., 'Showing accumulation')."),
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
  prompt: `You are an expert financial analyst who is brilliant at explaining complex technical indicators in a simple, clear, and concise way.

Your task is to explain why the momentum signal for **{{ticker}}** is **"{{signal}}"** (with a score of {{score}}).

Analyze the following contributing factors and synthesize them into a 1-2 sentence explanation. Focus on the most important drivers.

*   **Trend Alignment:** {{trends}}
*   **RSI (Momentum Oscillator):** {{rsi}}
*   **MACD (Trend Strength):** {{macd}}
*   **Bollinger Bands (Volatility & Price Level):** {{bollingerBands}}
*   **Volume:** {{volume}}

**Example Explanation (for a Bullish signal):**
"The bullish signal is primarily driven by strong trend alignment across all timeframes and a recent bullish MACD crossover, suggesting the upward momentum is accelerating. The price is also holding above its key moving average, reinforcing the positive outlook."

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
