
'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, BarChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchMarketData } from '@/app/actions';
import type { MarketData } from '@/lib/types';
import { Separator } from './ui/separator';

interface MarketCorrelationProps {
  baseTicker: string;
  baseMarketData: MarketData[];
}

interface AnalysisResult {
  baseTicker: string;
  comparisonTicker: string;
  basePerformance: number;
  comparisonPerformance: number;
  conclusion: string;
}

const calculatePerformance = (data: MarketData[], days: number): number | null => {
  if (data.length < days) return null;
  const latestClose = parseFloat(data[0].close);
  const startClose = parseFloat(data[days - 1].close);
  if (isNaN(latestClose) || isNaN(startClose) || startClose === 0) return null;
  return ((latestClose - startClose) / startClose) * 100;
};

export function MarketCorrelation({ baseTicker, baseMarketData }: MarketCorrelationProps) {
  const [comparisonTicker, setComparisonTicker] = useState('SPY');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAnalysis = () => {
    setError(null);
    setAnalysis(null);
    startTransition(async () => {
      if (!comparisonTicker) {
        setError('Please enter a ticker to compare against.');
        return;
      }
      
      const comparisonResult = await fetchMarketData(comparisonTicker.toUpperCase());
      if (comparisonResult.error) {
        setError(comparisonResult.error);
        return;
      }
      if (!comparisonResult.data || comparisonResult.data.length === 0) {
        setError(`No data found for comparison ticker: ${comparisonTicker.toUpperCase()}`);
        return;
      }
      
      const analysisDays = 90;

      const basePerformance = calculatePerformance(baseMarketData, analysisDays);
      const comparisonPerformance = calculatePerformance(comparisonResult.data, analysisDays);
      
      if (basePerformance === null || comparisonPerformance === null) {
          setError(`Not enough historical data to perform a ${analysisDays}-day comparison.`);
          return;
      }

      let conclusion = '';
      const difference = basePerformance - comparisonPerformance;
      if (difference > 5) {
          conclusion = `${baseTicker} is significantly outperforming ${comparisonTicker.toUpperCase()}.`;
      } else if (difference < -5) {
          conclusion = `${baseTicker} is significantly underperforming ${comparisonTicker.toUpperCase()}.`;
      } else {
          conclusion = `${baseTicker} is performing similarly to ${comparisonTicker.toUpperCase()}.`;
      }

      setAnalysis({
          baseTicker,
          comparisonTicker: comparisonTicker.toUpperCase(),
          basePerformance,
          comparisonPerformance,
          conclusion
      });
    });
  };
  
  const PerformanceDisplay = ({ label, value }: { label: string, value: number }) => {
    const isPositive = value >= 0;
    const color = isPositive ? 'text-green-400' : 'text-red-400';
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
        <div className="flex flex-col items-center text-center gap-1">
            <span className="font-semibold text-sm text-muted-foreground">{label}</span>
            <div className={`flex items-center gap-1.5 font-bold text-2xl ${color}`}>
                <Icon className="h-6 w-6" />
                <span>{value.toFixed(2)}%</span>
            </div>
        </div>
    )
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <BarChart className="h-6 w-6 text-accent" />
          <span>Market Correlation Analysis</span>
        </CardTitle>
        <CardDescription>
          Compare {baseTicker}'s 90-day performance against a market index or another stock. Uses 1 API request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis && (
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="flex-grow w-full">
                    <label htmlFor="comparison-ticker" className="text-sm font-medium text-foreground">
                        Comparison Ticker
                    </label>
                    <Input
                        id="comparison-ticker"
                        placeholder="e.g., SPY, QQQ"
                        value={comparisonTicker}
                        onInput={(e) => setComparisonTicker(e.currentTarget.value.toUpperCase())}
                        className="mt-1"
                        disabled={isPending}
                    />
                </div>
                <Button onClick={handleAnalysis} disabled={isPending || !comparisonTicker} className="w-full sm:w-auto">
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isPending ? 'Analyzing...' : 'Load Market Comparison'}
                </Button>
            </div>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        {analysis && (
            <div className="animate-in fade-in-50 duration-500 space-y-4">
                 <div className="flex flex-col md:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50">
                    <PerformanceDisplay label={analysis.baseTicker} value={analysis.basePerformance} />
                    <Separator orientation="vertical" className="h-16 hidden md:block" />
                    <Separator orientation="horizontal" className="w-full md:hidden" />
                    <PerformanceDisplay label={analysis.comparisonTicker} value={analysis.comparisonPerformance} />
                </div>
                <div className="text-center pt-2">
                    <h3 className="font-semibold text-sm">90-Day Performance Verdict:</h3>
                    <p className="text-sm text-muted-foreground">{analysis.conclusion}</p>
                </div>
                <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => { setAnalysis(null); setError(null); }} disabled={isPending}>
                        Run New Comparison
                    </Button>
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
