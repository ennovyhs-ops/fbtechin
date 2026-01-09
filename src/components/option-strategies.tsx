

'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, AlertCircle, BrainCircuit, AlertTriangle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { suggestOptionStrategiesDeterministic } from '@/ai/flows/suggest-option-strategies-deterministic';
import type { SuggestOptionStrategiesDeterministicOutput } from '@/ai/flows/suggest-option-strategies-deterministic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyzeStockMomentumOutput } from '@/ai/flows/analyze-stock-momentum';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { MarketData } from '@/lib/types';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { Separator } from './ui/separator';
import { Button } from './ui/button';


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
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

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
        <div className="flex items-center gap-2">
            <CardDescription>
                Top strategies selected by a deterministic engine based on momentum and volatility.
            </CardDescription>
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md p-4 space-y-3 text-xs leading-relaxed" side="top" align="start">
                        <div>
                            <p className="font-bold text-sm text-foreground mb-1">How This Engine Works</p>
                            <p>This engine acts as a <strong className="text-foreground">quantitative analyst</strong>, following a strict decision tree to select up to three of the most suitable strategies from its library. The suggestions are prioritized, with the first being the most technically suitable choice.</p>
                        </div>
                        <Separator />
                        <div>
                            <p className="font-semibold text-foreground">Volatility is Key:</p>
                             <ul className="list-disc list-inside mt-1 space-y-1">
                                <li><span className="font-semibold text-primary">High Volatility (Bands Wide):</span> The engine favors strategies that benefit from high option premiums (e.g., selling credit spreads like Bull Puts or Bear Calls).</li>
                                <li><span className="font-semibold text-primary">Low Volatility (Bands Squeezing):</span> It favors strategies that benefit from buying cheaper options (e.g., debit spreads or long calls/puts).</li>
                            </ul>
                        </div>
                        <Separator />
                         <div>
                            <p className="font-bold text-sm text-foreground mb-2">This Engine's Strategy Library:</p>
                            <div className="space-y-2">
                                <div>
                                    <p className="font-semibold text-foreground">Bullish Strategies</p>
                                    <p className="text-muted-foreground">Long Call, Bull Call Spread, Bull Put Spread, Call Ratio Spread</p>
                                </div>
                                 <div>
                                    <p className="font-semibold text-foreground">Bearish Strategies</p>
                                    <p className="text-muted-foreground">Long Put, Bear Put Spread, Bear Call Spread, Put Ratio Spread</p>
                                 </div>
                                 <div>
                                    <p className="font-semibold text-foreground">Neutral / Time Decay Plays</p>
                                    <p className="text-muted-foreground">Iron Condor, Call/Put Calendar Spreads</p>
                                 </div>
                                 <div>
                                    <p className="font-semibold text-foreground">Volatility Expansion Plays</p>
                                    <p className="text-muted-foreground">Strangle, Straddle</p>
                                 </div>
                                 <div>
                                    <p className="font-semibold text-foreground">Aggressive "Lotto Tickets"</p>
                                    <p className="text-muted-foreground">Weekly OTM Call/Put (only on STRONG signals)</p>
                                 </div>
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
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
           <div className="space-y-4">
                {suggestions.strategies.map((strategy, index) => (
                    <div key={`det-${index}`} className={`p-4 rounded-lg border text-sm ${strategy.isAggressive ? 'bg-orange-500/10 border-orange-500/20' : 'bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                             <h3 className="font-semibold text-base text-foreground">{index + 1}. {strategy.name}</h3>
                             {strategy.isAggressive && (
                                <div className="flex-shrink-0 flex items-center gap-1 text-orange-400 font-semibold text-xs bg-orange-500/20 px-2 py-0.5 rounded-md border border-orange-500/30">
                                    <AlertTriangle className="h-3 w-3" />
                                    Aggressive
                                </div>
                             )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold text-primary">RATIONALE:</span> {strategy.rationale}</p>
                        <p className="text-xs text-muted-foreground mt-1"><span className="font-semibold text-primary">ACTION:</span> {strategy.action}</p>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground">The rule-based engine did not find a suitable strategy for the current market conditions.</p>
        )}

        {disclaimerText && (
            <Collapsible open={isDisclaimerOpen} onOpenChange={setIsDisclaimerOpen} className="mt-4">
                <Alert variant="default" className="flex flex-col">
                    <div className="flex items-center justify-between">
                         <div className='flex items-center gap-4'>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-xs">Disclaimer</AlertTitle>
                         </div>
                        <CollapsibleTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isDisclaimerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="sr-only">Toggle disclaimer</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                        <AlertDescription className="pt-2 text-xs">
                            {disclaimerText}
                        </AlertDescription>
                    </CollapsibleContent>
                </Alert>
            </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
