
'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest relevant follow-up questions about a given stock ticker using generative AI.
 *
 * - suggestDataExplorationQuestions - A function that takes a stock ticker as input and returns a list of suggested follow-up questions.
 * - SuggestDataExplorationQuestionsInput - The input type for the suggestDataExplorationQuestions function.
 * - SuggestDataExplorationQuestionsOutput - The output type for the suggestDataExplorationQuestions function.
 */

import {ai} from '@/ai/index';
import {z} from 'genkit';

const SuggestDataExplorationQuestionsInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  recentNews: z.array(z.string()).optional().describe('An array of recent news headlines for the stock.'),
});
export type SuggestDataExplorationQuestionsInput = z.infer<
  typeof SuggestDataExplorationQuestionsInputSchema
>;

const SuggestDataExplorationQuestionsOutputSchema = z.object({
  questions: z
    .array(z.string())
    .describe('An array of suggested follow-up questions about the stock.'),
});
export type SuggestDataExplorationQuestionsOutput = z.infer<
  typeof SuggestDataExplorationQuestionsOutputSchema
>;

export async function suggestDataExplorationQuestions(
  input: SuggestDataExplorationQuestionsInput
): Promise<SuggestDataExplorationQuestionsOutput> {
  return suggestDataExplorationQuestionsFlow(input);
}

const suggestDataExplorationQuestionsPrompt = ai.definePrompt({
  name: 'suggestDataExplorationQuestionsPrompt',
  input: {schema: SuggestDataExplorationQuestionsInputSchema},
  output: {schema: SuggestDataExplorationQuestionsOutputSchema},
  prompt: `You are an expert financial analyst. Given the stock ticker symbol "{{ticker}}", suggest five reasonable, related, specific follow-up questions a user might ask about this security.

{{#if recentNews}}
**Use the following recent news headlines to make your questions more timely and relevant:**
{{#each recentNews}}
- {{{this}}}
{{/each}}
{{/if}}

Consider typical investor interests like valuation, competitive landscape, future growth, and recent performance. Focus on variety; don't just repeat the same type of query. Return the questions as a JSON array of strings.`,
});

const suggestDataExplorationQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestDataExplorationQuestionsFlow',
    inputSchema: SuggestDataExplorationQuestionsInputSchema,
    outputSchema: SuggestDataExplorationQuestionsOutputSchema,
  },
  async input => {
    const {output} = await suggestDataExplorationQuestionsPrompt(input);
    return output!;
  }
);
