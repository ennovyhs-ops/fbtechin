
'use client';

import { useEffect, useState, useMemo } from 'react';
import { BrainCircuit, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { explainMomentumSignal } from '@/ai/flows/explain-momentum-signal';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import type { MarketData, RsiData, MacdData, BbandsData } from '@/lib/types';
import { calculateMultiROC, calculateMAVol } from '@/lib/technical-analysis';

interface SignalExplanationProps {
  ticker: string;
  analysis: AnalyzeStockMomentumOutput;
  marketData: MarketData[];
  indicatorData: {
    rsi: RsiData[];
    macd: MacdData[];
    bbands: BbandsData[];
  } | null;
}

export function SignalExplanation({ ticker, analysis, marketData, indicatorData }: SignalExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const derivedSignalInfo = useMemo(() => {
    if (!indicatorData || marketData.length < 50) return null;

    const { rsi, macd, bbands } = indicatorData;
    const latestRsi = rsi[0]?.RSI ? parseFloat(rsi[0].RSI) : NaN;
    const latestMacd = macd[0];
    const prevMacd = macd[1];
    const latestBbands = bbands[0];
    const latestClose = parseFloat(marketData[0].close);
    const closePrices = marketData.map(d => parseFloat(d.close)).reverse();

    // RSI
    let rsiState = `RSI is ${latestRsi.toFixed(2)} (Neutral)`;
    if (latestRsi > 70) rsiState = `RSI is ${latestRsi.toFixed(2)} (Overbought)`;
    if (latestRsi < 30) rsiState = `RSI is ${latestRsi.toFixed(2)} (Oversold)`;

    // MACD
    let macdState = 'MACD is neutral';
    if (latestMacd && prevMacd && latestMacd.MACD && latestMacd.MACD_Signal && prevMacd.MACD && prevMacd.MACD_Signal) {
        const isCrossoverBullish = parseFloat(prevMacd.MACD) <= parseFloat(prevMacd.MACD_Signal) && parseFloat(latestMacd.MACD) > parseFloat(latestMacd.MACD_Signal);
        const isCrossoverBearish = parseFloat(prevMacd.MACD) >= parseFloat(prevMacd.MACD_Signal) && parseFloat(latestMacd.MACD) < parseFloat(latestMacd.MACD_Signal);
        if (isCrossoverBullish) macdState = 'A bullish crossover just occurred';
        else if (isCrossoverBearish) macdState = 'A bearish crossover just occurred';
        else if (parseFloat(latestMacd.MACD) > parseFloat(latestMacd.MACD_Signal)) macdState = 'MACD line is above the signal line (Bullish)';
        else macdState = 'MACD line is below the signal line (Bearish)';
    }

    // Bollinger Bands
    let bbandsState = 'Price is neutral';
    if (latestBbands && latestBbands['Real Middle Band']) {
        const middleBand = parseFloat(latestBbands['Real Middle Band']);
        if (latestClose > middleBand) bbandsState = 'Price is above the middle band (20-day average)';
        else bbandsState = 'Price is below the middle band (20-day average)';
    }

    // Trends (Multi-ROC)
    const multiRoc = calculateMultiROC(closePrices, [5, 22, 50]);
    const latestRoc5 = multiRoc.roc5[multiRoc.roc5.length-1];
    const latestRoc22 = multiRoc.roc22[multiRoc.roc22.length-1];
    const latestRoc50 = multiRoc.roc50[multiRoc.roc50.length-1];
    let trendsState = 'Trends are mixed';
    if (latestRoc5 > 0 && latestRoc22 > 0 && latestRoc50 > 0) trendsState = 'Short, medium, and long-term trends are all bullish';
    else if (latestRoc5 < 0 && latestRoc22 < 0 && latestRoc50 < 0) trendsState = 'Short, medium, and long-term trends are all bearish';

    // Volume
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

    return {
      rsi: rsiState,
      macd: macdState,
      bollingerBands: bbandsState,
      trends: trendsState,
      volume: volumeState
    };
  }, [marketData, indicatorData]);

  useEffect(() => {
    if (!analysis || !derivedSignalInfo) return;

    setLoading(true);
    setError(null);
    setExplanation(null);

    explainMomentumSignal({
      ticker,
      signal: analysis.signal,
      score: analysis.totalScore,
      ...derivedSignalInfo,
    })
      .then(result => {
        setExplanation(result.explanation);
      })
      .catch(e => {
        console.error('Failed to get signal explanation:', e);
        setError('The AI could not generate an explanation at this time.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ticker, analysis, derivedSignalInfo]);

  if (!analysis || analysis.signal === 'N/A' || !derivedSignalInfo) {
    return null;
  }
  
  if (loading && !explanation) {
    return (
       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <BrainCircuit className="h-6 w-6 text-accent" />
                    <span>AI Signal Explanation</span>
                </CardTitle>
                <CardDescription>
                    The AI is analyzing the technical indicators to explain the signal.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating explanation...</span>
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="bg-muted/30 border-dashed animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-lg">
          <BrainCircuit className="h-5 w-5 text-accent" />
          <span>Why is the signal "{analysis.signal}"?</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && 
            <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
            </div>
        }
        {explanation && <p className="text-sm text-foreground">{explanation}</p>}
      </CardContent>
    </Card>
  );
}
