
'use server';

/**
 * @fileOverview This file defines a Genkit flow to synthesize technical analysis data into a descriptive summary.
 *
 * - summarizeTechnicalAnalysis - A function that takes various data points and returns a narrative summary.
 * - SummarizeTechnicalAnalysisInput - The input type for the function.
 * - SummarizeTechnicalAnalysisOutput - The output type for the function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const SummarizeTechnicalAnalysisInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  currentPrice: z.number().describe('The latest closing price of the stock.'),
  momentumSignal: z.string().describe("The deterministic momentum signal (e.g., 'STRONG BULLISH')."),
  recommendation: z.string().describe("The explicit recommendation (e.g., 'Strong Buy')."),
  shortTermTarget: z.number().describe('The price target calculated by the deterministic momentum model.'),
  rsi: z.string().describe("The latest RSI value and its state (e.g., 'RSI is 65 (Bullish)')."),
  macd: z.string().describe("The state of the MACD indicator (e.g., 'A bullish crossover just occurred')."),
  trends: z.string().describe("The alignment of short, medium, and long-term trends (e.g., 'Short, medium, and long-term trends are all bullish')."),
  volume: z.string().describe("The recent volume trend (e.g., 'Recent volume is high on a positive day (Accumulation)')."),
  volatility: z.number().describe('The 30-day annualized historical volatility percentage.'),
  pivots: z.object({
    r1: z.number(),
    s1: z.number(),
  }).optional().describe('Key short-term resistance (R1) and support (S1) pivot points.'),
  fibonacci: z.object({
    level618: z.number(),
    level382: z.number(),
  }).optional().describe('Key Fibonacci retracement levels for resistance (61.8%) and support (38.2%).'),
});
export type SummarizeTechnicalAnalysisInput = z.infer<typeof SummarizeTechnicalAnalysisInputSchema>;

const SummarizeTechnicalAnalysisOutputSchema = z.object({
  summary: z.string().describe("A descriptive passage of about 150 words summarizing the asset's technical posture."),
});
export type SummarizeTechnicalAnalysisOutput = z.infer<typeof SummarizeTechnicalAnalysisOutputSchema>;

export async function summarizeTechnicalAnalysis(
  input: SummarizeTechnicalAnalysisInput
): Promise<SummarizeTechnicalAnalysisOutput> {
  return summarizeTechnicalAnalysisFlow(input);
}

const summarizeTechnicalAnalysisPrompt = ai.definePrompt({
  name: 'summarizeTechnicalAnalysisPrompt',
  input: { schema: SummarizeTechnicalAnalysisInputSchema },
  output: { schema: SummarizeTechnicalAnalysisOutputSchema },
  prompt: `You are an expert financial analyst, skilled at providing clear and concise technical summaries for investors. Your task is to write a descriptive analytic passage of about 150 words summarizing the technical posture of {{ticker}}.

**Current State:**
*   **Ticker:** {{ticker}}
*   **Price:** {{currentPrice}}
*   **Momentum Signal:** "{{momentumSignal}}" (Recommendation: {{recommendation}})
*   **Calculated Target:** {{shortTermTarget}}
*   **30-Day Volatility:** {{volatility}}%

**Key Technical Drivers:**
*   **Trends:** {{trends}}
*   **RSI:** {{rsi}}
*   **MACD:** {{macd}}
*   **Volume:** {{volume}}
{{#if pivots}}
*   **Key Levels:** Immediate resistance is near the R1 pivot at {{pivots.r1}}, with support at the S1 pivot around {{pivots.s1}}.
{{/if}}
{{#if fibonacci}}
*   **Fibonacci Levels:** Significant Fibonacci resistance is at {{fibonacci.level618}} and support is at {{fibonacci.level382}}.
{{/if}}


**Instructions:**

1.  **Synthesize, Don't List:** Weave the data points above into a professional, narrative summary. Do not just list the indicators.
2.  **Start with the Big Picture:** Begin with the overall momentum signal and recommendation as your headline.
3.  **Explain the "Why":** Explain what's driving the signal. Is it strong trend alignment? A recent MACD crossover? High volume confirmation?
4.  **Incorporate Price Context:** Mention the current price and the calculated target. Frame the key pivot and Fibonacci levels as the immediate hurdles (resistance) or safety nets (support) on the path to that target.
5.  **Mention Volatility:** Briefly touch on the volatility to give context on how stable or erratic the price action has been.
6.  **Maintain a Professional Tone:** Use analytical language (e.g., "posture," "conviction," "reinforces," "suggests").
7.  **Strict Word Count:** Keep the summary to approximately 150 words.

Generate the 'summary' now.
`,
});

const summarizeTechnicalAnalysisFlow = ai.defineFlow(
  {
    name: 'summarizeTechnicalAnalysisFlow',
    inputSchema: SummarizeTechnicalAnalysisInputSchema,
    outputSchema: SummarizeTechnicalAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeTechnicalAnalysisPrompt(input);
    return output!;
  }
);
