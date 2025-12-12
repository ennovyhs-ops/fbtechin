

'use client';

import { useEffect, useState } from 'react';
import { Bot, Loader2, AlertCircle, Sparkles, Wand, HelpCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { synthesizeTradeIdea } from '@/ai/flows/synthesize-trade-idea';
import type { CombinedAnalysisResult, MonteCarloResult, SynthesizeTradeIdeaOutput } from '@/lib/types';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';


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
  const [ideas, setIdeas] = useState<SynthesizeTradeIdeaOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSynthesizeIdea = () => {
    const momentumAnalysis = analysis?.analysis;
    const prediction = analysis?.prediction;

    if (!ticker || !momentumAnalysis || !prediction || !('totalScore' in momentumAnalysis) || !('shortTerm' in prediction) || !monteCarlo || !currentPrice || volatility === null) {
      setError("Not all required data is available to generate a trade idea.");
      return;
    };
    
    const pivots = (prediction && 'pivots' in prediction) ? prediction.pivots : undefined;
    const fibonacci = (prediction && 'fibonacci' in prediction) ? prediction.fibonacci : undefined;


    setLoading(true);
    setError(null);
    setIdeas(null);

    synthesizeTradeIdea({
      ticker,
      currentPrice,
      momentumSignal: momentumAnalysis.signal,
      momentumTarget: prediction.shortTerm.priceTarget,
      volatility: volatility,
      monteCarloRange: monteCarlo.probableRange,
      monteCarloConfidence: monteCarlo.confidence,
      pivots,
      fibonacci,
    })
      .then(result => {
        setIdeas(result);
      })
      .catch(e => {
        console.error('Failed to get synthesized trade idea:', e);
        setError('The AI strategist could not generate an idea at this time.');
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  if (!analysis || !monteCarlo || !currentPrice || volatility === null) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          <span>Synthesized Trade Ideas (AI)</span>
        </CardTitle>
        <div className="flex items-center gap-2">
            <CardDescription>
                Actionable plans from the AI based on multiple models.
            </CardDescription>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <p className="font-semibold text-foreground mb-1">How this is generated:</p>
                        <p>The AI acts as a <strong className="text-foreground">quantitative strategist</strong>, synthesizing multiple data points into a coherent trade idea:</p>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                            <li><span className="font-semibold text-foreground">Momentum Model:</span> Provides a deterministic score (-1 to 1) indicating trend strength.</li>
                            <li><span className="font-semibold text-foreground">Monte Carlo Model:</span> A probabilistic forecast that provides a likely 30-day price range.</li>
                            <li><span className="font-semibold text-foreground">Volatility Model:</span> Helps select the right type of option strategy (e.g., buying vs. selling premium).</li>
                             <li><span className="font-semibold text-foreground">Support/Resistance:</span> Uses calculated Pivot Points and Fibonacci levels to select more intelligent strike prices.</li>
                        </ul>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating ideas...</span>
            </div>
        ) : error ? (
             <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
            </div>
        ) : ideas && ideas.ideas.length > 0 ? (
          <div className="space-y-4 animate-in fade-in-50 duration-500">
              {ideas.ideas.map((idea, index) => {
                  const isLotto = idea.strategy.toLowerCase().includes('lotto');
                  return (
                     <div key={index} className={`p-3 rounded-lg border text-sm space-y-3 ${isLotto ? 'bg-orange-500/10 border-orange-500/20' : 'bg-background/50'}`}>
                         <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                              {isLotto && <AlertTriangle className="h-4 w-4 text-orange-400" />}
                              <span>{index + 1}.</span> {idea.strategy}
                            </h3>
                             <Badge variant="outline" className={getConvictionColor(idea.conviction)}>
                                 Conviction: {idea.conviction}
                             </Badge>
                         </div>
                         <p className="text-xs text-left text-muted-foreground"><span className="font-semibold text-primary">RATIONALE:</span> {idea.rationale}</p>
                         <p className="text-xs text-muted-foreground pt-2"><span className="font-semibold text-primary">ACTION:</span> {idea.action}</p>
                     </div>
                  )
              })}
          </div>
        ) : (
            <Button onClick={handleSynthesizeIdea} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Trade Ideas
            </Button>
        )}
      </CardContent>
    </Card>
  );
}

    
