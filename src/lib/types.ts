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
