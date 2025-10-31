'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2, AlertCircle, TrendingUp, TrendingDown, ChevronsUp, ChevronsDown, Atom, Minus } from 'lucide-react';
import { analyzeStockMomentum, type AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface StockAnalysisProps {
  ticker: string;
}

const getSignalIcon = (signal: string) => {
    switch (signal) {
        case 'Strong Bullish':
        case 'Bullish':
            return <TrendingUp className="h-5 w-5 text-green-500" />;
        case 'Strong Bearish':
        case 'Bearish':
            return <TrendingDown className="h-5 w-5 text-red-500" />;
        default:
            return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
}

const getSignalBadgeVariant = (signal: string): "default" | "destructive" | "secondary" => {
    if (signal.includes('Bullish')) return 'default';
    if (signal.includes('Bearish')) return 'destructive';
    return 'secondary';
}

const AnalysisItem = ({ title, icon, data }: { title: string, icon: React.ReactNode, data: AnalyzeStockMomentumOutput[keyof AnalyzeStockMomentumOutput] }) => {
    if(typeof data !== 'object' || !data.signal) return null;
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <h4 className="font-semibold">{title}</h4>
                </div>
                <Badge variant={getSignalBadgeVariant(data.signal)} className="ml-auto">{data.signal}</Badge>
            </div>
            <p className="text-sm text-muted-foreground pl-8">{data.reasoning}</p>
        </div>
    );
};

export function StockAnalysis({ ticker }: StockAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalyzeStockMomentumOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      analyzeStockMomentum(ticker)
        .then((response) => {
            if ('error' in response) {
                setError(response.error);
            } else {
                setAnalysis(response);
            }
        })
        .catch(() => {
          setError('An unexpected error occurred while generating the analysis.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [ticker]);

  if (!ticker) return null;

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-accent" />
                    <span>AI Momentum Analysis</span>
                </CardTitle>
                <CardDescription>
                    The AI is analyzing the momentum for {ticker}...
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running analysis...</span>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (error) {
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
                    <span>{error}</span>
                </div>
            </CardContent>
        </Card>
    );
  }
  
  if (!analysis) return null;
    
  return (
    <Card className="animate-in fade-in-50 duration-500 delay-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Zap className="h-6 w-6 text-accent" />
          <span>AI Momentum Analysis for {ticker}</span>
        </CardTitle>
        <CardDescription>
          {analysis.conclusion}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <h3 className="font-semibold text-lg mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </div>
        <Separator />
        <div className="space-y-6">
            <AnalysisItem title="Primary Trend" icon={<ChevronsUp className="h-5 w-5 text-muted-foreground" />} data={analysis.primaryTrend} />
            <AnalysisItem title="Momentum" icon={<Atom className="h-5 w-5 text-muted-foreground" />} data={analysis.momentum} />
            <AnalysisItem title="Velocity" icon={<ChevronsDown className="h-5 w-5 text-muted-foreground" />} data={analysis.velocity} />
            <AnalysisItem title="Volume" icon={getSignalIcon(analysis.volume.signal)} data={analysis.volume} />
        </div>
      </CardContent>
    </Card>
  );
}
