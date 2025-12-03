

'use client';

import { useEffect, useState } from 'react';
import { Bot, Loader2, AlertCircle, Sparkles, Wand, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { synthesizeTradeIdea } from '@/ai/flows/synthesize-trade-idea';
import type { CombinedAnalysisResult, MonteCarloResult, SynthesizeTradeIdeaOutput } from '@/lib/types';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


interface SynthesizedTradeIdeaProps {
  ticker: string;
  analysis: CombinedAnalysisResult | null;
  monteCarlo: MonteCarloResult | null;
  currentPrice: number;
  volatility: number | null;
}

const getConvictionColor = (conviction: string) => {
    switch(conviction) {
        case 'High': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'Moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'Low': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'Caution': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-muted text-muted-foreground';
    }
}

export function SynthesizedTradeIdea({ ticker, analysis, monteCarlo, currentPrice, volatility }: SynthesizedTradeIdeaProps) {
  const [idea, setIdea] = useState<SynthesizeTradeIdeaOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const momentumAnalysis = analysis?.analysis;
    const prediction = analysis?.prediction;

    if (!ticker || !momentumAnalysis || !prediction || !('totalScore' in momentumAnalysis) || !('shortTerm' in prediction) || !monteCarlo || !currentPrice || volatility === null) {
      setLoading(false);
      return;
    };

    setLoading(true);
    setError(null);
    setIdea(null);

    synthesizeTradeIdea({
      ticker,
      currentPrice,
      momentumSignal: momentumAnalysis.signal,
      momentumTarget: prediction.shortTerm.priceTarget,
      volatility: volatility,
      monteCarloRange: monteCarlo.probableRange,
      monteCarloConfidence: monteCarlo.confidence
    })
      .then(result => {
        setIdea(result);
      })
      .catch(e => {
        console.error('Failed to get synthesized trade idea:', e);
        setError('The AI strategist could not generate an idea at this time.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ticker, analysis, monteCarlo, currentPrice, volatility]);
  
  if (loading && !idea) {
    return (
       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Sparkles className="h-6 w-6 text-accent" />
                    <span>AI Synthesized Trade Idea</span>
                </CardTitle>
                <CardDescription>
                    The AI strategist is synthesizing the models to form a trade plan...
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating idea...</span>
                </div>
            </CardContent>
        </Card>
    )
  }

  if (error) {
    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Sparkles className="h-6 w-6 text-destructive" />
                    <span>AI Synthesized Trade Idea</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            </CardContent>
        </Card>
    )
  }

  if (!idea) return null;

  return (
    <Card className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          <span>AI Synthesized Trade Idea</span>
        </CardTitle>
        <div className="flex items-center gap-2">
            <CardDescription>
                An actionable plan from the AI based on multiple models.
            </CardDescription>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="max-w-xs space-y-2">
                            <p>The AI acts as a quantitative strategist, synthesizing three models into one idea:</p>
                            <ul className="list-disc list-inside text-xs space-y-1">
                                <li><span className="font-semibold">Momentum Model:</span> Provides a deterministic score (-1 to 1) indicating trend strength.</li>
                                <li><span className="font-semibold">Monte Carlo Model:</span> A probabilistic forecast that provides a likely 30-day price range.</li>
                                <li><span className="font-semibold">Volatility Model:</span> Helps select the right type of option strategy (e.g., buying vs. selling premium).</li>
                            </ul>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
            <h3 className="font-semibold text-lg text-foreground">{idea.strategy}</h3>
            <Badge variant="outline" className={getConvictionColor(idea.conviction)}>
                Conviction: {idea.conviction}
            </Badge>
        </div>

        <div className="space-y-1 border p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-muted-foreground">Rationale</h4>
            <p className="text-sm text-foreground">{idea.rationale}</p>
        </div>
        <div className="space-y-1 border p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-muted-foreground">Actionable Plan</h4>
            <p className="text-sm text-foreground">{idea.action}</p>
        </div>
      </CardContent>
    </Card>
  );
}
