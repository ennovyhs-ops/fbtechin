'use client';

import { useState, useTransition } from 'react';
import { BrainCircuit, Loader2, AlertCircle, Sparkles, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
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

export function OptionPlayAnalyzer({ ticker, analysisResult, volatility }: OptionPlayAnalyzerProps) {
  const [action, setAction] = useState<'Buy' | 'Sell'>('Buy');
  const [optionType, setOptionType] = useState<'Call' | 'Put'>('Call');
  const [strikePrice, setStrikePrice] = useState('');
  const [expiration, setExpiration] = useState('');
  const [result, setResult] = useState<AnalyzeOptionPlayOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAnalyze = () => {
    const momentumSignal = analysisResult?.analysis?.signal;

    if (!ticker) {
      setError('Please search for or upload data for a stock first.');
      return;
    }
    if (!strikePrice.trim()) {
      setError('Please enter a strike price to analyze.');
      return;
    }
     if (!momentumSignal || typeof volatility !== 'number') {
      setError('Analysis data is not yet available. Please wait for the initial analysis to complete.');
      return;
    }

    setError(null);
    setResult(null);

    const playDescription = `${action === 'Buy' ? 'Buying' : 'Selling'} a ${expiration ? expiration + ' ' : ''}${optionType.toLowerCase()} with a strike of $${strikePrice}`;

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
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                    <Label>Action</Label>
                    <RadioGroup
                        value={action}
                        onValueChange={(value: 'Buy' | 'Sell') => setAction(value)}
                        className="flex items-center gap-4 pt-2"
                        disabled={!ticker}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Buy" id="buy" />
                            <Label htmlFor="buy">Buy</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Sell" id="sell" />
                            <Label htmlFor="sell">Sell</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="option-type">Type</Label>
                    <Select
                        value={optionType}
                        onValueChange={(value: 'Call' | 'Put') => setOptionType(value)}
                        disabled={!ticker}
                    >
                        <SelectTrigger id="option-type">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Call">Call</SelectItem>
                            <SelectItem value="Put">Put</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="strike-price">Strike Price</Label>
                    <Input
                        id="strike-price"
                        type="number"
                        placeholder="e.g., 180"
                        value={strikePrice}
                        onChange={(e) => setStrikePrice(e.target.value)}
                        disabled={!ticker}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expiration">Expiration</Label>
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
