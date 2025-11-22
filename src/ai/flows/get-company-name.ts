
'use server';

/**
 * @fileOverview This file defines a Genkit flow to retrieve a company's name from its stock ticker.
 *
 * - getCompanyName - A function that takes a stock ticker and returns the company name.
 * - GetCompanyNameInput - The input type for the function.
 * - GetCompanyNameOutput - The output type for the function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const GetCompanyNameInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
});
export type GetCompanyNameInput = z.infer<typeof GetCompanyNameInputSchema>;

const GetCompanyNameOutputSchema = z.object({
  companyName: z.string().describe("The full legal name of the company associated with the ticker. If the ticker is for a currency, crypto, or index, this should be a descriptive name (e.g., 'S&P 500 Index', 'Euro/US Dollar', 'Bitcoin'). If the name cannot be found, return an empty string.").optional(),
});
export type GetCompanyNameOutput = z.infer<typeof GetCompanyNameOutputSchema>;

export async function getCompanyName(
  input: GetCompanyNameInput
): Promise<GetCompanyNameOutput> {
  return getCompanyNameFlow(input);
}

const getCompanyNamePrompt = ai.definePrompt({
  name: 'getCompanyNamePrompt',
  input: { schema: GetCompanyNameInputSchema },
  output: { schema: GetCompanyNameOutputSchema },
  prompt: `What is the full company name for the stock ticker "{{ticker}}"? 
  
If the ticker is for a well-known index like SPY or QQQ, provide the index name.
If the ticker is for a currency pair like EURUSD, provide the pair name (e.g., Euro/US Dollar).
If the ticker is for a cryptocurrency like BTCUSD, provide the asset name (e.g., Bitcoin).
If you cannot determine the name, return an empty string for the companyName field.
Do not invent names.`,
});

const getCompanyNameFlow = ai.defineFlow(
  {
    name: 'getCompanyNameFlow',
    inputSchema: GetCompanyNameInputSchema,
    outputSchema: GetCompanyNameOutputSchema,
  },
  async (input) => {
    // For common currency/crypto pairs, we can bypass the AI to save time and resources.
    if (input.ticker === 'EURUSD') return { companyName: 'Euro/US Dollar' };
    if (input.ticker === 'BTCUSD') return { companyName: 'Bitcoin' };
    if (input.ticker === 'ETHUSD') return { companyName: 'Ethereum' };
    if (input.ticker === 'SPY') return { companyName: 'SPDR S&P 500 ETF Trust' };
    if (input.ticker === 'QQQ') return { companyName: 'Invesco QQQ Trust' };
    
    const { output } = await getCompanyNamePrompt(input);
    return output || { companyName: '' };
  }