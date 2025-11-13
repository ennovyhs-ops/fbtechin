'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, AlertCircle, ChevronDown, Brain, Bot } from 'lucide-react';
import { suggestOptionStrategies } from '@/ai/flows/suggest-option-strategies';
import type { OptionStrategy, MarketData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Separator } from './ui/separator';

interface OptionStrategiesProps {
  ticker: string;
  analysis: AnalyzeStockMomentumOutput;
  latestClose: string;
  marketData: MarketData[];
}

interface DualSuggestions {
    aiStrategies: OptionStrategy[];
    deterministicStrategies: OptionStrategy[];
    disclaimer: string;
}

export function OptionStrategies({ ticker, analysis, latestClose, marketData }: OptionStrategiesProps) {
  const [suggestions, setSuggestions] = useState<DualSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  useEffect(() => {
    if (ticker && analysis?.signal && latestClose && marketData) {
      setLoading(true);
      setError(null);
      suggestOptionStrategies({ ticker, analysis, latestClose, marketData })
        .then(response => {
          setSuggestions(response);
        })
        .catch(() => {
          setError('Could not generate option strategy suggestions at this time.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [ticker, analysis, latestClose, marketData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Lightbulb className="h-6 w-6 text-accent" />
            <span>Generating Option Strategy Ideas...</span>
          </CardTitle>
          <CardDescription>
            The AI and rule-based engines are analyzing the momentum score for {ticker}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Lightbulb className="h-6 w-6 text-destructive" />
            <span>Option Strategy Ideas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || (suggestions.aiStrategies.length === 0 && suggestions.deterministicStrategies.length === 0)) return null;

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Lightbulb className="h-6 w-6 text-accent" />
          <span>Option Strategy Ideas for {ticker}</span>
        </CardTitle>
        <CardDescription>
          Based on the "{analysis.signal}" signal, here are some potential strategies from our AI and rule-based engines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {suggestions.aiStrategies.length > 0 && (
            <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-md text-foreground">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    AI Suggestions
                </h3>
                {suggestions.aiStrategies.map((strategy, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-background">
                        <h4 className="font-semibold text-md text-foreground">{strategy.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{strategy.rationale}</p>
                    </div>
                ))}
            </div>
        )}

        {suggestions.aiStrategies.length > 0 && suggestions.deterministicStrategies.length > 0 && (
            <Separator />
        )}

        {suggestions.deterministicStrategies.length > 0 && (
             <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-md text-foreground">
                    <Brain className="h-5 w-5 text-muted-foreground" />
                    Rule-Based Suggestions
                </h3>
                {suggestions.deterministicStrategies.map((strategy, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-background">
                        <h4 className="font-semibold text-md text-foreground">{strategy.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{strategy.rationale}</p>
                    </div>
                ))}
            </div>
        )}


         <Collapsible open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen} className="w-full pt-2">
            <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                    Disclaimer
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${isDisclaimerOpen ? 'rotate-180' : ''}`} />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <Alert variant="default" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Disclaimer</AlertTitle>
                    <AlertDescription>
                        {suggestions.disclaimer}
                    </AlertDescription>
                </Alert>
            </CollapsibleContent>
          </Collapsible>
      </CardContent>
    </Card>
  );
}
