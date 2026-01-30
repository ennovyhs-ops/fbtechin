'use client';

import { useState, useTransition } from 'react';
import { BrainCircuit, Loader2, AlertCircle, Sparkles, HelpCircle, CheckCircle, XCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyzeOptionPlayAction } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { AnalyzeOptionPlayOutput, CombinedAnalysisResult } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


interface OptionPlayAnalyzerProps {
  ticker: string | null;
  analysisResult: CombinedAnalysisResult | null;
  volatility: number | null;
}

type OptionLeg = {
    id: number;
    action: 'Buy' | 'Sell';
    optionType: 'Call' | 'Put';
    strikePrice: string;
};

let nextId = 2;

export function OptionPlayAnalyzer({ ticker, analysisResult, volatility }: OptionPlayAnalyzerProps) {
  const [legs, setLegs] = useState<OptionLeg[]>([
      { id: 1, action: 'Buy', optionType: 'Call', strikePrice: '' }
  ]);
  const [expiration, setExpiration] = useState('');
  const [result, setResult] = useState<AnalyzeOptionPlayOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLegChange = (id: number, field: keyof Omit<OptionLeg, 'id'>, value: string) => {
      setLegs(legs.map(leg => leg.id === id ? { ...leg, [field]: value } : leg));
  };

  const addLeg = () => {
      setLegs([...legs, { id: nextId++, action: 'Sell', optionType: 'Call', strikePrice: '' }]);
  };

  const removeLeg = (id: number) => {
      setLegs(legs.filter(leg => leg.id !== id));
  };


  const handleAnalyze = () => {
    const momentumSignal = analysisResult?.analysis?.signal;

    if (!ticker) {
      setError('Please search for or upload data for a stock first.');
      return;
    }
    if (legs.some(leg => !leg.strikePrice.trim())) {
      setError('Please enter a strike price for all legs to analyze.');
      return;
    }
     if (!momentumSignal || typeof volatility !== 'number') {
      setError('Analysis data is not yet available. Please wait for the initial analysis to complete.');
      return;
    }

    setError(null);
    setResult(null);

    const playDescription = legs.map(leg => 
        `${leg.action === 'Buy' ? 'Buying' : 'Selling'} a ${leg.optionType.toLowerCase()} with a strike of $${leg.strikePrice}`
    ).join(' and ') + (expiration ? ` with a ${expiration} expiration.` : '.');


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
              Build an option play for {ticker ? <strong>{ticker}</strong> : 'the current stock'} to get a contextual assessment from the AI.
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
                      <li><span className="font-semibold">Your Strategy:</span> The AI parses your strategy's structure to understand its bias (bullish, bearish, neutral).</li>
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
        <div className="space-y-4">
            <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Strategy Expiration</Label>
                        <Input
                            id="expiration"
                            type="text"
                            placeholder="e.g., 30-day, weekly"
                            value={expiration}
                            onChange={(e) => setExpiration(e.target.value)}
                            disabled={!ticker}
                        />
                    </div>
                </div>
                 <Separator />
                {legs.map((leg, index) => (
                    <div key={leg.id} className="space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Action</Label>
                                <RadioGroup
                                    value={leg.action}
                                    onValueChange={(value: 'Buy' | 'Sell') => handleLegChange(leg.id, 'action', value)}
                                    className="flex items-center gap-4 pt-2"
                                    disabled={!ticker}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Buy" id={`buy-${leg.id}`} />
                                        <Label htmlFor={`buy-${leg.id}`}>Buy</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Sell" id={`sell-${leg.id}`} />
                                        <Label htmlFor={`sell-${leg.id}`}>Sell</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`option-type-${leg.id}`}>Type</Label>
                                <Select
                                    value={leg.optionType}
                                    onValueChange={(value: 'Call' | 'Put') => handleLegChange(leg.id, 'optionType', value)}
                                    disabled={!ticker}
                                >
                                    <SelectTrigger id={`option-type-${leg.id}`}>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Call">Call</SelectItem>
                                        <SelectItem value="Put">Put</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`strike-price-${leg.id}`}>Strike Price</Label>
                                <Input
                                    id={`strike-price-${leg.id}`}
                                    type="number"
                                    placeholder="e.g., 180"
                                    value={leg.strikePrice}
                                    onChange={(e) => handleLegChange(leg.id, 'strikePrice', e.target.value)}
                                    disabled={!ticker}
                                />
                            </div>
                             {legs.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeLeg(leg.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Leg</span>
                                </Button>
                            )}
                        </div>
                        {index < legs.length - 1 && <Separator />}
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLeg} disabled={!ticker || legs.length >= 4}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Leg (max 4)
                </Button>
            </div>
            
            <Button onClick={handleAnalyze} disabled={isPending || !ticker}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analyze Play
            </Button>
        </div>

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
