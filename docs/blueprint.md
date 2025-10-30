# **App Name**: Market Data Retriever

## Core Features:

- Ticker Input: Allow users to input a stock ticker symbol.
- Data Retrieval: Fetch end-of-day market data from external APIs based on the inputted ticker, prioritizing stockanalysis.com if available, falling back to alphavantage.co for supplementary info.
- Data Display: Display the retrieved market data in a table format with columns for date, open, high, low, close, and volume.
- Error Handling: Display appropriate error messages when a ticker symbol is invalid or when no data is found.
- API Key Management: Manage API keys securely to be used with alphavantage.co
- Suggested Data Exploration: Based on an inputted ticker, use an LLM tool to offer reasonable, related, specific follow-up questions a user might ask about this security, considering recent news, analyst opinions, and typical investor interests. Focus on variety; don't just repeat the same type of query.

## Style Guidelines:

- Primary color: Navy blue (#2E3192) to convey trustworthiness and stability.
- Background color: Light gray (#F0F0F0), near-white to provide a clean and neutral backdrop.
- Accent color: Teal (#008080) to highlight interactive elements and important data points.
- Body font: 'Inter' (sans-serif) for a modern, readable interface. Headline Font: 'Space Grotesk' for a computerized, techy, scientific feel
- Use clear and simple icons to represent different data metrics and functionalities.
- Maintain a clean and organized layout, prioritizing readability and ease of navigation.
- Use subtle transitions and animations to provide feedback on user interactions.