'use server';

/**
 * @fileOverview This file defines a Genkit flow to retrieve a company's name, exchange, and currency from its stock ticker.
 *
 * - getAssetInfo - A function that takes a stock ticker and returns its associated information.
 * - GetAssetInfoInput - The input type for the function.
 * - GetAssetInfoOutput - The output type for the function.
 */

import { ai } from '@/ai/index';
import { z } from 'zod';

const GetAssetInfoInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
});
export type GetAssetInfoInput = z.infer<typeof GetAssetInfoInputSchema>;

const GetAssetInfoOutputSchema = z.object({
  companyName: z.string().describe("The full legal name of the company associated with the ticker. If the ticker is for a currency, crypto, or index, this should be a descriptive name (e.g., 'S&P 500 Index', 'Euro/US Dollar', 'Bitcoin'). If the name cannot be found, return an empty string.").optional(),
  exchange: z.string().describe("The primary stock exchange where this asset trades (e.g., 'NASDAQ', 'NYSE', 'HKEX'). For currencies or crypto, this can be 'Forex' or 'Crypto'. If unknown, return an empty string.").optional(),
  currency: z.string().describe("The 3-letter ISO code for the currency the asset is traded in (e.g., 'USD', 'HKD', 'EUR'). If unknown, return an empty string.").optional(),
});
export type GetAssetInfoOutput = z.infer<typeof GetAssetInfoOutputSchema>;

export async function getAssetInfo(
  input: GetAssetInfoInput
): Promise<GetAssetInfoOutput> {
  return getAssetInfoFlow(input);
}

const getAssetInfoPrompt = ai.definePrompt({
  name: 'getAssetInfoPrompt',
  input: { schema: GetAssetInfoInputSchema },
  output: { schema: GetAssetInfoOutputSchema },
  prompt: `For the stock ticker "{{ticker}}", provide the following information:
  
1.  **companyName**: The full company name.
2.  **exchange**: The primary stock exchange it trades on (e.g., NASDAQ, NYSE).
3.  **currency**: The 3-letter ISO currency code for that exchange (e.g., USD, EUR, HKD).

If the ticker is for a well-known index (like SPY, QQQ), provide the index name, the exchange it trades on, and the currency.
If it's a currency pair (like EURUSD), use the pair name for companyName, 'Forex' for exchange, and the 'to' currency for the currency field.
If it's a cryptocurrency (like BTCUSD), use the asset name for companyName, 'Crypto' for exchange, and the 'to' currency for the currency field.

If you cannot determine any of this information, return an empty string for the respective field. Do not invent information.`,
});

const getAssetInfoFlow = ai.defineFlow(
  {
    name: 'getAssetInfoFlow',
    inputSchema: GetAssetInfoInputSchema,
    outputSchema: GetAssetInfoOutputSchema,
  },
  async (input) => {
    // For common currency/crypto/index pairs, we can bypass the AI to save time and resources.
    const ticker = input.ticker.toUpperCase();
    if (ticker === 'EURUSD') return { companyName: 'Euro/US Dollar', exchange: 'Forex', currency: 'USD' };
    if (ticker === 'BTCUSD') return { companyName: 'Bitcoin', exchange: 'Crypto', currency: 'USD' };
    if (ticker === 'ETHUSD') return { companyName: 'Ethereum', exchange: 'Crypto', currency: 'USD' };
    if (ticker === 'SPY') return { companyName: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE ARCA', currency: 'USD' };
    if (ticker === 'QQQ') return { companyName: 'Invesco QQQ Trust', exchange: 'NASDAQ', currency: 'USD' };
    
    const { output } = await getAssetInfoPrompt(input);
    return output || { companyName: '', exchange: '', currency: '' };
  }
);
