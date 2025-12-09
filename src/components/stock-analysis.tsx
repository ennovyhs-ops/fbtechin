

'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2, AlertCircle, TrendingUp, TrendingDown, Rocket, ShieldAlert, Scale, Hand, AlertTriangle, Info, Target, Gauge, Clock, Calendar, HelpCircle, ArrowRight } from 'lucide-react';
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
  analysisResult: CombinedAnalysisResult | null;
  currency: string | null;
  loading: boolean;
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

const PivotDisplay = ({ label, value, currency }: { label: string; value: number; currency: string | null }) => (
    <div className="flex flex-col items-center">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold text-sm text-foreground">{formatCurrency(value, currency)}</span>
    </div>
);

const FibonacciDisplay = ({ label, value, currency, highlight }: { label: string; value: number; currency: string | null, highlight?: boolean }) => (
    <div className={`flex flex-col items-center p-1 rounded-md ${highlight ? 'bg-background' : ''}`}>
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold text-sm text-foreground">{formatCurrency(value, currency)}</span>
    </div>
);


export function StockAnalysis({ ticker, marketData, analysisResult, currency, loading }: StockAnalysisProps) {

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
  
  if (!analysisResult) return null;

  if (analysisResult.error && !analysisResult.analysis) {
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
                    <span>{analysisResult.error}</span>
                </div>
            </CardContent>
        </Card>
    );
  }
  
  const momentumAnalysis = analysisResult.analysis;
  const prediction = analysisResult.prediction;
  
  if (!momentumAnalysis) return null; // Should not happen if error is handled, but for type safety

  const { icon, color } = getSignalInfo(momentumAnalysis.signal);
  const actionExplanation = actionGlossary[momentumAnalysis.tradeAction];
  const isPredictionError = analysisResult.error && (!prediction || 'error' in prediction);
  const signalInfo = getSignalInfoForPrediction(momentumAnalysis.signal);
  const pivots = (prediction && 'pivots' in prediction && prediction.pivots) ? prediction.pivots : null;
  const fibonacci = (prediction && 'fibonacci' in prediction && prediction.fibonacci) ? prediction.fibonacci : null;


  const PriceTargetContent = ({ targetType, icon: Icon }: { targetType: 'shortTerm' | 'longTerm', icon: React.ElementType }) => {
    if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/></div>;
    if (isPredictionError || !prediction || 'error' in prediction) return <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Failed</div>;
    
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
                    <TooltipContent className="max-w-xs">
                        <p>{targetData.interpretation}</p>
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
                                <span className={`font-bold text-xl ${predColor}`}>{formatCurrency(targetData.priceTarget, currency)}</span>
                                <span className="text-xs text-muted-foreground">{targetData.timeframe}</span>
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                     <p>{targetData.interpretation}</p>
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
                <p className="font-bold text-xl text-foreground">{momentumAnalysis.totalScore.toFixed(2)}</p>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={`flex items-center gap-1.5 font-semibold text-md ${color} cursor-help`}>
                                {icon}
                                <span>{momentumAnalysis.signal}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{signalInfo.explanation}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 <p className="text-sm text-muted-foreground">{momentumAnalysis.interpretation}</p>
            </div>

            <Separator orientation="vertical" className="h-24 hidden md:block" />
            <Separator orientation="horizontal" className="w-full md:hidden" />

            {/* Right side: Price Target */}
             <div className="flex flex-col items-center gap-4 text-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 cursor-help">
                                Calculated Price Targets
                                <HelpCircle className="h-4 w-4" />
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                             <p><span className='font-bold'>Short-Term Target:</span> Based on Average True Range (ATR), a measure of recent market volatility.</p>
                             <p><span className='font-bold'>Long-Term Target:</span> Based on historical Standard Deviation, a measure of longer-term volatility.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6">
                    <PriceTargetContent targetType="shortTerm" icon={Clock} />
                    <Separator orientation="vertical" className="h-12 hidden sm:block" />
                    <PriceTargetContent targetType="longTerm" icon={Calendar} />
                 </div>
            </div>
        </div>
        
        {pivots && (
            <div className="space-y-4">
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 cursor-help">
                                Standard Daily Pivot Points
                                <HelpCircle className="h-4 w-4" />
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p>Pivot points are calculated based on the prior day's high, low, and close. They are key levels watched by traders for potential support (S1, S2) and resistance (R1, R2). A price moving through a pivot level can signal a new trend.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="flex flex-row justify-around items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <PivotDisplay label="S2" value={pivots.s2} currency={currency} />
                    <PivotDisplay label="S1" value={pivots.s1} currency={currency} />
                    <div className="flex flex-col items-center p-2 rounded-md bg-background border">
                        <span className="text-xs font-bold text-primary">PIVOT</span>
                        <span className="font-extrabold text-md text-foreground">{formatCurrency(pivots.pp, currency)}</span>
                    </div>
                    <PivotDisplay label="R1" value={pivots.r1} currency={currency} />
                    <PivotDisplay label="R2" value={pivots.r2} currency={currency} />
                </div>
            </div>
        )}

        {fibonacci && (
            <div className="space-y-4">
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 cursor-help">
                                Fibonacci Retracement (90-Day)
                                <HelpCircle className="h-4 w-4" />
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs space-y-2">
                            <p>Fibonacci levels are horizontal lines that indicate where support and resistance are likely to occur. They are based on the 90-day high-low range. A price may reverse near these levels.</p>
                            <p><span className="font-semibold">The "Golden Zone":</span> The area between the 50% and 61.8% retracement levels is often considered a high-probability trading zone for potential reversals</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="flex flex-row justify-around items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <FibonacciDisplay label="Low (0%)" value={fibonacci.rangeLow} currency={currency} />
                    <FibonacciDisplay label="23.6%" value={fibonacci.level236} currency={currency} />
                    <FibonacciDisplay label="38.2%" value={fibonacci.level382} currency={currency} />
                    <FibonacciDisplay label="50.0%" value={fibonacci.level500} currency={currency} />
                    <FibonacciDisplay label="61.8%" value={fibonacci.level618} currency={currency} highlight />
                    <FibonacciDisplay label="High (100%)" value={fibonacci.rangeHigh} currency={currency} />
                </div>
            </div>
        )}

        <div className="space-y-2 text-center pt-2">
            <div className="flex items-center justify-center gap-2">
                <h3 className="font-semibold text-sm">Suggested Action:</h3>
                 <div className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20">{momentumAnalysis.tradeAction}</div>
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
