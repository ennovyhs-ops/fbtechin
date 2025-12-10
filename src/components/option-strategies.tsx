

'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, AlertCircle, BrainCircuit } from 'lucide-react';
import { suggestOptionStrategiesDeterministic } from '@/ai/flows/suggest-option-strategies-deterministic';
import type { SuggestOptionStrategiesDeterministicOutput } from '@/ai/flows/suggest-option-strategies-deterministic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { MarketData } from '@/lib/types';


interface OptionStrategiesProps {
  ticker: string;
  analysis: AnalyzeStockMomentumOutput;
  latestClose: string;
  marketData: MarketData[];
}


export function OptionStrategies({ ticker, analysis, latestClose, marketData }: OptionStrategiesProps) {
  const [suggestions, setSuggestions] = useState<SuggestOptionStrategiesDeterministicOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ticker && analysis?.signal && marketData.length > 0) {
        setLoading(true);
        setError(false);
        setSuggestions(null);

        suggestOptionStrategiesDeterministic({
            ticker,
            analysis,
            marketData,
            latestClose,
        }).then(response => {
            setSuggestions(response);
        }).catch((e) => {
            console.error("Error fetching deterministic suggestions:", e);
            setError(true);
        }).finally(() => {
            setLoading(false);
        });
    }
  }, [ticker, analysis, marketData, latestClose]);
  
  const disclaimerText = suggestions?.disclaimer;

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Lightbulb className="h-6 w-6 text-accent" />
          <span>Rule-Based Option Strategy Ideas</span>
        </CardTitle>
        <CardDescription>
          Top two strategies selected by a deterministic engine based on the "{analysis.signal}" signal and the current volatility environment. This is not AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading rule-based ideas...</span>
            </div>
        ) : error ? (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Could not generate the rule-based strategy idea.</AlertDescription>
            </Alert>
        ) : suggestions && suggestions.strategies.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.strategies.map((strategy, index) => (
                    <div key={`det-${index}`} className="p-3 rounded-lg border bg-background/50 text-sm">
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                             <BrainCircuit className="h-4 w-4" />
                            {index === 0 ? 'Primary Strategy:' : 'Alternative Strategy:'}
                        </h4>
                        <p className="font-bold text-base mt-2">{strategy.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{strategy.rationale}</p>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground">The rule-based engine did not find a suitable strategy for the current market conditions.</p>
        )}

        {disclaimerText && (
            <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Disclaimer</AlertTitle>
                <AlertDescription>
                    {disclaimerText}
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
