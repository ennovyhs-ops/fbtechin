

import type { AnalyzeStockMomentumOutput } from "@/ai/flows/analyze-stock-momentum";
import type { PredictPriceTargetOutput as PredictPriceTargetOutputFlow } from "@/ai/flows/predict-price-target";
import type { SynthesizeTradeIdeaOutput as SynthesizeTradeIdeaOutputFlow } from "@/ai/flows/synthesize-trade-idea";
import type { SummarizeTechnicalAnalysisOutput as SummarizeTechnicalAnalysisOutputFlow } from "@/ai/flows/summarize-technical-analysis";

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
  error?: string | null;
  url?: string;
  region?: string | null;
  currency?: string | null;
}

export type RsiData = {
  date: string;
  RSI: string | null;
}

export type RocData = {
  date:string;
  ROC: string | null;
}

export type MacdData = {
  date: string;
  MACD_Hist: string | null;
  MACD_Signal: string | null;
  MACD: string | null;
}

export type BbandsData = {
    date: string;
    'Real Upper Band': string | null;
    'Real Lower Band': string | null;
    'Real Middle Band': string | null;
}

export type MAVolData = {
  date: string;
  volume: string;
  MAVol: string | null;
}

export type VwmaData = {
    date: string;
    VWMA: string | null;
}

export type EmaData = {
  date: string;
  EMA: string | null;
}

export type ObvData = {
    date: string;
    OBV: string | null;
}

export type StochasticData = {
    date: string;
    k: string | null;
    d: string | null;
}

export type CmfData = {
    date: string;
    CMF: string | null;
}

export type NewsArticle = {
  title: string;
  url:string;
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
    impact: "Bullish" | "Bearish" | "Neutral";
    divergenceAnalysis: string;
    newsSummary: string;
}

export type IndicatorPeriods = {
  ema: number;
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
  maVol: number;
  vwma: number;
  stochastic: {
      kPeriod: number;
      kSlowing: number;
      dSlowing: number;
  };
  cmf: number;
};

export type MonteCarloResult = {
    probableRange: { lower: number, upper: number };
    averageTarget: number;
    confidence: number;
} | null

export type PredictPriceTargetOutput = PredictPriceTargetOutputFlow;

export type CombinedAnalysisResult = {
  analysis: AnalyzeStockMomentumOutput | null;
  prediction: PredictPriceTargetOutput | { error: string } | null;
  prevAnalysis?: (AnalyzeStockMomentumOutput | {error: string}) | null;
  error?: string;
}

export type SynthesizeTradeIdeaOutput = SynthesizeTradeIdeaOutputFlow;

export type SummarizeTechnicalAnalysisOutput = SummarizeTechnicalAnalysisOutputFlow;
