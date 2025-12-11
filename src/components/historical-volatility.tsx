
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateVolatility } from '@/lib/technical-analysis';
import type { MarketData } from '@/lib/types';
import { Percent, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';

interface HistoricalVolatilityProps {
  marketData: MarketData[];
}

const VolatilityDisplay = ({ label, value }: { label: string, value: number | null }) => {
    const displayValue = value !== null && !isNaN(value) ? `${value.toFixed(2)}%` : 'N/A';
    return (
        <div className="flex flex-col items-center text-center gap-1">
            <span className="font-semibold text-xs text-muted-foreground">{label}</span>
            <span className="font-semibold text-sm text-foreground">{displayValue}</span>
        </div>
    )
}

export function HistoricalVolatility({ marketData }: HistoricalVolatilityProps) {

  const volatility = useMemo(() => {
    const closePrices = marketData.map(d => parseFloat(d.close)).reverse();
    if (closePrices.length < 90) return null; // Ensure enough data for all calculations

    return {
      vol30: calculateVolatility(closePrices, 30),
      vol60: calculateVolatility(closePrices, 60),
      vol90: calculateVolatility(closePrices, 90),
    };
  }, [marketData]);

  if (!volatility) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Percent className="h-6 w-6 text-accent" />
                    <span>Historical Volatility (Calculated)</span>
                </CardTitle>
                <CardDescription>
                    Not enough data for volatility analysis. At least 90 days of data are required.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Percent className="h-6 w-6 text-accent" />
          <span>Historical Volatility (Calculated)</span>
        </CardTitle>
        <div className='flex items-center gap-2'>
            <CardDescription>
                A measure of the stock's price fluctuation over different periods.
            </CardDescription>
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs space-y-2">
                        <div>
                            <p className="font-bold text-foreground">What is Historical Volatility?</p>
                            <p>Annualized historical volatility measures how much a stock's price has fluctuated. It is calculated from the standard deviation of daily logarithmic returns, then scaled to a yearly figure.</p>
                        </div>
                        <Separator />
                        <div>
                            <p><span className="font-semibold text-foreground">Higher percentages</span> indicate a more volatile, riskier stock.</p>
                            <p><span className="font-semibold text-foreground">Lower percentages</span> suggest more price stability.</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
         <div className="flex flex-row justify-around items-center gap-4 sm:gap-6 p-3 rounded-lg bg-muted/50">
            <VolatilityDisplay label="30-Day Volatility" value={volatility.vol30} />
            <VolatilityDisplay label="60-Day Volatility" value={volatility.vol60} />
            <VolatilityDisplay label="90-Day Volatility" value={volatility.vol90} />
        </div>
      </CardContent>
    </Card>
  );
}

    