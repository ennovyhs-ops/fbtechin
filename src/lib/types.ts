
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
  error?: string | null;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
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
