# fbtechin: AI-Powered Market Data Analyzer

An advanced, AI-driven financial analysis tool built with **Next.js**, **Genkit**, and **Tailwind CSS**. This application provides real-time market data retrieval, deep technical analysis, and probabilistic forecasting using Google Gemini models.

## 🚀 Key Features

### 📊 Supported Market Data (via Alpha Vantage)
- **Global Stocks**: Daily historical data for thousands of global tickers.
- **Forex (FX)**: Major and minor currency pair tracking (e.g., EURUSD).
- **Cryptocurrencies**: Digital asset performance data paired with USD.
- **Market News**: Real-time news feed with ticker-specific sentiment scores.

### 📉 Probabilistic & Technical Analysis
- **10,000 Path Monte Carlo Simulations**: Probabilistic 30-day price forecasting to visualize potential risk and reward.
- **AI Momentum Scoring**: A multi-factor deterministic model synthesized by Google Gemini to provide a clear Bullish/Bearish signal.
- **Advanced Multi-Pane Charting**: Synchronized price, volume, MACD, and RSI charts with toggleable overlays (Bollinger Bands, EMA, SMA).
- **Price Target Projections**: Short-term and long-term targets calculated using ATR-based volatility and trend persistence models.

### 🤖 Generative AI Insights (Powered by Genkit)
- **AI-Driven Trade Ideas**: Contextualized trade strategies synthesized from momentum and volatility models.
- **News Divergence Analysis**: Detects if news sentiment confirms or diverges from technical indicators.
- **Signal Explainer**: Natural language explanations of complex indicator alignments.
- **Option Play Sandbox**: Build custom multi-leg option strategies and receive instant AI feedback.

## ⚠️ Data Source & API Limits

- **API Source**: All live data is fetched via the Alpha Vantage API.
- **100-Day Limit**: To ensure compatibility with the free API tier, the application fetches the last **100 trading days** (approx. 5 months) of data for stock tickers.
- **Extended History**: If you require a full year of data for 52-Week Range analysis, please use the **Upload File** feature (supporting CSV, XLS, XLSX).

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
- A [Google AI API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ennovyhs-ops/fbtechin.git
   cd fbtechin
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🛡️ Disclaimer

This application is for educational and informational purposes only. It does not constitute financial advice. Trading involves significant risk, and you should consult with a qualified financial advisor before making any investment decisions.

## 📄 License

This project is licensed under the MIT License.
