

'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2, AlertCircle, TrendingUp, TrendingDown, Rocket, ShieldAlert, Scale, Hand, AlertTriangle, Info, Target, Gauge, Clock, Calendar } from 'lucide-react';
import { analyzeStockMomentum } from '@/ai/flows/analyze-stock-momentum';
import { predictPriceTarget } from '@/ai/flows/predict-price-target';
import type { CombinedAnalysisResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { MarketData } from '@/lib/types';
import { Separator } from './ui/separator';
import { formatCurrency, isCryptoPair, isCurrencyPair } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';


interface StockAnalysisProps {
  ticker: string;
  marketData: MarketData[] | null;
  onAnalysisComplete: (result: CombinedAnalysisResult | null) => void;
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
    if (signal.includes('STRONG')) return { explanation: "'Strong' signals mean that multiple key technical indicators are aligned, pointing to a high-conviction trend." };
    if (signal.includes('MODERATE')) return { explanation: "'Moderate' signals suggest a good level of indicator alignment, but some conflicting data may exist." };
    if (signal.includes('MILD')) return { explanation: "'Mild' signals suggest that technical indicators are not strongly aligned and the trend is weak or unclear. Interpret with caution." };
    return { explanation: "'Neutral' signals indicate no clear directional edge; the market may be choppy or range-bound." };
}

export function StockAnalysis({ ticker, marketData, onAnalysisComplete, currency }: StockAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<CombinedAnalysisResult | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function performAnalysis() {
      if (!ticker || !marketData) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      onAnalysisComplete(null);
      setAnalysis(null);

      try {
        const momentumResult = await analyzeStockMomentum(ticker, marketData);
        if (isCancelled) return;

        let result: CombinedAnalysisResult;

        if (momentumResult && !momentumResult.error) {
          const predictionResult = await predictPriceTarget(ticker, marketData, momentumResult);
          if (isCancelled) return;

          result = {
            analysis: momentumResult,
            prediction: predictionResult.error ? null : predictionResult,
            error: predictionResult.error ? predictionResult.error : undefined,
          };
        } else {
          result = {
            analysis: null,
            prediction: null,
            error: momentumResult.error || 'An unknown analysis error occurred.',
          };
        }
        
        setAnalysis(result);
        onAnalysisComplete(result);

      } catch (e: any) {
        if (isCancelled) return;
        const errorResult = { analysis: null, prediction: null, error: e.message || 'An unexpected error occurred.' };
        setAnalysis(errorResult);
        onAnalysisComplete(errorResult);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    performAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [ticker, marketData, onAnalysisComplete]);


  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-accent" />
                    <span>Calculated Analysis for {ticker}</span>
                </CardTitle>
                <CardDescription>
                    Running a detailed scoring model and price projection...
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

  if (analysis.error && !analysis.analysis) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-destructive" />
                    <span>Momentum Analysis</span>
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
  
  const momentumAnalysis = analysis.analysis;
  const prediction = analysis.prediction;
  
  if (!momentumAnalysis) return null; // Should not happen if error is handled, but for type safety

  const { icon, color } = getSignalInfo(momentumAnalysis.signal);
  const actionExplanation = actionGlossary[momentumAnalysis.tradeAction];
  const isPredictionError = analysis.error && !prediction;
  const signalInfo = getSignalInfoForPrediction(momentumAnalysis.signal);

  const PriceTargetContent = ({ targetType, icon: Icon }: { targetType: 'shortTerm' | 'longTerm', icon: React.ElementType }) => {
    if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>;
    if (isPredictionError || !prediction) return <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Failed</div>;
    
    const targetData = prediction[targetType];
    const isNotApplicable = targetData.timeframe === "N/A";
    
    if (isNotApplicable) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-2 cursor-help text-center max-w-sm">
                             <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-semibold text-sm text-muted-foreground">Price Target N/A</span>
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{targetData.interpretation}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    const isUp = marketData && targetData.priceTarget > parseFloat(marketData[0].close);
    const predColor = isUp ? 'text-green-400' : 'text-red-400';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 cursor-help">
                        <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 text-muted-foreground`} />
                            <div className="flex flex-col items-center">
                                <span className={`font-bold text-2xl ${predColor}`}>{formatCurrency(targetData.priceTarget, currency)}</span>
                                <span className="text-xs text-muted-foreground">{targetData.timeframe}</span>
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                     <p className="max-w-xs">{targetData.interpretation}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  }

  // Simplified view for Forex/Crypto
  if (momentumAnalysis.signal === 'N/A') {
      return (
           <Card className="animate-in fade-in-50 duration-500 delay-300">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-accent" />
                    <span>Analysis for {ticker}</span>
                </CardTitle>
                <CardDescription>
                    {momentumAnalysis.interpretation}
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50">
                    <div className="flex flex-col items-center gap-4 text-center">
                         <h3 className="font-semibold text-sm text-muted-foreground">Calculated Price Target</h3>
                         <div className="flex flex-col sm:flex-row items-center gap-6">
                            <PriceTargetContent targetType="shortTerm" icon={Clock} />
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      )
  }

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Zap className="h-6 w-6 text-accent" />
          <span>Calculated Analysis for {ticker}</span>
        </CardTitle>
        <CardDescription>
          A proprietary momentum score and derived short- and long-term price targets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50">
            {/* Left side: Momentum Score */}
            <div className="flex flex-col items-center gap-2 text-center">
                <h3 className="font-semibold text-sm text-muted-foreground">Momentum Score (-1 to 1)</h3>
                <p className="text-2xl font-bold text-foreground">{momentumAnalysis.totalScore.toFixed(2)}</p>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={`flex items-center gap-1.5 font-semibold text-md ${color} cursor-help`}>
                                {icon}
                                <span>{momentumAnalysis.signal}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">{signalInfo.explanation}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 <p className="text-sm text-muted-foreground">{momentumAnalysis.interpretation}</p>
            </div>

            <Separator orientation="vertical" className="h-24 hidden md:block" />
            <Separator orientation="horizontal" className="w-full md:hidden" />

            {/* Right side: Price Target */}
             <div className="flex flex-col items-center gap-4 text-center">
                 <h3 className="font-semibold text-sm text-muted-foreground">Calculated Price Targets</h3>
                 <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6">
                    <PriceTargetContent targetType="shortTerm" icon={Clock} />
                    <Separator orientation="vertical" className="h-12 hidden sm:block" />
                    <PriceTargetContent targetType="longTerm" icon={Calendar} />
                 </div>
            </div>
        </div>

        <div className="space-y-2 text-center pt-2">
            <div className="flex items-center justify-center gap-2">
                <h3 className="font-semibold text-sm">Suggested Action:</h3>
                 <div className="text-sm font-semibold text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">{momentumAnalysis.tradeAction}</div>
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
