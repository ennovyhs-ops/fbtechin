'use server';

/**
 * @fileOverview This file defines a Genkit flow to analyze the impact of recent news on a stock.
 *
 * - analyzeNewsImpact - A function that takes a stock ticker and news articles and returns an AI-driven analysis.
 * - AnalyzeNewsImpactInput - The input type for the analyzeNewsImpact function.
 * - AnalyzeNewsImpactOutput - The output type for the analyzeNewsImpact function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const AnalyzeNewsImpactInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  news: z.array(z.object({
    title: z.string(),
    summary: z.string(),
  })).describe('An array of recent news articles, each with a title and summary.'),
});
export type AnalyzeNewsImpactInput = z.infer<typeof AnalyzeNewsImpactInputSchema>;

const AnalyzeNewsImpactOutputSchema = z.object({
  analysis: z.string().describe("A concise summary of the news analysis, explaining the potential impact on the stock."),
  impact: z.enum(["Bullish", "Bearish", "Neutral"]).describe("The overall predicted impact based on the news.")
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
  prompt: `You are an expert financial analyst providing a brief, insightful summary for an investor. Your task is to analyze the following news articles for the stock ticker {{ticker}} and determine the likely short-term impact.

**News Articles:**
{{#each news}}
- **{{title}}**: {{summary}}
{{/each}}

**Instructions:**
1.  Synthesize the key information from the provided articles.
2.  Consider the current general economic environment (e.g., inflation, interest rates, market sentiment) as context. Do not assume you need to look up real-time data; use your general knowledge.
3.  Based on the news and economic context, write a concise 'analysis' (2-3 sentences) explaining the potential effect on the stock.
4.  Determine the overall 'impact' as "Bullish", "Bearish", or "Neutral".
5.  Your tone should be professional, cautious, and objective. Avoid making definitive predictions. Focus on the *potential* impact.
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
