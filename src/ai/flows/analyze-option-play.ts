'use server';

/**
 * @fileOverview A Genkit flow to provide a contextual analysis of a user-described stock option play.
 *
 * - analyzeOptionPlay - A function that provides a contextual assessment of an option play based on momentum and volatility.
 * - AnalyzeOptionPlayInput - The input type for the analyzeOptionPlay function.
 * - AnalyzeOptionPlayOutput - The output type for the analyzeOptionPlay function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const AnalyzeOptionPlayInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol for the option play.'),
  playDescription: z.string().describe('A user-written description of an options trade they are considering.'),
  momentumSignal: z.string().describe("The current calculated momentum signal for the stock (e.g., 'STRONG BULLISH')."),
  volatility: z.number().describe("The stock's 30-day annualized historical volatility percentage."),
});
export type AnalyzeOptionPlayInput = z.infer<typeof AnalyzeOptionPlayInputSchema>;

const AnalyzeOptionPlayOutputSchema = z.object({
  contextualAssessment: z.string().describe("A 2-3 sentence contextual assessment of the play, explaining how it aligns with the provided momentum and volatility data."),
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
  prompt: `You are an expert options trading coach. A user is describing a potential option play for {{ticker}}.
Your task is to provide a concise, 2-3 sentence contextual assessment. Do not give financial advice.

**User's Play:**
"{{playDescription}}"

**Market Context for {{ticker}}:**
*   **Momentum Signal:** "{{momentumSignal}}"
*   **30-Day Volatility:** {{volatility}}% (Consider >40% as high, <20% as low)

**Your Analysis (Thought Process):**
1.  **Identify the User's Bias:** Does the user's play bet on the price going up (bullish), down (bearish), or sideways (neutral)?
2.  **Check for Alignment:** Does the user's bias align with the provided **Momentum Signal**?
    *   *If it aligns:* Start by saying something like "This bullish play aligns well with the current bullish momentum..."
    *   *If it misaligns:* Start by saying something like "This bullish play is contrary to the current bearish momentum, making it a contrarian bet..."
3.  **Add Volatility Context:** How does the current **Volatility** affect the play?
    *   *For buying options (debit plays):* Mention if high volatility makes the play expensive or low volatility makes it cheaper. (e.g., "...however, be aware that high volatility makes buying these options relatively expensive.")
    *   *For selling options (credit plays):* Mention if high volatility results in a higher premium received, or if low volatility results in a lower one. (e.g., "...and the high volatility environment means you would collect a significant premium for selling this put.")

**Example (User wants to buy a call, momentum is 'STRONG BULLISH', volatility is 18%):**
"This bullish strategy aligns well with the strong bullish momentum signal. The low volatility environment is also favorable, as it makes buying these calls relatively inexpensive."

Generate the 'contextualAssessment' based on this logic.
`,
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
