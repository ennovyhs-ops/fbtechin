
'use client';

import { useState } from 'react';
import { Newspaper, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, BrainCircuit } from 'lucide-react';
import { analyzeNewsImpact } from '@/ai/flows/analyze-news-impact';
import { generateSyntheticNews } from '@/ai/flows/generate-synthetic-news';
import type { NewsArticle, NewsAnalysis as NewsAnalysisType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { fetchNewsSentiment } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';

interface NewsAnalysisProps {
  ticker: string;
}

interface SyntheticNews {
    headlines: string[];
    summary: string;
    disclaimer: string;
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
    setNewsData(null);

    try {
        const newsResult = await fetchNewsSentiment(ticker);
        
        if (newsResult.error || !newsResult.articles || newsResult.articles.length === 0) {
            // If real news fails or is empty, go to synthetic fallback
            throw new Error(newsResult.error || "No articles found.");
        }
        
        const fetchedNews = newsResult.articles || [];

        // Sort by relevance score for the given ticker
        const sortedNews = [...fetchedNews].sort((a, b) => {
            const relevanceA = a.ticker_sentiment.find(t => t.ticker === ticker)?.relevance_score || '0';
            const relevanceB = b.ticker_sentiment.find(t => t.ticker === ticker)?.relevance_score || '0';
            return parseFloat(relevanceB) - parseFloat(relevanceA);
        });

        setNewsData(sortedNews);

        if (sortedNews.length > 0) {
            const analysisResult = await analyzeNewsImpact({
                ticker,
                news: sortedNews.map(({ title, summary }) => ({ title, summary })),
            });
            setAnalysis(analysisResult);
        }

    } catch (e: any) {
        setError(e.message || 'The news service is unavailable or no articles were found.');
    } finally {
        setLoading(false);
    }
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
    const topArticles = news.slice(0, 3);

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

            {topArticles.length > 0 && (
                <>
                    <Separator className="my-4"/>
                    <div className="space-y-3">
                         <h3 className="font-semibold text-sm">Top 3 Most Relevant Articles:</h3>
                         <div className="space-y-3">
                            {topArticles.map((article, index) => (
                                <a href={article.url} target="_blank" rel="noopener noreferrer" key={index} className="block p-3 rounded-md border bg-background/50 hover:border-primary/50 transition-colors">
                                    <p className="font-semibold text-sm text-foreground truncate">{article.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1 truncate">{article.summary}</p>
                                    <div className='flex items-center justify-between mt-2'>
                                         <p className="text-xs text-muted-foreground">{article.source}</p>
                                         <p className="text-xs text-muted-foreground">{new Date(article.time_published).toLocaleDateString()}</p>
                                    </div>
                                </a>
                            ))}
                         </div>
                    </div>
                </>
            )}

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
                Load recent news and generate an AI-powered impact analysis. This will use one API request. If the quota is hit, the request will fail.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleLoadNews} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load News & Analysis
            </Button>
            {error && <p className="text-sm text-destructive mt-4">{error}</p>}
        </CardContent>
    </Card>
  );

}

    