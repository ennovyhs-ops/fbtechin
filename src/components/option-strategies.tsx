

'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, AlertCircle, ChevronDown, Info, BrainCircuit, Bot, AlertTriangle, HelpCircle } from 'lucide-react';
import { suggestOptionStrategies } from '@/ai/flows/suggest-option-strategies';
import type { SuggestOptionStrategiesOutput } from '@/ai/flows/suggest-option-strategies';
import { suggestOptionStrategiesDeterministic } from '@/ai/flows/suggest-option-strategies-deterministic';
import type { SuggestOptionStrategiesDeterministicOutput } from '@/ai/flows/suggest-option-strategies-deterministic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import type { MarketData } from '@/lib/types';


interface OptionStrategiesProps {
  ticker: string;
  analysis: AnalyzeStockMomentumOutput;
  latestClose: string;
  marketData: MarketData[];
}

type LoadingState = {
    ai: boolean;
    deterministic: boolean;
};

export function OptionStrategies({ ticker, analysis, latestClose, marketData }: OptionStrategiesProps) {
  const [aiSuggestions, setAiSuggestions] = useState<SuggestOptionStrategiesOutput | null>(null);
  const [deterministicSuggestion, setDeterministicSuggestion] = useState<SuggestOptionStrategiesDeterministicOutput | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ ai: true, deterministic: true });
  const [error, setError] = useState<LoadingState>({ ai: false, deterministic: false });
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  useEffect(() => {
    if (ticker && analysis?.signal && latestClose) {
        setLoading({ ai: true, deterministic: true });
        setError({ ai: false, deterministic: false });
        setAiSuggestions(null);
        setDeterministicSuggestion(null);

        const fetchAiSuggestions = suggestOptionStrategies({
            ticker,
            latestClose,
            signal: analysis.signal,
        }).then(response => {
            setAiSuggestions(response);
        }).catch(() => {
            setError(e => ({ ...e, ai: true }));
        }).finally(() => {
            setLoading(l => ({ ...l, ai: false }));
        });

        const fetchDeterministicSuggestions = suggestOptionStrategiesDeterministic({
            ticker,
            analysis,
            marketData,
            latestClose,
        }).then(response => {
            setDeterministicSuggestion(response);
        }).catch((e) => {
            console.error("Error fetching deterministic suggestions:", e);
            setError(e => ({...e, deterministic: true}));
        }).finally(() => {
            setLoading(l => ({...l, deterministic: false}));
        });
        
        Promise.all([fetchAiSuggestions, fetchDeterministicSuggestions]);

    }
  }, [ticker, analysis, latestClose, marketData]);

  const isLoading = loading.ai || loading.deterministic;
  const anyError = error.ai || error.deterministic;
  const noSuggestions = (!aiSuggestions || (aiSuggestions.strategies.length === 0 && !aiSuggestions.aggressivePlay)) && 
                        (!deterministicSuggestion || !deterministicSuggestion.strategy);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Lightbulb className="h-6 w-6 text-accent" />
            <span>Generating Option Strategy Ideas...</span>
          </CardTitle>
          <CardDescription>
            AI and rule-based engines are analyzing the momentum score for {ticker}.
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

  if (anyError && noSuggestions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <Lightbulb className="h-6 w-6 text-destructive" />
            <span>Option Strategy Ideas</span>
          </CardTitle>
          <CardDescription>
            Could not generate suggestions for {ticker}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>An error occurred while fetching one or more strategy sets.</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (noSuggestions) return null;
  
  const disclaimerText = aiSuggestions?.disclaimer || deterministicSuggestion?.disclaimer;

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Lightbulb className="h-6 w-6 text-accent" />
          <span>Option Strategy Ideas for {ticker}</span>
        </CardTitle>
        <CardDescription>
          These strategies are generated by two different engines based on historical data and the calculated "{analysis.signal}" signal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* AI-Powered Ideas */}
            <div className="flex flex-col space-y-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                                <Bot className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold text-md text-foreground">AI-Powered Ideas</h3>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p>These suggestions come from a creative AI strategist. It generates a diverse set of unranked ideas based on the momentum signal, including a high-risk speculative play.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {loading.ai ? <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Loading...</div> :
                 error.ai ? <div className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" />Failed to load.</div> :
                 aiSuggestions && (aiSuggestions.strategies.length > 0 || aiSuggestions.aggressivePlay) ? (
                    <>
                        {aiSuggestions.strategies.map((strategy, index) => (
                            <div key={`ai-${index}`} className="p-3 rounded-lg border bg-background/50 text-sm">
                                <h4 className="font-semibold text-sm text-foreground">{strategy.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{strategy.rationale}</p>
                            </div>
                        ))}
                        {aiSuggestions.aggressivePlay && (
                            <div className="space-y-2 pt-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-help">
                                                <AlertTriangle className="h-4 w-4 text-orange-400" />
                                                <h4 className="font-semibold text-sm text-foreground">High-Risk Play</h4>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p>This is a speculative, low-probability 'lotto ticket' play. It's designed to profit from a large, fast move and is very likely to expire worthless.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <div className="p-3 rounded-lg border border-dashed border-orange-400/50 bg-background text-sm">
                                    <h5 className="font-semibold text-sm text-orange-400">{aiSuggestions.aggressivePlay.name}</h5>
                                    <p className="text-xs text-muted-foreground mt-1">{aiSuggestions.aggressivePlay.rationale}</p>
                                </div>
                            </div>
                        )}
                    </>
                 ) : <p className="text-sm text-muted-foreground">No AI suggestions were generated.</p>}
            </div>

            {/* Rule-Based Suggestions */}
             <div className="flex flex-col space-y-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                                <BrainCircuit className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold text-md text-foreground">Top Rule-Based Idea</h3>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs space-y-2">
                             <div>
                                <p><span className="font-semibold text-foreground">This is a deterministic analyst.</span> It follows a strict decision tree based on momentum and volatility to produce a single, optimal strategy for the current conditions.</p>
                             </div>
                            <Separator />
                            <p>This is different from the <span className="font-semibold text-foreground">AI Synthesized Idea</span>, which combines multiple models to create a specific trade plan, rather than a single strategy suggestion.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                
                {loading.deterministic ? <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Loading...</div> :
                 error.deterministic ? <div className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" />Failed to load.</div> :
                 deterministicSuggestion && deterministicSuggestion.strategy ? (
                    <div className="p-3 rounded-lg border bg-background/50 text-sm">
                        <h4 className="font-semibold text-sm text-foreground">{deterministicSuggestion.strategy.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{deterministicSuggestion.strategy.rationale}</p>
                    </div>
                 ) : <p className="text-sm text-muted-foreground">The rule-based engine did not find a suitable strategy.</p>}
            </div>
        </div>

        {disclaimerText && (
            <Collapsible open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen} className="w-full pt-4">
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
                            {disclaimerText}
                        </AlertDescription>
                    </Alert>
                </CollapsibleContent>
            </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
