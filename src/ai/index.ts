/**
 * @fileoverview This file initializes and configures the Genkit AI instance.
 * It sets up the Google AI plugin with a default model that will be used
 * across all generative AI flows in the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * The global AI instance for the application.
 *
 * It is configured to use the Google AI plugin with 'gemini-pro' as the
 * default model for all generation requests. This ensures consistency and
 * reliability for all AI-powered features.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      // Specifies the default model to be used for all generation tasks.
      // 'gemini-pro' is a robust and widely supported model.
      model: 'gemini-pro',
    }),
  ],
});
