
export type MarketData = {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export type FetchResult = {
  data?: MarketData[] | null;
  currency?: string | null;
  region?: string | null;
  error?: string | null;
}

export type RsiData = {
  date: string;
  RSI: string | null;
}

export type RocData = {
  date:string;
  'ROC': string | null;
}

export type MacdData = {
  date: string;
  'MACD_Hist': string | null;
  'MACD_Signal': string | null;
  'MACD': string | null;
}

export type BbandsData = {
    date: string;
    'Real Upper Band': string | null;
    'Real Lower Band': string | null;
    'Real Middle Band': string | null;
}

export type MomentumAnalysisInput = {
  ticker: string;
  isRocPositive: boolean;
  priceAboveMiddleBand: boolean;
  isBBSqueezing: boolean;
  breakoutSignal: "above_upper" | "below_lower" | "none";
  isRsiBullish: boolean;
  divergence: "bullish" | "bearish" | "none";
  isVolumeUp: boolean;
  isUpDay: boolean;
  isMacdBullish: boolean;
  isMacdCrossoverBullish: boolean;
};

export type OptionStrategy = {
  name: string;
  rationale: string;
};

export type OptionStrategySuggestion = {
  strategies: OptionStrategy[];
  disclaimer: string;
};

export type NewsArticle = {
  title: string;
  url: string;
  time_published: string;
  summary: string;
  banner_image: string;
  source: string;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment: {
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }[];
}

export type NewsSentimentData = {
  articles?: NewsArticle[];
  error?: string;
}

export type NewsAnalysis = {
    analysis: string;
    impact: "Bullish" | "Bearish" | "Neutral";
}

export type IndicatorPeriods = {
  roc: number;
  rsi: number;
  macd: {
    fast: number;
    slow: number;
    signal: number;
  };
  bbands: {
    period: number;
    stdDev: number;
  };
};

    