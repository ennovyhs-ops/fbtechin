'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import type { MonteCarloResult } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';

interface MonteCarloSimulationProps {
  monteCarloResult: MonteCarloResult | null;
  currency: string | null;
  loading: boolean;
}

const SIMULATION_DAYS = 30;
const NUM_SIMULATIONS = 10000;

export function MonteCarloSimulation({ monteCarloResult, currency, loading }: MonteCarloSimulationProps) {
  
  if (loading) {
    return (
       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M12 14h0"></path><path d="M12 18h0"></path><path d="M12 10h0"></path></svg>
                    <span>Monte Carlo Forecast (Calculated)</span>
                </CardTitle>
                 <CardDescription>
                    Running thousands of price path simulations...
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running simulations...</span>
                </div>
            </CardContent>
        </Card>
    );
  }

  if (!monteCarloResult) {
      return (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M12 14h0"></path><path d="M12 18h0"></path><path d="M12 10h0"></path></svg>
                    <span>Monte Carlo Forecast (Calculated)</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Simulation Not Run</AlertTitle>
                    <AlertDescription>
                        The simulation could not be run. This usually means there was not enough historical data (at least 30 days required) or the asset type is not supported.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
      );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M12 14h0"></path><path d="M12 18h0"></path><path d="M12 10h0"></path></svg>
          <span>Monte Carlo Forecast (Calculated)</span>
        </CardTitle>
        <div className='flex items-center gap-2'>
            <CardDescription>
                A probabilistic {SIMULATION_DAYS}-day price forecast based on {NUM_SIMULATIONS.toLocaleString()} simulations.
            </CardDescription>
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs space-y-2">
                        <div>
                            <p className="font-bold text-foreground">How is this calculated?</p>
                            <p>This model simulates thousands of potential future price paths using the stock's historical trend (drift) and volatility. This provides a statistically probable price range, rather than a single price target.</p>
                        </div>
                        <Separator />
                        <div>
                            <p>The <span className="font-semibold text-foreground">Probable Range</span> shows the price range where the stock is statistically likely to land with {monteCarloResult.confidence}% confidence, according to the simulations.</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
          <div className="flex flex-col sm:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50 text-center">
            <div className="flex flex-col items-center gap-2">
                <h3 className="font-semibold text-xs text-muted-foreground">{monteCarloResult.confidence}% Probable Range</h3>
                <p className="font-bold text-base text-foreground">
                    {formatCurrency(monteCarloResult.probableRange.lower, currency)} - {formatCurrency(monteCarloResult.probableRange.upper, currency)}
                </p>
            </div>
             <div className="flex flex-col items-center gap-2">
                 <h3 className="font-semibold text-xs text-muted-foreground">Avg. Simulated Target</h3>
                 <p className="font-bold text-base text-foreground">
                    {formatCurrency(monteCarloResult.averageTarget, currency)}
                </p>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
