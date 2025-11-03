'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { suggestDataExplorationQuestions } from '@/ai/flows/suggest-data-exploration-questions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
      suggestDataExplorationQuestions({ ticker })
        .then((response) => {
          setQuestions(response.questions);
        })
        .catch(() => {
          setError('Could not generate suggestions at this time.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [ticker]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <BrainCircuit className="h-6 w-6 text-accent" />
          <span>Suggested Exploration</span>
        </CardTitle>
        <CardDescription>
          Here are some AI-powered suggestions for your next query about {ticker}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating ideas...</span>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && (
          <div className="flex flex-wrap gap-2">
            {questions.map((q, i) => (
              <Button key={i} variant="outline" className="text-left h-auto whitespace-normal">
                {q}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
