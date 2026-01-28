
'use client';

import { useState, useTransition } from 'react';
import { BrainCircuit, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { analyzeOptionPlayAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { AnalyzeOptionPlayOutput } from '@/lib/types';

export function OptionPlayAnalyzer({ ticker }: { ticker: string | null }) {
  const [playDescription, setPlayDescription] = useState('');
  const [result, setResult] = useState<AnalyzeOptionPlayOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAnalyze = () => {
    if (!ticker) {
      setError('Please search for or upload data for a stock first.');
      return;
    }
    if (!playDescription.trim()) {
      setError('Please describe your option play.');
      return;
    }

    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await analyzeOptionPlayAction({ ticker, playDescription });
        setResult(res);
      } catch (e: any) {
        console.error('Failed to analyze option play:', e);
        setError('The AI could not analyze the play at this time.');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <BrainCircuit className="h-6 w-6 text-accent" />
          <span>Option Play Sandbox (AI)</span>
        </CardTitle>
        <CardDescription>
          Describe an option play for {ticker ? <strong>{ticker}</strong> : 'the current stock'} to get a simple assessment from the AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={ticker ? `e.g., 'Buying a 30-day call with a strike of $180' or 'Selling a weekly put below the current price'` : 'Load a stock to enable the sandbox.'}
          value={playDescription}
          onChange={(e) => setPlayDescription(e.target.value)}
          rows={3}
          disabled={!ticker}
        />
        <Button onClick={handleAnalyze} disabled={isPending || !ticker}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Analyze Play
        </Button>
        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {result && (
            <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in-50 duration-500">
                <h3 className="font-semibold text-sm text-muted-foreground">AI Assessment for {ticker}</h3>
                <p className="font-bold text-lg text-primary">{result.assessment}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
