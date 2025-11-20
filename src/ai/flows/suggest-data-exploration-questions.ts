
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
  prompt: `You are an expert financial analyst. Your task is to generate five insightful, specific, and non-generic follow-up questions for a user researching the stock ticker "{{ticker}}".

**Instructions for Question Quality:**
1.  **Be Specific & Deep:** The questions should prompt deeper investigation.
    -   **Good Example:** "How does {{ticker}}'s revenue growth over the last two years compare to its main competitors?"
    -   **Bad Example (Too Generic):** "What is {{ticker}}'s revenue?"
2.  **Avoid Basic, Obvious Questions:** Do NOT ask simple questions that can be answered with a single number.
    -   **Bad Example:** "What is the stock price of {{ticker}}?"
    -   **Bad Example:** "What is the market cap for {{ticker}}?"
3.  **Avoid Giving Financial Advice:** Frame questions for exploration, not as a recommendation.
    -   **Bad Example:** "Should I buy {{ticker}} stock?"
    -   **Good Example:** "What are the main risks and opportunities facing {{ticker}} in the next year?"
4.  **Focus on Variety:** Cover different topics like valuation, competitive landscape, growth drivers, profitability, and risks.

Generate five questions based on these rules. Return the questions as a JSON array of strings.`,
});

const suggestDataExplorationQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestDataExplorationQuestionsFlow',
    inputSchema: SuggestDataExplorationQuestionsInputSchema,
    outputSchema: SuggestDataExplorationQuestionsOutputSchema,
  },
  async input => {
    const { output } = await suggestDataExplorationQuestionsPrompt(input);
    return output!;
  }
);
