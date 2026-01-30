'use client';

import { useState, useTransition } from 'react';
import { BrainCircuit, Loader2, AlertCircle, Sparkles, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { analyzeOptionPlayAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { AnalyzeOptionPlayOutput, CombinedAnalysisResult } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';

interface OptionPlayAnalyzerProps {
  ticker: string | null;
  analysisResult: CombinedAnalysisResult | null;
  volatility: number | null;
}

export function OptionPlayAnalyzer({ ticker, analysisResult, volatility }: OptionPlayAnalyzerProps) {
  const [playDescription, setPlayDescription] = useState('');
  const [result, setResult] = useState<AnalyzeOptionPlayOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAnalyze = () => {
    const momentumSignal = analysisResult?.analysis?.signal;

    if (!ticker) {
      setError('Please search for or upload data for a stock first.');
      return;
    }
    if (!playDescription.trim()) {
      setError('Please describe your option play.');
      return;
    }
     if (!momentumSignal || typeof volatility !== 'number') {
      setError('Analysis data is not yet available. Please wait for the initial analysis to complete.');
      return;
    }

    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await analyzeOptionPlayAction({
          ticker,
          playDescription,
          momentumSignal,
          volatility,
        });
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
        <div className="flex items-center gap-2">
            <CardDescription>
              Describe an option play for {ticker ? <strong>{ticker}</strong> : 'the current stock'} to get a contextual assessment from the AI.
            </CardDescription>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 space-y-2">
                  <div>
                    <p className="font-bold text-foreground">How Does This Work?</p>
                    <p>
                      This AI sandbox provides a contextual "second opinion" on an option play you are considering. It does not give financial advice.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="font-bold text-foreground">The AI Considers:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><span className="font-semibold">Your Description:</span> The AI parses your text to understand your strategy's bias (bullish, bearish, neutral).</li>
                      <li><span className="font-semibold">Momentum Signal:</span> It checks if your play aligns with the calculated momentum.</li>
                      <li><span className="font-semibold">Volatility:</span> It considers whether the current volatility makes buying or selling options more or less attractive.</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>
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
          <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in-50 duration-500 space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">AI Contextual Assessment</h3>
              <p className="text-sm text-primary mt-1">{result.contextualAssessment}</p>
            </div>
            
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-green-400 mb-2">Potential Advantages</h3>
                <ul className="space-y-2">
                  {result.advantages.map((adv, i) => (
                    <li key={`adv-${i}`} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-red-400 mb-2">Potential Disadvantages</h3>
                 <ul className="space-y-2">
                  {result.disadvantages.map((dis, i) => (
                    <li key={`dis-${i}`} className="flex items-start gap-2 text-sm text-foreground">
                      <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      <span>{dis}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
