
'use client';

import { useState } from 'react';
import { Newspaper, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { analyzeNewsImpact } from '@/ai/flows/analyze-news-impact';
import type { NewsArticle, NewsAnalysis as NewsAnalysisType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { fetchNewsSentiment } from '@/app/actions';

interface NewsAnalysisProps {
  ticker: string;
}

const getImpactInfo = (impact: string): { icon: React.ReactNode, color: string } => {
    switch(impact) {
        case 'Bullish': return { icon: <TrendingUp className="h-5 w-5" />, color: 'text-green-400' };
        case 'Bearish': return { icon: <TrendingDown className="h-5 w-5" />, color: 'text-red-400' };
        default: return { icon: <Minus className="h-5 w-5" />, color: 'text-muted-foreground' };
    }
}

export function NewsAnalysis({ ticker }: NewsAnalysisProps) {
  const [analysis, setAnalysis] = useState<NewsAnalysisType | null>(null);
  const [news, setNewsData] = useState<NewsArticle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadNews = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const newsResult = await fetchNewsSentiment(ticker);
    if (newsResult.error) {
        setError(newsResult.error);
        setNewsData(null);
        setLoading(false);
        return;
    }
    
    const fetchedNews = newsResult.articles || [];
    setNewsData(fetchedNews);

    if (fetchedNews.length > 0) {
        try {
            const analysisResult = await analyzeNewsImpact({
                ticker,
                news: fetchedNews.map(({ title, summary }) => ({ title, summary })),
            });
            setAnalysis(analysisResult);
        } catch {
            setError('Could not generate the news analysis at this time.');
        }
    }
    setLoading(false);
  };


  if (news) {
    if (news.length === 0 && !loading) {
       return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Newspaper className="h-6 w-6 text-accent" />
                    <span>AI News Analysis for {ticker}</span>
                </CardTitle>
                <CardDescription>
                    No recent news was found for this ticker.
                </CardDescription>
            </CardHeader>
        </Card>
       )
    }

    const { icon, color } = getImpactInfo(analysis?.impact || 'Neutral');

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
            {loading ? (
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing news...</span>
                </div>
            ) : error ? (
                <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            ) : analysis ? (
                <>
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
                </>
            ) : null}
        </CardContent>
        </Card>
    );
  }

  // Initial state with button
  return (
     <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                <Newspaper className="h-6 w-6 text-accent" />
                <span>News & AI Analysis</span>
            </CardTitle>
            <CardDescription>
                Load recent news and generate an AI-powered impact analysis. This will use one API request.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleLoadNews} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load News & Analysis
            </Button>
        </CardContent>
    </Card>
  );

}
