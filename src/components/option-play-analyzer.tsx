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
    expiration: string;
};

let nextId = 2;

export function OptionPlayAnalyzer({ ticker, analysisResult, volatility }: OptionPlayAnalyzerProps) {
  const [legs, setLegs] = useState<OptionLeg[]>([
      { id: 1, action: 'Buy', optionType: 'Call', strikePrice: '', expiration: '' }
  ]);
  const [result, setResult] = useState<AnalyzeOptionPlayOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLegChange = (id: number, field: keyof Omit<OptionLeg, 'id'>, value: string) => {
      setLegs(legs.map(leg => leg.id === id ? { ...leg, [field]: value } : leg));
  };

  const addLeg = () => {
      if (legs.length >= 4) return;
      setLegs([...legs, { id: nextId++, action: 'Sell', optionType: 'Call', strikePrice: '', expiration: '' }]);
  };

  const removeLeg = (id: number) => {
      if (legs.length <= 1) return;
      setLegs(legs.filter(leg => leg.id !== id));
  };

  const handleAnalyze = () => {
    const momentumSignal = analysisResult?.analysis?.signal;

    if (!ticker) {
      setError('Please search for or upload data for a stock first.');
      return;
    }
    if (legs.some(leg => !leg.strikePrice.trim())) {
      setError('Please enter a strike price for all legs.');
      return;
    }
     if (!momentumSignal || typeof volatility !== 'number') {
      setError('Analysis data is not yet available.');
      return;
    }

    setError(null);
    setResult(null);

    const playDescription = legs.map(leg => {
        const expiry = leg.expiration.trim() ? ` expiring ${leg.expiration.trim()}` : ' (assuming a 30-day expiration)';
        return `${leg.action}ing a ${leg.optionType.toLowerCase()} with a strike of $${leg.strikePrice}${expiry}`;
    }).join(' and ') + '.';

    startTransition(async () => {
      try {
        const res = await analyzeOptionPlayAction({
          ticker: ticker as string,
          playDescription,
          momentumSignal: momentumSignal as string,
          volatility: volatility as number,
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
              Build a multi-leg strategy for {ticker ? <strong>{ticker}</strong> : 'the current stock'}.
            </CardDescription>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 space-y-2">
                  <div>
                    <p className="font-bold text-foreground">Custom Strategy Analysis</p>
                    <p>
                      Define a multi-leg strategy for the current ticker. The AI will assess how your play aligns with the <strong>Momentum Signal</strong> and <strong>Historical Volatility</strong> calculated for this asset.
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="font-bold text-foreground">Flexible Input:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Multi-Leg:</strong> Add up to 4 distinct legs to build complex spreads.</li>
                      <li><strong>Expiries:</strong> Enter custom timeframes (e.g. "Next week", "Jan 20"). If left blank, the AI assumes a standard 30-day expiration.</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                {legs.map((leg, index) => (
                    <div key={leg.id} className="space-y-2">
                         <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
                            <div className="sm:col-span-2 space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Action</Label>
                                <Select
                                    value={leg.action}
                                    onValueChange={(value: string) => handleLegChange(leg.id, 'action', value)}
                                    disabled={!ticker || isPending}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Buy">Buy</SelectItem>
                                        <SelectItem value="Sell">Sell</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                                <Select
                                    value={leg.optionType}
                                    onValueChange={(value: string) => handleLegChange(leg.id, 'optionType', value)}
                                    disabled={!ticker || isPending}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Call">Call</SelectItem>
                                        <SelectItem value="Put">Put</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Strike</Label>
                                <Input
                                    type="number"
                                    placeholder="Price"
                                    value={leg.strikePrice}
                                    onChange={(e) => handleLegChange(leg.id, 'strikePrice', e.target.value)}
                                    className="h-8 text-xs"
                                    disabled={!ticker || isPending}
                                />
                            </div>
                            <div className="sm:col-span-4 space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Expiry</Label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Weekly (blank = 30d)"
                                    value={leg.expiration}
                                    onChange={(e) => handleLegChange(leg.id, 'expiration', e.target.value)}
                                    className="h-8 text-xs"
                                    disabled={!ticker || isPending}
                                />
                            </div>
                             <div className="sm:col-span-1 flex justify-end pb-0.5">
                                {legs.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeLeg(leg.id)}
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        {index < legs.length - 1 && <Separator className="my-2 opacity-50" />}
                    </div>
                ))}
                <div className="pt-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={addLeg} 
                        disabled={!ticker || legs.length >= 4 || isPending}
                        className="h-7 text-[10px] font-bold text-muted-foreground hover:text-primary"
                    >
                        <PlusCircle className="mr-1.5 h-3 w-3" />
                        ADD LEG
                    </Button>
                </div>
            </div>
            
            <Button onClick={handleAnalyze} disabled={isPending || !ticker} className="w-full sm:w-auto">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analyze Strategy
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
          <div className="p-4 rounded-lg bg-muted/50 animate-in fade-in-50 duration-500 space-y-4 border border-border">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">AI Contextual Assessment</h3>
              <p className="text-sm text-primary mt-2 font-medium leading-relaxed">{result.contextualAssessment}</p>
            </div>
            
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-xs text-green-500 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Potential Advantages
                </h3>
                <ul className="space-y-2">
                  {result.advantages.map((adv, i) => (
                    <li key={`adv-${i}`} className="flex items-start gap-2 text-xs text-foreground bg-background/40 p-2 rounded border border-green-500/10">
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-xs text-red-400 uppercase tracking-widest flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5" />
                    Potential Risks
                </h3>
                 <ul className="space-y-2">
                  {result.disadvantages.map((dis, i) => (
                    <li key={`dis-${i}`} className="flex items-start gap-2 text-xs text-foreground bg-background/40 p-2 rounded border border-red-500/10">
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