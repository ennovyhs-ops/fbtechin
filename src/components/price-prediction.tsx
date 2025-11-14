
'use client';

import { useEffect, useState } from 'react';
import { Target, Loader2, AlertCircle, TrendingUp, TrendingDown, Gauge } from 'lucide-react';
import { predictPriceTarget } from '@/ai/flows/predict-price-target';
import type { PredictPriceTargetOutput } from '@/ai/flows/predict-price-target';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import type { MarketData } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PricePredictionProps {
  marketData: MarketData[];
  analysis: AnalyzeStockMomentumOutput;
  currency: string | null;
}

const getConfidenceInfo = (confidence: string): { color: string, label: string, explanation: string } => {
    switch (confidence) {
        case 'High': return { color: 'text-green-400', label: 'High Confidence', explanation: "Derived from a 'Strong' momentum signal. The technical indicators are strongly aligned." };
        case 'Moderate': return { color: 'text-yellow-400', label: 'Moderate Confidence', explanation: "Derived from a 'Moderate' momentum signal. There is a good level of indicator alignment." };
        case 'Low': return { color: 'text-orange-400', label: 'Low Confidence', explanation: "Derived from a 'Mild' momentum signal. The technical indicators are not strongly aligned; interpret with caution." };
        default: return { color: 'text-muted-foreground', label: 'Very Low Confidence', explanation: "Derived from a 'Neutral' momentum signal. There is no clear directional edge; the prediction is highly uncertain." };
    }
}

export function PricePrediction({ marketData, analysis, currency }: PricePredictionProps) {
  const [prediction, setPrediction] = useState<PredictPriceTargetOutput | { error: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (marketData && analysis) {
      setLoading(true);
      predictPriceTarget(marketData, analysis)
        .then(setPrediction)
        .catch(() => {
          setPrediction({ error: 'Could not generate price prediction at this time.' });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [marketData, analysis]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Target className="h-6 w-6 text-accent" />
            <span>Calculating AI Price Target...</span>
          </CardTitle>
          <CardDescription>
            The AI is projecting a price target based on momentum and volatility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Projecting future price...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction || 'error' in prediction) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Target className="h-6 w-6 text-destructive" />
            <span>AI Price Target</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{prediction?.error || 'Could not calculate prediction.'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUp = prediction.priceTarget > parseFloat(marketData[0].close);
  const color = isUp ? 'text-green-400' : 'text-red-400';
  const Icon = isUp ? TrendingUp : TrendingDown;
  const confidenceInfo = getConfidenceInfo(prediction.confidence);

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Target className="h-6 w-6 text-accent" />
          <span>AI Price Target</span>
        </CardTitle>
        <CardDescription>
          A projected price target based on the momentum score and recent volatility.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg bg-muted/50 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${color}`} />
                    <div className="flex flex-col">
                        <span className={`font-bold text-2xl ${color}`}>{formatCurrency(prediction.priceTarget, currency)}</span>
                        <span className="text-sm text-muted-foreground">{prediction.timeframe}</span>
                    </div>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <div className="flex items-center gap-2 cursor-help">
                                <Gauge className={`h-5 w-5 ${confidenceInfo.color}`} />
                                <span className={`font-semibold text-sm ${confidenceInfo.color}`}>{confidenceInfo.label}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{confidenceInfo.explanation}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
             <p className="text-sm text-muted-foreground text-center sm:text-left">{prediction.interpretation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

    