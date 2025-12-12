

'use client';

import { useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, BarChart, TrendingUp, TrendingDown, Upload, X } from 'lucide-react';
import { fetchMarketData } from '@/app/actions';
import type { MarketData } from '@/lib/types';
import { Separator } from './ui/separator';
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line } from 'recharts';

interface MarketCorrelationProps {
  baseTicker: string;
  baseMarketData: MarketData[];
}

interface PerformanceDataPoint {
  date: string;
  base: number;
  comparison: number;
}

interface AnalysisResult {
  baseTicker: string;
  comparisonTicker: string;
  basePerformance: number;
  comparisonPerformance: number;
  chartData: PerformanceDataPoint[];
  conclusion: string;
  explanation: string;
}

const ANALYSIS_DAYS = 90;

const calculatePerformanceSeries = (data: MarketData[]): { date: string, performance: number }[] => {
  const relevantData = data.slice(0, ANALYSIS_DAYS).reverse(); // Oldest to newest
  if (relevantData.length === 0) return [];
  
  const startPrice = parseFloat(relevantData[0].close);
  if (isNaN(startPrice) || startPrice === 0) return [];

  return relevantData.map(d => ({
      date: d.date,
      performance: ((parseFloat(d.close) - startPrice) / startPrice) * 100,
  }));
};

export function MarketCorrelation({ baseTicker, baseMarketData }: MarketCorrelationProps) {
  const [comparisonTicker, setComparisonTicker] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const performAnalysis = (
    comparisonData: MarketData[],
    comparisonTickerName: string
  ) => {

    const baseSeries = calculatePerformanceSeries(baseMarketData);
    const comparisonSeries = calculatePerformanceSeries(comparisonData);

    if (baseSeries.length < ANALYSIS_DAYS || comparisonSeries.length < ANALYSIS_DAYS) {
        setError(`Not enough historical data for a ${ANALYSIS_DAYS}-day comparison for one or both tickers.`);
        setAnalysis(null);
        return;
    }

    const chartData = baseSeries.map((basePoint, index) => ({
      date: basePoint.date,
      base: basePoint.performance,
      comparison: comparisonSeries[index]?.performance,
    }));
    
    // --- Enhanced Analysis Logic ---
    const midPointIndex = Math.floor(chartData.length / 2);
    const endPointIndex = chartData.length - 1;

    const basePerformance = chartData[endPointIndex].base;
    const comparisonPerformance = chartData[endPointIndex].comparison;
    const finalDifference = basePerformance - comparisonPerformance;
    
    const midBasePerformance = chartData[midPointIndex].base;
    const midComparisonPerformance = chartData[midPointIndex].comparison;
    const midDifference = midBasePerformance - midComparisonPerformance;

    let conclusion = '';
    let explanation = '';

    if (finalDifference > 5) {
        conclusion = `${baseTicker} Demonstrates Strong Relative Strength`;
        if (midDifference < 0 && finalDifference > 5) { // Was lagging, now leading
             explanation = `After lagging behind ${comparisonTickerName} for the first half of the period, ${baseTicker} has shown a significant positive reversal, strongly outperforming in the last 45 days. This sharp divergence suggests a recent catalyst or a fundamental shift in momentum has favored ${baseTicker}.`;
        } else { // Consistent outperformance
             explanation = `Over the past 90 days, ${baseTicker} has consistently and significantly outperformed ${comparisonTickerName}. This sustained 'relative strength' indicates robust buying interest and superior resilience, a key bullish indicator for many investors.`;
        }
    } else if (finalDifference < -5) {
        conclusion = `${baseTicker} Shows Signs of Relative Weakness`;
         if (midDifference > 0 && finalDifference < -5) { // Was leading, now lagging
             explanation = `Despite outperforming ${comparisonTickerName} in the first half of the period, ${baseTicker} has experienced a negative reversal, significantly underperforming in the latter 45 days. This recent divergence signals a potential loss of momentum or new headwinds affecting ${baseTicker}.`;
        } else { // Consistent underperformance
             explanation = `Compared to ${comparisonTickerName}, ${baseTicker} has demonstrated consistent underperformance over the last 90 days. This 'relative weakness' signals lagging momentum and may warrant a more cautious stance, as it struggles to keep pace with its benchmark.`;
        }
    } else {
        conclusion = `Performance is Highly Correlated with Benchmark`;
        if (Math.abs(midDifference) > 10) { // Was divergent, now converged
            explanation = `While there were periods of significant divergence, the performance of ${baseTicker} has recently reconverged with ${comparisonTickerName}. This indicates that while company-specific factors may have caused short-term volatility, its performance has now realigned with the broader trends of its benchmark.`;
        } else { // Consistently correlated
            explanation = `The performance of ${baseTicker} has been closely tracking that of ${comparisonTickerName}, with no significant divergence over the 90-day period. This suggests that its price action is primarily driven by broader market or sector trends, rather than company-specific catalysts.`;
        }
    }


    setAnalysis({
        baseTicker,
        comparisonTicker: comparisonTickerName,
        basePerformance,
        comparisonPerformance,
        chartData,
        conclusion,
        explanation
    });
    setError(null);
  };

  const handleApiAnalysis = () => {
    startTransition(async () => {
      if (!comparisonTicker) {
        setError('Please enter a ticker to compare against.');
        return;
      }
      
      const comparisonResult = await fetchMarketData(comparisonTicker.toUpperCase(), 'compact');
      if (comparisonResult.error) {
        setError(comparisonResult.error);
        return;
      }
      if (!comparisonResult.data || comparisonResult.data.length === 0) {
        setError(`No data found for comparison ticker: ${comparisonTicker.toUpperCase()}`);
        return;
      }
      
      performAnalysis(comparisonResult.data, comparisonTicker.toUpperCase());
    });
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setAnalysis(null);

    startTransition(async () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                setError('Failed to read the file.');
                return;
            }
            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
                const headerLine = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
                if (!headerLine.includes('date') || !headerLine.includes('close')) {
                    throw new Error("CSV file must contain 'date' and 'close' headers.");
                }
                const dateIndex = headerLine.indexOf('date');
                const closeIndex = headerLine.indexOf('close');

                const data: MarketData[] = lines.slice(1).map((line) => {
                    const values = line.split(',');
                    return {
                        date: values[dateIndex],
                        close: values[closeIndex],
                        open: values[closeIndex], // Fill with close as fallback
                        high: values[closeIndex],
                        low: values[closeIndex],
                        volume: '0',
                    };
                }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (data.length === 0) {
                    setError('CSV file is empty or in an invalid format.');
                    return;
                }
                
                const comparisonTickerName = file.name.split('.')[0].toUpperCase() || 'Uploaded CSV';
                performAnalysis(data, comparisonTickerName);

            } catch (err: any) {
                setError(`Error parsing CSV: ${err.message}`);
            }
        };
        reader.readAsText(file);
    });
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  }

  const resetAnalysis = () => {
    setAnalysis(null); 
    setError(null); 
    setComparisonTicker('');
  }

  const PerformanceDisplay = ({ label, value }: { label: string, value: number }) => {
    const isPositive = value >= 0;
    const color = isPositive ? 'text-green-400' : 'text-red-400';
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
        <div className="flex flex-col items-center text-center gap-1">
            <span className="font-semibold text-sm text-muted-foreground">{label} (90-Day)</span>
            <div className={`flex items-center gap-1.5 font-bold text-2xl ${color}`}>
                <Icon className="h-6 w-6" />
                <span>{value.toFixed(2)}%</span>
            </div>
        </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <BarChart className="h-6 w-6 text-accent" />
          <span>Market Correlation (Calculated)</span>
        </CardTitle>
        <CardDescription>
          Compare {baseTicker}'s 90-day performance against a market index or another stock.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis && (
            <div className='space-y-4'>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <div className="flex-grow w-full">
                        <label htmlFor="comparison-ticker" className="text-sm font-medium text-foreground">
                            Comparison Ticker (uses 1 API request)
                        </label>
                        <div className="relative mt-1">
                            <Input
                                id="comparison-ticker"
                                placeholder="e.g., SPY, QQQ"
                                value={comparisonTicker}
                                onInput={(e) => setComparisonTicker(e.currentTarget.value.toUpperCase())}
                                className={comparisonTicker ? 'pr-8' : ''}
                                disabled={isPending}
                            />
                            {comparisonTicker && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => setComparisonTicker('')}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Clear</span>
                                </Button>
                            )}
                        </div>
                    </div>
                    <Button onClick={handleApiAnalysis} disabled={isPending || !comparisonTicker} className="w-full sm:w-auto">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isPending ? 'Analyzing...' : 'Load & Compare'}
                    </Button>
                </div>
                <div className="relative flex items-center justify-center">
                    <Separator className="w-full" />
                    <span className="absolute bg-card px-2 text-xs text-muted-foreground">OR</span>
                </div>
                <div>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv"
                        className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isPending} className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CSV for Comparison
                    </Button>
                     <p className="text-xs text-muted-foreground mt-2 text-center">
                        CSV must have 'date' and 'close' columns. No API request will be used.
                    </p>
                </div>
            </div>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <Button variant="link" size="sm" onClick={resetAnalysis} className="p-0 h-auto mt-2 text-destructive">Try again</Button>
            </Alert>
        )}
        
        {analysis && (
            <div className="animate-in fade-in-50 duration-500 space-y-6">
                <div className="h-64 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analysis.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                angle={-30}
                                textAnchor="end"
                                height={40}
                                tick={{ fontSize: 12 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis 
                                tickFormatter={(tick) => `${tick}%`}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))'
                                }}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="base" name={analysis.baseTicker} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="comparison" name={analysis.comparisonTicker} stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                 <div className="flex flex-col md:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50">
                    <PerformanceDisplay label={analysis.baseTicker} value={analysis.basePerformance} />
                    <Separator orientation="vertical" className="h-16 hidden md:block" />
                    <Separator orientation="horizontal" className="w-full md:hidden" />
                    <PerformanceDisplay label={analysis.comparisonTicker} value={analysis.comparisonPerformance} />
                </div>
                <div className="pt-2 space-y-1">
                    <h3 className="font-semibold text-base">{analysis.conclusion}</h3>
                    <p className="text-sm text-muted-foreground max-w-2xl">{analysis.explanation}</p>
                </div>
                <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={resetAnalysis} disabled={isPending}>
                        Run New Comparison
                    </Button>
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
