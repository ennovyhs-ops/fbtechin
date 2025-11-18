
'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { suggestDataExplorationQuestions } from '@/ai/flows/suggest-data-exploration-questions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchNewsSentiment } from '@/app/actions';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';


interface SuggestedQuestionsProps {
  ticker: string;
}

export function SuggestedQuestions({ ticker }: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      setLoading(true);
      setError(null);
      setQuestions([]);

      const getSuggestions = async () => {
        try {
            // First, try to fetch recent news
            const newsResult = await fetchNewsSentiment(ticker);
            const recentNewsHeadlines = newsResult.articles?.map(article => article.title) ?? [];

            const suggestions = await suggestDataExplorationQuestions({
                ticker,
                recentNews: recentNewsHeadlines,
            });
            setQuestions(suggestions.questions);
          
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

  const showContent = !loading && !error && questions.length > 0;

  const createGoogleSearchUrl = (query: string) => {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <BrainCircuit className="h-6 w-6 text-accent" />
          <span>Suggested Exploration</span>
        </CardTitle>
        <CardDescription>
          Click a question to instantly search for answers on Google.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating ideas based on recent news...</span>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {showContent && (
            <div className="space-y-4">
                {questions.length > 0 && (
                    <div>
                        <h3 className="text-md font-semibold mb-2 pt-2">Follow-up Questions</h3>
                        <div className="flex flex-wrap gap-2">
                            {questions.map((q, i) => (
                              <a
                                key={i}
                                href={createGoogleSearchUrl(q)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  buttonVariants({ variant: 'outline' }),
                                  'text-left h-auto whitespace-normal'
                                )}
                              >
                                {q}
                              </a>
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
