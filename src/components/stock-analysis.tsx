'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2, AlertCircle, TrendingUp, TrendingDown, Rocket, ShieldCheck, ShieldAlert, Scale, Hand, AlertTriangle, ChevronDown } from 'lucide-react';
import { analyzeStockMomentum } from '@/ai/flows/analyze-stock-momentum';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MomentumScoreExplanation } from '@/components/momentum-score-explanation';


interface StockAnalysisProps {
  ticker: string;
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

export function StockAnalysis({ ticker }: StockAnalysisProps) {
  const [analysis, setAnalysis] = useState<(AnalyzeStockMomentumOutput & { error?: undefined }) | { error: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);

  useEffect(() => {
    if (ticker) {
      setLoading(true);
      setAnalysis(null);
      const performAnalysis = async () => {
        try {
          const result = await analyzeStockMomentum(ticker);
          setAnalysis(result);
        } catch (e: any) {
          setAnalysis({ error: e.message || 'An unexpected error occurred while generating the analysis.' });
        } finally {
          setLoading(false);
        }
      }
      performAnalysis();
    }
  }, [ticker]);


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

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Zap className="h-6 w-6 text-accent" />
          <span>AI Momentum Score for {ticker}</span>
        </CardTitle>
        <CardDescription>
          A proprietary score based on ROC, Bollinger Bands, RSI, and Volume analysis.
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
                <p className="text-xs text-muted-foreground">Total Score</p>
            </div>
        </div>
        
        <div className="space-y-2">
            <h3 className="font-semibold">Suggested Action:</h3>
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
