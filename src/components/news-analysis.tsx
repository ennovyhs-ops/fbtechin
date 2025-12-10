

'use client';

import { useState } from 'react';
import { Newspaper, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { analyzeNewsImpact } from '@/ai/flows/analyze-news-impact';
import type { NewsArticle, NewsAnalysis as NewsAnalysisType, CombinedAnalysisResult, MonteCarloResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { fetchNewsSentiment } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';

interface NewsAnalysisProps {
  ticker: string;
  analysisResult: CombinedAnalysisResult | null;
  monteCarloResult: MonteCarloResult | null;
}

const getImpactInfo = (impact: string): { icon: React.ReactNode, color: string } => {
    switch(impact) {
        case 'Bullish': return { icon: <TrendingUp className="h-5 w-5" />, color: 'text-green-400' };
        case 'Bearish': return { icon: <TrendingDown className="h-5 w-5" />, color: 'text-red-400' };
        default: return { icon: <Minus className="h-5 w-5" />, color: 'text-muted-foreground' };
    }
}

export function NewsAnalysis({ ticker, analysisResult, monteCarloResult }: NewsAnalysisProps) {
  const [analysis, setAnalysis] = useState<NewsAnalysisType | null>(null);
  const [news, setNewsData] = useState<NewsArticle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBeenLoaded, setHasBeenLoaded] = useState(false);

  const handleLoadNews = async () => {
    
    const momentumAnalysis = analysisResult?.analysis;
    if (!momentumAnalysis || !('signal' in momentumAnalysis) || !monteCarloResult) {
        setError("Momentum analysis and Monte Carlo forecast must be available to run the news divergence analysis. Please ensure data is loaded and calculated first.");
        setHasBeenLoaded(true);
        return;
    }

    setLoading(true);
    setHasBeenLoaded(true);
    setError(null);
    setAnalysis(null);
    setNewsData(null);

    try {
        const newsResult = await fetchNewsSentiment(ticker);
        
        if (newsResult.error || !newsResult.articles || newsResult.articles.length === 0) {
            throw new Error(newsResult.error || "No articles were found for this ticker from the news service.");
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
                momentumSignal: momentumAnalysis.signal,
                monteCarloRange: monteCarloResult.probableRange,
            });
            setAnalysis(analysisResult);
        }

    } catch (e: any) {
        setError(e.message || 'The news service is unavailable or no articles were found.');
    } finally {
        setLoading(false);
    }
  };


  if (hasBeenLoaded && !loading) {
    if (error) {
         return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                        <Newspaper className="h-6 w-6 text-destructive" />
                        <span>News Analysis (AI)</span>
                    </CardTitle>
                    <CardDescription>
                        Could not retrieve news for {ticker}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>News Service Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        <Button onClick={handleLoadNews} disabled={loading} variant="outline" size="sm" className="mt-4">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Try Again
                        </Button>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
      
    if (!news || news.length === 0) {
       return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Newspaper className="h-6 w-6 text-accent" />
                    <span>News Analysis (AI)</span>
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
            <span>News Analysis for {ticker} (AI)</span>
            </CardTitle>
            <CardDescription>
                An AI-powered analysis of news sentiment and its divergence from market momentum.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {analysis ? (
                <>
                    <div className="p-3 rounded-lg bg-muted/50 space-y-3">
                         <div className="space-y-1">
                             <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Divergence Analysis
                            </h3>
                            <p className="text-sm text-foreground">{analysis.divergenceAnalysis}</p>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">News-Only Sentiment:</h3>
                            <div className={`flex items-center gap-1.5 font-semibold text-sm px-2 py-1 rounded-md ${color} bg-background`}>
                                {icon}
                                <span>{analysis.impact}</span>
                            </div>
                        </div>
                         <p className="text-xs text-muted-foreground pt-1">{analysis.newsSummary}</p>
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
                <span>News Analysis (AI)</span>
            </CardTitle>
            <CardDescription>
                Load recent news and generate an AI-powered divergence analysis (vs. Momentum & Forecast). Uses one API request.
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

    