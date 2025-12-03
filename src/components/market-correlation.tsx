
'use client';

import { useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, BarChart, TrendingUp, TrendingDown, Upload } from 'lucide-react';
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

    const basePerformance = baseSeries[baseSeries.length - 1].performance;
    const comparisonPerformance = comparisonSeries[comparisonSeries.length - 1].performance;

    let conclusion = '';
    let explanation = '';
    const difference = basePerformance - comparisonPerformance;
    if (difference > 5) {
        conclusion = `${baseTicker} is significantly outperforming ${comparisonTickerName}.`;
        explanation = `This indicates that over the past 90 days, ${baseTicker} has shown stronger upward momentum or greater resilience to downside pressure compared to ${comparisonTickerName}. Investors often look for this "relative strength" as a positive sign.`
    } else if (difference < -5) {
        conclusion = `${baseTicker} is significantly underperforming ${comparisonTickerName}.`;
        explanation = `This means that ${baseTicker} has either declined more or gained less than ${comparisonTickerName} over the last 90 days. This "relative weakness" can be a cause for caution or further investigation.`
    } else {
        conclusion = `${baseTicker} is performing similarly to ${comparisonTickerName}.`;
        explanation = `The performance of ${baseTicker} is closely tracking that of ${comparisonTickerName}, suggesting it is moving in line with its benchmark. This can indicate that broader market trends are the primary driver of its price.`
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
          <span>Market Correlation Analysis</span>
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
                        <Input
                            id="comparison-ticker"
                            placeholder="e.g., SPY, QQQ"
                            value={comparisonTicker}
                            onInput={(e) => setComparisonTicker(e.currentTarget.value.toUpperCase())}
                            className="mt-1"
                            disabled={isPending}
                        />
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
