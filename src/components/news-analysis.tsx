
'use client';

import { useEffect, useState } from 'react';
import { Newspaper, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { analyzeNewsImpact } from '@/ai/flows/analyze-news-impact';
import type { NewsArticle, NewsAnalysis as NewsAnalysisType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NewsAnalysisProps {
  ticker: string;
  news: NewsArticle[];
}

const getImpactInfo = (impact: string): { icon: React.ReactNode, color: string } => {
    switch(impact) {
        case 'Bullish': return { icon: <TrendingUp className="h-5 w-5" />, color: 'text-green-400' };
        case 'Bearish': return { icon: <TrendingDown className="h-5 w-5" />, color: 'text-red-400' };
        default: return { icon: <Minus className="h-5 w-5" />, color: 'text-muted-foreground' };
    }
}

export function NewsAnalysis({ ticker, news }: NewsAnalysisProps) {
  const [analysis, setAnalysis] = useState<NewsAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker && news && news.length > 0) {
      setLoading(true);
      setError(null);
      analyzeNewsImpact({
        ticker,
        news: news.map(({ title, summary }) => ({ title, summary })),
      })
        .then(setAnalysis)
        .catch(() => {
          setError('Could not generate the news analysis at this time.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
        setLoading(false);
    }
  }, [ticker, news]);

  if (!news || news.length === 0) {
    return null; // Don't render if there's no news
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Newspaper className="h-6 w-6 text-accent" />
            <span>AI News Analysis</span>
          </CardTitle>
          <CardDescription>
            The AI is analyzing recent news for {ticker} to assess potential market impact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Synthesizing information...</span>
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
            <Newspaper className="h-6 w-6 text-destructive" />
            <span>AI News Analysis</span>
          </CardTitle>
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
  
  const { icon, color } = getImpactInfo(analysis.impact);

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Newspaper className="h-6 w-6 text-accent" />
          <span>AI News Analysis for {ticker}</span>
        </CardTitle>
         <CardDescription>
            A summary of recent news and its potential impact on the stock.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-foreground">{analysis.analysis}</p>
        </div>
        <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Predicted Impact:</h3>
            <div className={`flex items-center gap-1.5 font-semibold text-sm px-2 py-1 rounded-md ${color} bg-background`}>
                {icon}
                <span>{analysis.impact}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
