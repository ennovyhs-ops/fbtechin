
'use server';

/**
 * @fileOverview This file defines a Genkit flow to analyze the impact of recent news on a stock,
 * including a divergence analysis against momentum and probabilistic models.
 *
 * - analyzeNewsImpact - A function that takes a stock ticker, news, momentum, and forecast data and returns an AI-driven analysis.
 * - AnalyzeNewsImpactInput - The input type for the analyzeNewsImpact function.
 * - AnalyzeNewsImpactOutput - The output type for the analyzeNewsimpact function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const AnalyzeNewsImpactInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  news: z.array(z.object({
    title: z.string(),
    summary: z.string(),
  })).describe('An array of recent news articles, each with a title and summary.'),
  momentumSignal: z.string().describe("The current calculated momentum signal for the stock (e.g., 'STRONG BULLISH')."),
  monteCarloRange: z.object({
      lower: z.number(),
      upper: z.number(),
  }).describe('The probable 30-day price range from a Monte Carlo simulation.')
});
export type AnalyzeNewsImpactInput = z.infer<typeof AnalyzeNewsImpactInputSchema>;

const AnalyzeNewsImpactOutputSchema = z.object({
  impact: z.enum(["Bullish", "Bearish", "Neutral"]).describe("The overall predicted impact based *only* on the news sentiment."),
  divergenceAnalysis: z.string().describe("A concise (2-3 sentences) analysis explaining if the news sentiment diverges from or confirms the provided momentum signal and Monte Carlo forecast. This is the core synthesis."),
  newsSummary: z.string().describe("A brief, 1-2 sentence summary of the key themes from the news articles.")
});
export type AnalyzeNewsImpactOutput = z.infer<typeof AnalyzeNewsImpactOutputSchema>;

export async function analyzeNewsImpact(
  input: AnalyzeNewsImpactInput
): Promise<AnalyzeNewsImpactOutput> {
  return analyzeNewsImpactFlow(input);
}

const analyzeNewsImpactPrompt = ai.definePrompt({
  name: 'analyzeNewsImpactPrompt',
  input: { schema: AnalyzeNewsImpactInputSchema },
  output: { schema: AnalyzeNewsImpactOutputSchema },
  prompt: `You are an expert financial analyst providing a brief, insightful summary for an investor. Your task is to analyze news articles for {{ticker}} and then perform a divergence analysis by comparing the news sentiment to the stock's current momentum and a probabilistic forecast.

**Analysis Steps:**

**Part 1: News-Only Sentiment**
First, analyze ONLY the following news articles. Based on these articles alone, determine if the sentiment is "Bullish", "Bearish", or "Neutral".
*   **News Articles:**
    {{#each news}}
    - **{{title}}**: {{summary}}
    {{/each}}
*   Write a 1-2 sentence 'newsSummary' of the key themes.
*   Set the 'impact' field to your determined sentiment ("Bullish", "Bearish", or "Neutral").

**Part 2: Divergence Analysis**
Now, compare your news-only sentiment from Part 1 with the following data. This is the most important part of your analysis.
*   **Calculated Momentum Signal:** "{{momentumSignal}}"
*   **Probabilistic Monte Carlo Forecast:** The price is expected to be between {{monteCarloRange.lower}} and {{monteCarloRange.upper}} in 30 days.

Synthesize these three pieces of information (News Sentiment, Momentum Signal, Monte Carlo Forecast) into a 2-3 sentence 'divergenceAnalysis'. Address the following:
*   **Agreement or Disagreement:** Does the news sentiment align with the momentum signal? (e.g., "The bullish news sentiment confirms the strong bullish momentum signal...")
*   **Divergence Insight:** If they diverge, what could it mean? (e.g., "Interestingly, the bearish news appears to be ignored by the market, as the momentum remains bullish, suggesting underlying strength..." or "Despite bullish news, the momentum is neutral, which could indicate the good news is already priced in.")
*   **Forecast Context:** How does the Monte Carlo forecast fit in? (e.g., "...and the probabilistic forecast supports further upside.")

Your tone should be professional and objective. Generate the final JSON output.
`,
});

const analyzeNewsImpactFlow = ai.defineFlow(
  {
    name: 'analyzeNewsImpactFlow',
    inputSchema: AnalyzeNewsImpactInputSchema,
    outputSchema: AnalyzeNewsImpactOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeNewsImpactPrompt(input);
    return output!;
  }
);

    