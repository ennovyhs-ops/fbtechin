
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import { runMonteCarloSimulation } from '@/lib/technical-analysis';
import type { MarketData, MonteCarloResult } from '@/lib/types';
import { formatCurrency, isCryptoPair, isCurrencyPair } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';

interface MonteCarloSimulationProps {
  marketData: MarketData[];
  currency: string | null;
  onSimulationComplete: (result: MonteCarloResult | null) => void;
}

const SIMULATION_DAYS_SHORT = 30;
const SIMULATION_DAYS_LONG = 45;
const NUM_SIMULATIONS = 5000;
const CONFIDENCE_INTERVAL = 0.70; // 70%

type SimulationResults = {
  shortTerm: MonteCarloResult | null;
  longTerm: MonteCarloResult | null;
}

export function MonteCarloSimulation({ marketData, currency, onSimulationComplete }: MonteCarloSimulationProps) {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isForexOrCrypto = useMemo(() => {
    if (!marketData || marketData.length === 0) return false;
    const firstClose = parseFloat(marketData[0].close);
    return isNaN(firstClose);
  }, [marketData]);

  useEffect(() => {
    onSimulationComplete(null);
    if (marketData && marketData.length > 30) {
      setLoading(true);
      setError(null);
      
      setTimeout(() => {
        try {
          const closePrices = marketData.map(d => parseFloat(d.close)).reverse();
          
          const shortTermResult = runMonteCarloSimulation(closePrices, SIMULATION_DAYS_SHORT, NUM_SIMulations, CONFIDENCE_INTERVAL);
          const longTermResult = runMonteCarloSimulation(closePrices, SIMULATION_DAYS_LONG, NUM_SIMULATIONS, CONFIDENCE_INTERVAL);

          if (shortTermResult && longTermResult) {
            setResults({ shortTerm: shortTermResult, longTerm: longTermResult });
            onSimulationComplete(shortTermResult); // Pass the 30-day result up for other components
          } else {
            setError('Could not calculate the required historical drift and volatility.');
          }
        } catch (e: any) {
          setError(e.message || 'An unexpected error occurred during the simulation.');
        } finally {
          setLoading(false);
        }
      }, 50);
    } else if (marketData) {
        setLoading(false);
        setError(`Not enough historical data to run a reliable simulation. At least 30 days of data are required.`);
    }
  }, [marketData, onSimulationComplete]);

  if (isForexOrCrypto) {
      return null;
  }
  
  const ForecastDisplay = ({ term, result }: {term: string, result: MonteCarloResult | null}) => {
    if (!result) return null;
    return (
        <div className="flex flex-col items-center gap-2 text-center flex-1 min-w-[200px]">
            <h3 className="font-semibold text-sm text-muted-foreground">{term} Forecast</h3>
            <div className="flex flex-col items-center">
                <p className="font-bold text-lg text-foreground">
                    {formatCurrency(result.probableRange.lower, currency)} - {formatCurrency(result.probableRange.upper, currency)}
                </p>
                <p className='text-xs text-muted-foreground'>{result.confidence}% Probable Range</p>
            </div>
             <div className="flex flex-col items-center mt-2">
                 <p className="font-bold text-base text-foreground">
                    {formatCurrency(result.averageTarget, currency)}
                </p>
                <p className='text-xs text-muted-foreground'>Avg. Simulated Target</p>
            </div>
        </div>
    )
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M12 14h0"></path><path d="M12 18h0"></path><path d="M12 10h0"></path></svg>
          <span>Monte Carlo Forecast</span>
        </CardTitle>
        <div className='flex items-center gap-2'>
            <CardDescription>
                A probabilistic price forecast based on {NUM_SIMULATIONS.toLocaleString()} simulations.
            </CardDescription>
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className='max-w-xs'>This model simulates thousands of potential future price paths based on the stock's historical trend (drift) and volatility, providing a probable price range rather than a single target.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Running simulations...</span>
          </div>
        )}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Simulation Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {results && !loading && (
          <div className="flex flex-col sm:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50 text-center">
            <ForecastDisplay term="30-Day" result={results.shortTerm} />
            <Separator orientation="vertical" className="h-16 hidden sm:block" />
            <Separator orientation="horizontal" className="w-full sm:hidden" />
            <ForecastDisplay term="45-Day" result={results.longTerm} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    