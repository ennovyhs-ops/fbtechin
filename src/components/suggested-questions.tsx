
'use client';

import { useState } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { suggestDataExplorationQuestions } from '@/ai/flows/suggest-data-exploration-questions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';


interface SuggestedQuestionsProps {
  ticker: string;
}

export function SuggestedQuestions({ ticker }: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateQuestions = async () => {
    if (ticker) {
      setLoading(true);
      setError(null);
      setQuestions([]);
      setHasGenerated(true);

      try {
           const suggestions = await suggestDataExplorationQuestions({
              ticker,
          });
          setQuestions(suggestions.questions);
      } catch(e) {
           console.error("Failed to generate questions:", e);
           setError('Could not generate suggestions at this time.');
      } finally {
          setLoading(false);
      }
    }
  };

  const createGoogleSearchUrl = (query: string) => {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  return (
    <Card className="card no-print">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <BrainCircuit className="h-6 w-6 text-accent" />
          <span>Suggested Exploration (AI)</span>
        </CardTitle>
        <CardDescription className="no-print">
          Click a question to instantly search for answers on Google.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground no-print">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating ideas...</span>
          </div>
        ) : error ? (
           <p className="text-sm text-destructive no-print">{error}</p>
        ) : hasGenerated && questions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
                {questions.map((q, i) => (
                  <a
                    key={i}
                    href={createGoogleSearchUrl(q)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'text-left h-auto whitespace-normal no-print text-muted-foreground hover:text-accent-foreground'
                    )}
                  >
                    {q}
                  </a>
                ))}
            </div>
        ) : hasGenerated ? (
            <p className="text-sm text-muted-foreground">The AI could not find any specific questions for this ticker.</p>
        ) : (
            <Button onClick={handleGenerateQuestions} disabled={loading} className="no-print">
                <BrainCircuit className="mr-2 h-4 w-4" />
                Generate Questions
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
