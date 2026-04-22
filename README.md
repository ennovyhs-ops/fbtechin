
# fbtechin: AI-Powered Market Data Analyzer

An advanced, AI-driven financial analysis tool built with **Next.js**, **Genkit**, and **Tailwind CSS**. This application provides real-time market data retrieval, deep technical analysis, and probabilistic forecasting using Google Gemini models.

## 🚀 Key Features

### 📊 Supported Market Data (via Alpha Vantage)
- **Global Stocks**: Daily historical data for thousands of global tickers.
- **Forex (FX)**: Major and minor currency pair tracking (e.g., EURUSD).
- **Cryptocurrencies**: Digital asset performance data paired with USD.
- **Market News**: Real-time news feed with ticker-specific sentiment scores.

### 📉 Probabilistic & Technical Analysis
- **10,000 Path Monte Carlo Simulations**: Probabilistic 30-day price forecasting.
- **AI Momentum Scoring**: A multi-factor deterministic model synthesized by Google Gemini.
- **Advanced Multi-Pane Charting**: Synchronized price, volume, MACD, and RSI charts.
- **Live Price Simulation**: Manually adjust prices to see how technicals and targets react instantly.

### 🤖 Generative AI Insights (Powered by Genkit)
- **AI-Driven Trade Ideas**: Contextualized trade strategies synthesized from momentum and volatility models.
- **News Divergence Analysis**: Detects if news sentiment confirms or diverges from technical indicators.
- **Option Play Sandbox**: Build custom multi-leg option strategies and receive instant AI feedback.

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **AI Engine**: Genkit 1.x with Google AI (Gemini 1.5 Flash)
- **Styling**: Tailwind CSS & Shadcn UI
- **Deployment**: Firebase App Hosting

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- [Alpha Vantage API Key](https://www.alphavantage.co/support/#api-key)
- [Google AI API Key](https://aistudio.google.com/app/apikey)

### Installation
1. `git clone https://github.com/ennovyhs-ops/fbtechin.git`
2. `npm install`
3. Create `.env` with `ALPHAVANTAGE_API_KEY` and `GEMINI_API_KEY`.
4. `npm run dev`

## ☁️ Deployment

To deploy this app as a live web app:

1. **Push your code** to your GitHub repository (`fbtechin`).
2. Go to the **[Firebase Console](https://console.firebase.google.com/)**.
3. Select your project and navigate to **App Hosting**.
4. Click **Get Started** and connect your GitHub repository.
5. Set your environment variables (`ALPHAVANTAGE_API_KEY`, `GEMINI_API_KEY`) in the App Hosting settings.
6. Firebase will automatically build and deploy your app to a live URL.

## 🛡️ Disclaimer
This application is for educational purposes only. It does not constitute financial advice.
