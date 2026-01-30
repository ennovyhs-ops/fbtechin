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
  advantages: z.array(z.string()).describe("A list of 1-2 potential advantages of the described play's structure."),
  disadvantages: z.array(z.string()).describe("A list of 1-2 potential disadvantages or risks of the described play's structure."),
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
Your task is to provide a concise, multi-part analysis. Do not give financial advice.

**User's Play:**
"{{playDescription}}"

**Market Context for {{ticker}}:**
*   **Momentum Signal:** "{{momentumSignal}}"
*   **30-Day Volatility:** {{volatility}}% (Consider >40% as high, <20% as low)

---

**Part 1: Contextual Assessment**
First, generate the 'contextualAssessment'. This should be a 2-3 sentence assessment of how the user's play fits the current market context.
*   **Identify Bias:** Does the play seem bullish, bearish, or neutral?
*   **Check Alignment:** Does the bias align with the **Momentum Signal**? (e.g., "This bullish play aligns well with the current bullish momentum...")
*   **Add Volatility Context:** How does the **Volatility** affect the play? (e.g., "...however, be aware that high volatility makes buying these options relatively expensive.")

**Example Contextual Assessment (User wants to buy a call, momentum is 'STRONG BULLISH', volatility is 18%):**
"This bullish strategy aligns well with the strong bullish momentum signal. The low volatility environment is also favorable, as it makes buying these calls relatively inexpensive."

---

**Part 2: General Advantages & Disadvantages**
Next, based on the user's play description, identify the general structure of the strategy (e.g., it looks like a long call, a credit spread, etc.). Generate 1-2 'advantages' and 1-2 'disadvantages' inherent to that *type* of strategy. These should be educational and general, not specific to the current {{ticker}} price.

**Example (User's play is a Long Call):**
*   **advantages**: ["Benefit from unlimited profit potential if the stock rises significantly.", "Risk is strictly limited to the premium paid for the call."]
*   **disadvantages**: ["The option will lose value over time due to time decay (theta).", "Requires the stock to move up enough to cover the cost of the premium to be profitable."]

**Example (User's play is a Covered Call):**
*   **advantages**: ["Generates income from the premium received.", "Provides a small buffer against a drop in the stock price."]
*   **disadvantages**: ["Caps the potential profit on the stock if it rises significantly above the strike price.", "Still exposes you to significant downside risk on the stock, minus the premium received."]

---

Generate the full JSON output including 'contextualAssessment', 'advantages', and 'disadvantages' based on this logic.
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
