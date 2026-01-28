
'use server';

/**
 * @fileOverview A super-simplified Genkit flow to analyze a user-described stock option play.
 *
 * - analyzeOptionPlay - A function that provides a one-word assessment of an option play.
 * - AnalyzeOptionPlayInput - The input type for the analyzeOptionPlay function.
 * - AnalyzeOptionPlayOutput - The output type for the analyzeOptionPlay function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const AnalyzeOptionPlayInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol for the option play.'),
  playDescription: z.string().describe('A user-written description of an options trade they are considering.'),
});
export type AnalyzeOptionPlayInput = z.infer<typeof AnalyzeOptionPlayInputSchema>;

const AnalyzeOptionPlayOutputSchema = z.object({
  assessment: z.string().describe("A single-word assessment of the play's general character (e.g., 'Directional', 'Volatile', 'Income', 'Hedge', 'Speculative', 'Complex')."),
});
export type AnalyzeOptionPlayOutput = z.infer<typeof AnalyzeOptionPlayOutputSchema>;

export async function analyzeOptionPlay(
  input: AnalyzeOptionPlayInput
): Promise<AnalyzeOptionPlayOutput> {
  return analyzeOptionPlayFlow(input);
}

const analyzeOptionPlayPrompt = ai.definePrompt({
  name: 'analyzeOptionPlayPrompt',
  input: { schema: AnalyzeOptionPlayInputSchema },
  output: { schema: AnalyzeOptionPlayOutputSchema },
  prompt: `You are a financial analyst. A user is describing an option play on {{ticker}}.
Based on their description, provide a single-word assessment that best characterizes the nature of the play.

Choose from: 'Directional', 'Volatile', 'Income', 'Hedge', 'Speculative', 'Complex'.

User Description:
"{{playDescription}}"

Generate the JSON output.`,
});

const analyzeOptionPlayFlow = ai.defineFlow(
  {
    name: 'analyzeOptionPlayFlow',
    inputSchema: AnalyzeOptionPlayInputSchema,
    outputSchema: AnalyzeOptionPlayOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeOptionPlayPrompt(input);
    return output!;
  }
);
