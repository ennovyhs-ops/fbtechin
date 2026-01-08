
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Bot, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { summarizeTechnicalAnalysis } from '@/ai/flows/summarize-technical-analysis';
import type { CombinedAnalysisResult, MarketData } from '@/lib/types';
import { calculateMultiROC, calculateMAVol } from '@/lib/technical-analysis';

interface TechnicalSummaryProps {
  ticker: string;
  analysis: CombinedAnalysisResult | null;
  currentPrice: number;
  volatility: number | null;
  indicatorData: any;
  marketData: MarketData[];
}

export function TechnicalSummary({ ticker, analysis, currentPrice, volatility, indicatorData, marketData }: TechnicalSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derivedSignalInfo = useMemo(() => {
    if (!indicatorData || marketData.length < 50) return null;

    const { rsi, macd } = indicatorData;
    const latestRsi = rsi[0]?.RSI ? parseFloat(rsi[0].RSI) : NaN;
    const latestMacd = macd[0];
    const prevMacd = macd[1];
    const closePrices = marketData.map(d => parseFloat(d.close)).reverse();

    let rsiState = `RSI is ${latestRsi.toFixed(2)} (Neutral)`;
    if (latestRsi > 70) rsiState = `RSI is ${latestRsi.toFixed(2)} (Overbought)`;
    if (latestRsi < 30) rsiState = `RSI is ${latestRsi.toFixed(2)} (Oversold)`;

    let macdState = 'MACD is neutral';
    if (latestMacd && prevMacd && latestMacd.MACD && latestMacd.MACD_Signal && prevMacd.MACD && prevMacd.MACD_Signal) {
        const isCrossoverBullish = parseFloat(prevMacd.MACD) <= parseFloat(prevMacd.MACD_Signal) && parseFloat(latestMacd.MACD) > parseFloat(latestMacd.MACD_Signal);
        const isCrossoverBearish = parseFloat(prevMacd.MACD) >= parseFloat(prevMacd.MACD_Signal) && parseFloat(latestMacd.MACD) < parseFloat(latestMacd.MACD_Signal);
        if (isCrossoverBullish) macdState = 'A bullish crossover just occurred';
        else if (isCrossoverBearish) macdState = 'A bearish crossover just occurred';
        else if (parseFloat(latestMacd.MACD) > parseFloat(latestMacd.MACD_Signal)) macdState = 'MACD line is above the signal line (Bullish)';
        else macdState = 'MACD line is below the signal line (Bearish)';
    }

    const multiRoc = calculateMultiROC(closePrices, [5, 22, 50]);
    const latestRoc5 = multiRoc.roc5[multiRoc.roc5.length-1];
    const latestRoc22 = multiRoc.roc22[multiRoc.roc22.length-1];
    const latestRoc50 = multiRoc.roc50[multiRoc.roc50.length-1];
    let trendsState = 'Trends are mixed';
    if (latestRoc5 > 0 && latestRoc22 > 0 && latestRoc50 > 0) trendsState = 'Short, medium, and long-term trends are all bullish';
    else if (latestRoc5 < 0 && latestRoc22 < 0 && latestRoc50 < 0) trendsState = 'Short, medium, and long-term trends are all bearish';

    const volumesChronological = marketData.map(d => parseFloat(d.volume)).reverse();
    const maVol = calculateMAVol(volumesChronological, 50);
    const latestVolume = parseFloat(marketData[0].volume);
    const latestMaVol = maVol.length > 0 ? maVol[maVol.length - 1] : undefined;
    let volumeState = 'Volume is normal';
    if (latestVolume && latestMaVol && latestVolume > latestMaVol * 1.5) {
        volumeState = parseFloat(marketData[0].close) > parseFloat(marketData[0].open)
            ? 'Recent volume is high on a positive day (Accumulation)'
            : 'Recent volume is high on a negative day (Distribution)';
    }

    return { rsi: rsiState, macd: macdState, trends: trendsState, volume: volumeState };
  }, [marketData, indicatorData]);

  const handleGenerateSummary = () => {
    const momentumAnalysis = analysis?.analysis;
    const prediction = analysis?.prediction;

    if (!ticker || !momentumAnalysis || !('totalScore' in momentumAnalysis) || !prediction || !('shortTerm' in prediction) || !currentPrice || volatility === null || !derivedSignalInfo) {
      setError("Not all required data is available to generate a summary.");
      return;
    }

    const pivots = (prediction && 'pivots' in prediction && prediction.pivots) ? { r1: prediction.pivots.r1, s1: prediction.pivots.s1 } : undefined;
    const fibonacci = (prediction && 'fibonacci' in prediction && prediction.fibonacci) ? { level618: prediction.fibonacci.level618, level382: prediction.fibonacci.level382 } : undefined;

    setLoading(true);
    setError(null);
    setSummary(null);

    summarizeTechnicalAnalysis({
      ticker,
      currentPrice,
      momentumSignal: momentumAnalysis.signal,
      recommendation: momentumAnalysis.recommendation,
      shortTermTarget: prediction.shortTerm.priceTarget,
      volatility: volatility,
      rsi: derivedSignalInfo.rsi,
      macd: derivedSignalInfo.macd,
      trends: derivedSignalInfo.trends,
      volume: derivedSignalInfo.volume,
      pivots,
      fibonacci,
    })
      .then(result => {
        setSummary(result.summary);
      })
      .catch(e => {
        console.error('Failed to get technical summary:', e);
        setError('The AI analyst could not generate a summary at this time.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (analysis && volatility !== null && derivedSignalInfo) {
        handleGenerateSummary();
    }
  }, [analysis, volatility, derivedSignalInfo]);

  if (!analysis || volatility === null) {
    return null;
  }
   if (analysis.analysis && analysis.analysis.signal === 'N/A') {
    return null;
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <span>AI Technical Summary</span>
        </CardTitle>
        <CardDescription>
          A short, AI-generated passage summarizing the asset's technical posture.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>The AI analyst is drafting its summary...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {summary && (
          <blockquote className="text-sm text-foreground leading-relaxed border-l-4 border-primary/50 pl-4 italic">
            {summary}
          </blockquote>
        )}
        {!summary && !loading && !error && (
          <Button onClick={handleGenerateSummary} disabled={loading} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Summary
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
