
'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2, AlertCircle, TrendingUp, TrendingDown, Rocket, ShieldAlert, Scale, Hand, AlertTriangle, Info, Target, Gauge } from 'lucide-react';
import { analyzeStockMomentum } from '@/ai/flows/analyze-stock-momentum';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { predictPriceTarget } from '@/ai/flows/predict-price-target';
import type { PredictPriceTargetOutput } from '@/ai/flows/predict-price-target';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MarketData } from '@/lib/types';
import { Separator } from './ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';


interface StockAnalysisProps {
  ticker: string;
  marketData: MarketData[] | null;
  onAnalysisComplete: (analysis: AnalyzeStockMomentumOutput | null) => void;
  currency: string | null;
}

const getSignalInfo = (signal: string): { icon: React.ReactNode, color: string } => {
    if (signal.includes('STRONG BULLISH')) return { icon: <Rocket className="h-6 w-6" />, color: 'text-green-400' };
    if (signal.includes('MODERATE BULLISH')) return { icon: <TrendingUp className="h-6 w-6" />, color: 'text-green-400' };
    if (signal.includes('MILD BULLISH')) return { icon: <AlertTriangle className="h-6 w-6" />, color: 'text-yellow-400' };
    if (signal.includes('STRONG BEARISH')) return { icon: <TrendingDown className="h-6 w-6" />, color: 'text-red-400' };
    if (signal.includes('MODERATE BEARISH')) return { icon: <ShieldAlert className="h-6 w-6" />, color: 'text-red-400' };
    if (signal.includes('MILD BEARISH')) return { icon: <Hand className="h-6 w-6" />, color: 'text-orange-400' };
    return { icon: <Scale className="h-6 w-6" />, color: 'text-muted-foreground' };
}

const actionGlossary: Record<string, { title: string; description: string; }> = {
    'Use pullbacks to enter': {
        title: "What is a 'Pullback'?",
        description: "A pullback is a temporary dip or pause in a stock's strong upward trend. The suggestion to 'use pullbacks to enter' means waiting for one of these small price drops to buy the stock, rather than buying it when the price is at a high point. It's a strategy aimed at getting a better entry price within a larger uptrend."
    },
    'Use rallies to enter': {
        title: "What is a 'Rally'?",
        description: "A rally is a temporary price increase in a stock's strong downward trend. The suggestion to 'use rallies to enter' a short position means waiting for one of these small price spikes to sell or short the stock, rather than selling when the price is at a low point. It's a strategy for getting a better entry price within a larger downtrend."
    }
}

const getSignalInfoForPrediction = (signal: string): { explanation: string } => {
    if (signal.includes('STRONG')) return { explanation: "'Strong' signals indicate that multiple key technical indicators are aligned, pointing to a high-conviction trend." };
    if (signal.includes('MODERATE')) return { explanation: "'Moderate' signals suggest a good level of indicator alignment, but some conflicting signals may exist." };
    if (signal.includes('MILD')) return { explanation: "'Mild' signals suggest that technical indicators are not strongly aligned and the trend is weak or unclear. Interpret with caution." };
    return { explanation: "'Neutral' signals indicate no clear directional edge; the market may be choppy or range-bound." };
}

export function StockAnalysis({ ticker, marketData, onAnalysisComplete, currency }: StockAnalysisProps) {
  const [analysis, setAnalysis] = useState<(AnalyzeStockMomentumOutput & { error?: undefined }) | { error: string } | null>(null);
  const [prediction, setPrediction] = useState<PredictPriceTargetOutput | { error: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticker && marketData) {
      setLoading(true);
      setAnalysis(null);
      setPrediction(null);
      onAnalysisComplete(null);
      
      const performAnalysis = async () => {
        try {
          const analysisResult = await analyzeStockMomentum(ticker, marketData);
          setAnalysis(analysisResult);
          
          if (analysisResult && !analysisResult.error) {
            onAnalysisComplete(analysisResult as AnalyzeStockMomentumOutput);
            const predictionResult = await predictPriceTarget(marketData, analysisResult as AnalyzeStockMomentumOutput);
            setPrediction(predictionResult);
          }
        } catch (e: any) {
          const errorResult = { error: e.message || 'An unexpected error occurred while generating the analysis.' };
          setAnalysis(errorResult);
          onAnalysisComplete(null);
        } finally {
          setLoading(false);
        }
      }
      performAnalysis();
    } else if (ticker) {
        setLoading(false);
        onAnalysisComplete(null);
    }
  }, [ticker, marketData, onAnalysisComplete]);


  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-accent" />
                    <span>AI Analysis for {ticker}</span>
                </CardTitle>
                <CardDescription>
                    The AI is running a detailed scoring model and price projection...
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running analysis... This may take a moment.</span>
                </div>
            </CardContent>
        </Card>
    );
  }
  
  if (!analysis) return null;

  if (analysis.error) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-destructive" />
                    <span>AI Momentum Analysis</span>
                </CardTitle>
                <CardDescription>
                    Could not complete the analysis for {ticker}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{analysis.error}</span>
                </div>
            </CardContent>
        </Card>
    );
  }
  
  if (analysis.signal === 'N/A') {
      return (
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-muted-foreground" />
                    <span>AI Momentum Analysis</span>
                </CardTitle>
                <CardDescription>
                    {analysis.interpretation}
                </CardDescription>
            </CardHeader>
        </Card>
      )
  }

  const { icon, color } = getSignalInfo(analysis.signal);
  const actionExplanation = actionGlossary[analysis.tradeAction];
  const isPredictionError = !prediction || 'error' in prediction;
  const signalInfo = getSignalInfoForPrediction(analysis.signal);

  const PriceTargetContent = () => {
    if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Calculating...</div>;
    if (isPredictionError) return <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Prediction failed.</div>;
    
    const isUp = (prediction as PredictPriceTargetOutput).priceTarget > parseFloat(marketData![0].close);
    const predColor = isUp ? 'text-green-400' : 'text-red-400';
    const PredIcon = isUp ? TrendingUp : TrendingDown;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
                <PredIcon className={`h-6 w-6 ${predColor}`} />
                <div className="flex flex-col items-center">
                    <span className={`font-bold text-2xl ${predColor}`}>{formatCurrency((prediction as PredictPriceTargetOutput).priceTarget, currency)}</span>
                     <span className="text-sm text-muted-foreground">{(prediction as PredictPriceTargetOutput).timeframe}</span>
                </div>
            </div>
             <p className="text-sm text-muted-foreground mt-2 max-w-sm">{(prediction as PredictPriceTargetOutput).interpretation}</p>
        </div>
    );
  }

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Zap className="h-6 w-6 text-accent" />
          <span>AI Analysis for {ticker}</span>
        </CardTitle>
        <CardDescription>
          A proprietary momentum score and a derived short-term price target.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50">
            {/* Left side: Momentum Score */}
            <div className="flex flex-col items-center gap-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Momentum Score</h3>
                <p className="text-4xl font-bold text-foreground">{analysis.totalScore.toFixed(2)}</p>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={`flex items-center gap-1.5 font-semibold text-md ${color} cursor-help`}>
                                {icon}
                                <span>{analysis.signal}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">{signalInfo.explanation}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 <p className="text-sm text-muted-foreground">{analysis.interpretation}</p>
            </div>

            <Separator orientation="vertical" className="h-24 hidden md:block" />
            <Separator orientation="horizontal" className="w-full md:hidden" />

            {/* Right side: Price Target & Action */}
             <div className="flex flex-col items-center gap-4">
                 <h3 className="font-semibold text-sm text-muted-foreground -mb-2">AI Price Target</h3>
                 <PriceTargetContent />
            </div>
        </div>

        <div className="space-y-2 text-center pt-2">
            <div className="flex items-center justify-center gap-2">
                <h3 className="font-semibold text-sm">Suggested Action:</h3>
                <p className="text-sm text-muted-foreground">{analysis.tradeAction}</p>
                {actionExplanation && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{actionExplanation.title}</DialogTitle>
                                <DialogDescription>
                                    {actionExplanation.description}
                                </DialogDescription>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
