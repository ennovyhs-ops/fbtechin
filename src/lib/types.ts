export type MarketData = {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export type RsiData = {
  date: string;
  RSI: string;
}

export type RocData = {
  date: string;
  'ROC': string;
}

export type MacdData = {
  date: string;
  'MACD_Hist': string;
  'MACD_Signal': string;
  'MACD': string;
}

export type BbandsData = {
    date: string;
    'Real Upper Band': string;
    'Real Lower Band': string;
    'Real Middle Band': string;
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
