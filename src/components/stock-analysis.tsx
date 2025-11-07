
'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2, AlertCircle, TrendingUp, TrendingDown, Rocket, ShieldCheck, ShieldAlert, Scale, Hand, AlertTriangle, ChevronDown, Info } from 'lucide-react';
import { analyzeStockMomentum } from '@/ai/flows/analyze-stock-momentum';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MomentumScoreExplanation } from '@/components/momentum-score-explanation';
import type { MarketData } from '@/lib/types';


interface StockAnalysisProps {
  ticker: string;
  marketData: MarketData[] | null;
  onAnalysisComplete: (analysis: AnalyzeStockMomentumOutput | null) => void;
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

export function StockAnalysis({ ticker, marketData, onAnalysisComplete }: StockAnalysisProps) {
  const [analysis, setAnalysis] = useState<(AnalyzeStockMomentumOutput & { error?: undefined }) | { error: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);

  useEffect(() => {
    if (ticker && marketData) {
      setLoading(true);
      setAnalysis(null);
      onAnalysisComplete(null);
      const performAnalysis = async () => {
        try {
          const result = await analyzeStockMomentum(ticker, marketData);
          setAnalysis(result);
           if (!result.error) {
            onAnalysisComplete(result as AnalyzeStockMomentumOutput);
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
                    <span>AI Momentum Analysis</span>
                </CardTitle>
                <CardDescription>
                    The AI is running a detailed scoring model for {ticker}...
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

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Zap className="h-6 w-6 text-accent" />
          <span>Calculated Momentum Score for {ticker}</span>
        </CardTitle>
        <CardDescription>
          A proprietary score based on ROC, Bollinger Bands, RSI, MACD, and Volume analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            <div className={`flex items-center gap-3 ${color}`}>
                {icon}
                <div className="flex flex-col">
                    <span className="font-semibold text-lg">{analysis.signal}</span>
                    <span className="text-sm opacity-80">{analysis.interpretation}</span>
                </div>
            </div>
            <div className="text-center sm:text-right">
                <p className="text-4xl font-bold text-foreground">{analysis.totalScore.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Score (-1 to 1)</p>
            </div>
        </div>
        
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <h3 className="font-semibold">Suggested Action:</h3>
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
            <p className="text-sm text-muted-foreground">{analysis.tradeAction}</p>
        </div>
      </CardContent>
      <CardFooter>
          <Collapsible open={isExplanationExpanded} onOpenChange={setIsExplanationExpanded} className="w-full">
            <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                    How is this calculated?
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${isExplanationExpanded ? 'rotate-180' : ''}`} />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <MomentumScoreExplanation />
            </CollapsibleContent>
          </Collapsible>
      </CardFooter>
    </Card>
  );
}
