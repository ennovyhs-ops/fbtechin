
'use client';

import { useEffect, useState, useMemo } from 'react';
import { BrainCircuit, Loader2, AlertCircle } from 'lucide-react';
import { suggestDataExplorationQuestions } from '@/ai/flows/suggest-data-exploration-questions';
import { fetchNewsSentiment } from '@/app/actions';
import type { NewsArticle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewsCard } from '@/components/news-card';

interface SuggestedQuestionsProps {
  ticker: string;
}

export function SuggestedQuestions({ ticker }: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      setLoading(true);
      setError(null);
      setNews([]);
      setQuestions([]);

      const getSuggestions = async () => {
        try {
          // Fetch news and suggestions in parallel
          const newsPromise = fetchNewsSentiment(ticker);
          const suggestionsPromise = suggestDataExplorationQuestions({ ticker });

          const [newsResult, suggestionsResult] = await Promise.all([newsPromise, suggestionsPromise]);
          
          if (newsResult.error) {
            console.warn("Could not fetch news:", newsResult.error);
             // Don't block on news error, just proceed without it
          } else if (newsResult.articles) {
            setNews(newsResult.articles);
            // If we got news, get updated suggestions with news context
            const suggestionsWithNews = await suggestDataExplorationQuestions({
                ticker,
                recentNews: newsResult.articles.map(a => a.title)
            });
            setQuestions(suggestionsWithNews.questions);
            return;
          }

          setQuestions(suggestionsResult.questions);
          
        } catch (e) {
            console.error(e);
            setError('Could not generate suggestions at this time.');
        } finally {
            setLoading(false);
        }
      };

      getSuggestions();
    }
  }, [ticker]);

  const topNews = useMemo(() => {
    return news
        .filter(article => article.banner_image)
        .slice(0, 4);
  }, [news]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <BrainCircuit className="h-6 w-6 text-accent" />
          <span>Suggested Exploration</span>
        </CardTitle>
        <CardDescription>
          AI-powered suggestions and recent news for {ticker}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating ideas and fetching news...</span>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && (
            <div className="space-y-4">
                {topNews.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold mb-2">Recent News</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {topNews.map((article) => (
                                <NewsCard key={article.url} article={article} />
                            ))}
                        </div>
                    </div>
                )}
                {questions.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold mb-2 pt-2">Follow-up Questions</h3>
                        <div className="flex flex-wrap gap-2">
                            {questions.map((q, i) => (
                            <Button key={i} variant="outline" className="text-left h-auto whitespace-normal">
                                {q}
                            </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
