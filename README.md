# fbtechin: AI-Powered Market Data Analyzer

An advanced, AI-driven financial analysis tool built with **Next.js**, **Genkit**, and **Tailwind CSS**. This application provides real-time market data retrieval, deep technical analysis, and probabilistic forecasting using Google Gemini models.

## 🚀 Key Features

### 📊 Supported Market Data (via Alpha Vantage)
- **Global Stocks**: Daily historical data for thousands of global tickers (Compact 100-day mode by default).
- **Forex (FX)**: Major and minor currency pair tracking (e.g., EURUSD).
- **Cryptocurrencies**: Digital asset performance data paired with USD (e.g., BTCUSD).
- **Market News**: Real-time news feed with ticker-specific sentiment scores.

### 📉 Probabilistic & Technical Analysis
- **10,000 Path Monte Carlo Simulations**: Probabilistic 30-day price forecasting based on drift and volatility.
- **AI Momentum Scoring**: A multi-factor deterministic model synthesized by Google Gemini.
- **Advanced Multi-Pane Charting**: Synchronized price, volume, MACD, and RSI charts with study overlays (EMA, SMA, BBands).
- **Live Price Simulation**: Manually adjust prices to see how technicals and targets react instantly.

### 🤖 Generative AI Insights (Powered by Genkit)
- **AI-Driven Trade Ideas**: Contextualized trade strategies (Primary, Alternative, and Lotto Ticket) synthesized from momentum and volatility models.
- **News Divergence Analysis**: Detects if news sentiment confirms or diverges from technical indicators.
- **Option Play Sandbox**: Build custom multi-leg option strategies and receive instant AI feedback on alignment with market context.

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
2. `cd fbtechin`
3. `npm install`
4. Create a `.env` file in the root and add:
   ```env
   ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
   GEMINI_API_KEY=your_google_ai_key
   ```
5. `npm run dev`

## ☁️ Web Deployment (Step-by-Step)

To deploy **fbtechin** live using **Firebase App Hosting**:

1. **Commit and Push**: Ensure your latest code is pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "Deployment ready"
   git push origin main
   ```
2. **Firebase Console**: Go to the **[Firebase Console](https://console.firebase.google.com/)**.
3. **App Hosting**: 
   - Select your project.
   - Navigate to **App Hosting** in the left sidebar.
   - Click **Get Started** and connect your GitHub account.
   - Select the `fbtechin` repository and the `main` branch.
4. **Environment Variables**:
   - In the App Hosting setup/settings, navigate to the **Environment Variables** tab.
   - Add the following keys (these are required for the app to function):
     - `ALPHAVANTAGE_API_KEY`: Your Alpha Vantage key.
     - `GEMINI_API_KEY`: Your Google AI key.
5. **Rollout**: Firebase will automatically detect your Next.js project, build it, and deploy it to a live URL.

## 🛡️ Disclaimer
This application is for educational purposes only. It does not constitute financial advice. Options trading involves significant risk.
