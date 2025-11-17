
'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, AlertCircle, ChevronDown, Brain, Bot } from 'lucide-react';
import { suggestOptionStrategies } from '@/ai/flows/suggest-option-strategies';
import { suggestOptionStrategiesDeterministic } from '@/ai/flows/suggest-option-strategies-deterministic';
import type { SuggestOptionStrategiesOutput } from '@/ai/flows/suggest-option-strategies';
import type { SuggestOptionStrategiesDeterministicOutput } from '@/ai/flows/suggest-option-strategies-deterministic';

import type { MarketData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Separator } from './ui/separator';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface OptionStrategiesProps {
  ticker: string;
  analysis: AnalyzeStockMomentumOutput;
  latestClose: string;
  marketData: MarketData[];
}

export function OptionStrategies({ ticker, analysis, latestClose, marketData }: OptionStrategiesProps) {
  const [aiSuggestions, setAiSuggestions] = useState<SuggestOptionStrategiesOutput | null>(null);
  const [deterministicSuggestions, setDeterministicSuggestions] = useState<SuggestOptionStrategiesDeterministicOutput | null>(null);
  
  const [aiLoading, setAiLoading] = useState(true);
  const [deterministicLoading, setDeterministicLoading] = useState(true);
  
  const [aiError, setAiError] = useState<string | null>(null);
  const [deterministicError, setDeterministicError] = useState<string | null>(null);

  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  useEffect(() => {
    if (ticker && analysis?.signal && latestClose) {
      setAiLoading(true);
      setAiError(null);
      suggestOptionStrategies({ ticker, analysis, latestClose })
        .then(response => {
          setAiSuggestions(response);
        })
        .catch(() => {
          setAiError('AI suggestions could not be generated at this time.');
        })
        .finally(() => {
          setAiLoading(false);
        });
    }
  }, [ticker, analysis, latestClose]);
  
  useEffect(() => {
    if (ticker && analysis && latestClose && marketData) {
      setDeterministicLoading(true);
      setDeterministicError(null);
      suggestOptionStrategiesDeterministic({
        ticker,
        totalScore: analysis.totalScore,
        marketData,
        latestClose
      })
      .then(response => {
        setDeterministicSuggestions(response);
      })
      .catch((e) => {
        console.error("Deterministic suggestions error:", e);
        setDeterministicError('Rule-based suggestions could not be generated at this time.');
      })
      .finally(() => {
        setDeterministicLoading(false);
      });
    }
  }, [ticker, analysis, latestClose, marketData]);

  const hasContent = (aiSuggestions && aiSuggestions.strategies.length > 0) || 
                     (deterministicSuggestions && deterministicSuggestions.strategies.length > 0);
  const isLoading = aiLoading || deterministicLoading;

  if (isLoading && !hasContent && !aiError && !deterministicError) {
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

  if (!hasContent) return null;

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Lightbulb className="h-6 w-6 text-accent" />
          <span>Option Strategy Ideas for {ticker}</span>
        </CardTitle>
        <CardDescription>
          Based on the "{analysis.signal}" signal, here are potential strategies from our AI and rule-based engines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {aiLoading ? (
           <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading AI Ideas...</span></div>
        ) : aiError ? (
           <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /><span>{aiError}</span></div>
        ) : aiSuggestions && aiSuggestions.strategies.length > 0 && (
            <div className="space-y-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="flex items-center gap-2 font-semibold text-md text-foreground cursor-help">
                                <Bot className="h-5 w-5 text-muted-foreground" />
                                AI Suggestions
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">These strategies are generated by a large language model (AI). They are creative and based on a broad understanding of financial concepts, not a fixed set of rules.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {aiSuggestions.strategies.map((strategy, index) => (
                    <div key={`ai-${index}`} className="p-4 rounded-lg border bg-background">
                        <h4 className="font-semibold text-md text-foreground">{strategy.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{strategy.rationale}</p>
                    </div>
                ))}
            </div>
        )}

        {aiSuggestions && deterministicSuggestions && aiSuggestions.strategies.length > 0 && deterministicSuggestions.strategies.length > 0 && (
            <Separator />
        )}

        {deterministicLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Loading Rule-Based Ideas...</span></div>
        ) : deterministicError ? (
            <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /><span>{deterministicError}</span></div>
        ) : deterministicSuggestions && deterministicSuggestions.strategies.length > 0 && (
             <div className="space-y-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <h3 className="flex items-center gap-2 font-semibold text-md text-foreground cursor-help">
                                <Brain className="h-5 w-5 text-muted-foreground" />
                                Rule-Based Suggestions
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">These strategies are generated by a deterministic, rule-based system. They are based on specific technical indicator conditions being met and will always produce the same result for the same inputs.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {deterministicSuggestions.strategies.map((strategy, index) => (
                    <div key={`det-${index}`} className="p-4 rounded-lg border bg-background">
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
                        {aiSuggestions?.disclaimer || deterministicSuggestions?.disclaimer}
                    </AlertDescription>
                </Alert>
            </CollapsibleContent>
          </Collapsible>
      </CardContent>
    </Card>
  );
}
