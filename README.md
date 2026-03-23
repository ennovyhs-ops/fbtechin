# AI-Powered Market Data Analyzer (fbeasy)

An advanced, AI-driven financial analysis tool built with Next.js, Genkit, and Tailwind CSS. This application provides real-time market data retrieval, deep technical analysis, and probabilistic forecasting using Google Gemini models.

## 🚀 Features

- **AI Momentum Scoring**: A proprietary deterministic model synthesized by Google Gemini to provide a clear Bullish/Bearish signal.
- **Advanced Multi-Pane Charting**: Stacked interactive charts with Price/Volume, MACD, and RSI panes synchronized by date.
- **Technical Overlays**: Toggleable Bollinger Bands, EMA 9, EMA 20, SMA 50, and SMA 200 directly on the price chart.
- **Monte Carlo Simulations**: Probabilistic 30-day price forecasting based on 5,000+ simulated paths.
- **AI-Driven Trade Ideas**: Contextualized trade strategies (Standard, Alternative, and "Lotto") synthesized from momentum and volatility models.
- **News Sentiment & Divergence**: AI-powered news analysis that detects if sentiment confirms or diverges from technical indicators.
- **Customizable Indicators**: Real-time browser-side recalculation of RSI, MACD, and other indicators with user-defined periods.
- **Option Play Sandbox**: Build and analyze custom multi-leg option strategies with instant AI feedback.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **AI Engine**: [Genkit 1.x](https://github.com/firebase/genkit) with Google AI (Gemini 1.5 Flash)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Data Source**: Alpha Vantage API
- **Language**: TypeScript

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- An [Alpha Vantage API Key](https://www.alphavantage.co/support/#api-key)
- A [Google AI API Key](https://aistudio.google.com/app/apikey) (for Gemini/Genkit)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ennovyhs-ops/fbeasy.git
   cd fbeasy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
