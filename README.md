# fbtechin: AI-Powered Market Data Analyzer

An advanced, AI-driven financial analysis tool built with **Next.js**, **Genkit**, and **Tailwind CSS**. This application provides real-time market data retrieval, deep technical analysis, and probabilistic forecasting using Google Gemini models.

## 🚀 Key Features

### 📊 Advanced Technical Analysis
- **AI Momentum Scoring**: A proprietary deterministic model synthesized by Google Gemini to provide a clear Bullish/Bearish signal with historical comparison.
- **Advanced Multi-Pane Charting**: Stacked interactive charts with Price/Volume, MACD, and RSI panes synchronized by date for precision analysis.
- **Technical Overlays**: Toggleable Bollinger Bands, EMA 9, EMA 20, SMA 50, and SMA 200 directly on the price chart.
- **Customizable Indicators**: Real-time browser-side recalculation of RSI, MACD, and other indicators with user-defined periods.

### 🤖 Generative AI Insights (Powered by Genkit)
- **AI-Driven Trade Ideas**: Contextualized trade strategies (Standard, Alternative, and "Lotto") synthesized from momentum and volatility models.
- **Signal Explainer**: Natural language explanations of complex technical indicator alignments.
- **News Sentiment & Divergence**: AI-powered news analysis that detects if market sentiment confirms or diverges from technical indicators.
- **Option Play Sandbox**: Build custom multi-leg option strategies and receive instant AI feedback on alignment with market context.

### 📉 Probabilistic Forecasting
- **Monte Carlo Simulations**: Probabilistic 30-day price forecasting based on 10,000+ simulated paths to visualize risk and reward.
- **Price Target Projections**: Short-term and long-term targets calculated using ATR-based volatility and trend persistence.

## ⚠️ Data Limits & API Information

- **API Source**: All live data is fetched via the Alpha Vantage API.
- **100-Day Limit**: For stock tickers, the application fetches the last **100 trading days** (approx. 5 months) of data to remain compatible with the free API tier.
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
- A [Google AI API Key](https://aistudio.google.com/app/apikey) (for Gemini/Genkit)

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
