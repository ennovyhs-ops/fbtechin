
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart, ReferenceArea, ReferenceDot, Bar } from 'recharts';
import type { MarketData, BbandsData, RsiData, CombinedAnalysisResult, MonteCarloResult, MacdData, MAVolData } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from './ui/button';

const chartConfig = {
    price: {
        label: 'Price',
        color: 'hsl(var(--primary))',
    },
    upperBand: {
        label: 'Upper Band',
        color: 'hsl(var(--chart-2))',
    },
    lowerBand: {
        label: 'Lower Band',
        color: 'hsl(var(--chart-2))',
    },
    rsi: {
        label: 'RSI',
        color: 'hsl(var(--chart-3))',
    },
    macd: {
        label: 'MACD',
        color: 'hsl(var(--chart-1))',
    },
    signal: {
        label: 'Signal',
        color: 'hsl(var(--chart-4))',
    },
    shortTermTarget: {
        label: 'Momentum Target',
        color: 'hsl(var(--chart-4))',
    },
    monteCarlo: {
        label: 'Monte Carlo Range',
        color: 'hsl(var(--chart-5))',
    },
    breakout: {
        label: 'Breakout Target (R1)',
        color: 'hsl(var(--chart-5))',
    },
    breakdown: {
        label: 'Breakdown Target (S1)',
        color: 'hsl(var(--destructive))',
    },
    volume: {
        label: 'Volume',
        color: 'hsl(var(--muted-foreground))',
    }
};

interface HistoricalPriceChartProps {
  marketData: MarketData[];
  indicatorData: {
    bbands: BbandsData[];
    rsi: RsiData[];
    macd: MacdData[];
    maVol: MAVolData[];
  } | null;
  currency: string | null;
  ticker: string;
  analysisResult: CombinedAnalysisResult | null;
  monteCarloResult: MonteCarloResult | null;
}

export function HistoricalPriceChart({ marketData, indicatorData, currency, ticker, analysisResult, monteCarloResult }: HistoricalPriceChartProps) {
  const [zoom, setZoom] = useState('3m');

  const chartData = useMemo(() => {
    if (!marketData || !indicatorData) return [];
    
    const chronologicalData = [...marketData].reverse();
    const chronologicalBbands = [...indicatorData.bbands].reverse();
    const chronologicalRsi = [...indicatorData.rsi].reverse();
    const chronologicalMacd = [...indicatorData.macd].reverse();
    const chronologicalVol = [...indicatorData.maVol].reverse();

    const allData = chronologicalData.map((data, index) => {
        const bbands = chronologicalBbands[index];
        const rsi = chronologicalRsi[index];
        const macd = chronologicalMacd[index];
        const vol = chronologicalVol[index];
        const lower = bbands?.['Real Lower Band'] ? parseFloat(bbands['Real Lower Band']) : null;
        const upper = bbands?.['Real Upper Band'] ? parseFloat(bbands['Real Upper Band']) : null;
        return {
            date: data.date,
            price: parseFloat(data.close),
            upperBand: upper,
            lowerBand: lower,
            bb_area: (lower !== null && upper !== null) ? upper - lower : null,
            middleBand: bbands?.['Real Middle Band'] ? parseFloat(bbands['Real Middle Band']) : null,
            rsi: rsi?.RSI ? parseFloat(rsi.RSI) : null,
            macd: macd?.MACD ? parseFloat(macd.MACD) : null,
            macdSignal: macd?.MACD_Signal ? parseFloat(macd.MACD_Signal) : null,
            macdHist: macd?.MACD_Hist ? parseFloat(macd.MACD_Hist) : null,
            volume: vol?.volume ? parseFloat(vol.volume) : 0,
        }
    });

    const TRADING_DAYS_3M = 63;
    const TRADING_DAYS_6M = 126;
    const TRADING_DAYS_1Y = 252;

    switch(zoom) {
        case '3m':
            return allData.slice(-TRADING_DAYS_3M);
        case '6m':
            return allData.slice(-TRADING_DAYS_6M);
        case '1y':
            return allData.slice(-TRADING_DAYS_1Y);
        case 'all':
        default:
            return allData;
    }

  }, [marketData, indicatorData, zoom]);

  const lastDataPoint = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    return chartData[chartData.length - 1];
  }, [chartData]);
  
  const { 
    shortTermTarget, 
    breakoutTarget, 
    breakdownTarget 
  } = useMemo(() => {
    const prediction = analysisResult?.prediction;
    if (!prediction || 'error' in prediction) return {};

    return {
        shortTermTarget: prediction.shortTerm?.priceTarget,
        breakoutTarget: prediction.pivots?.r1,
        breakdownTarget: prediction.pivots?.s1,
    }
  }, [analysisResult]);

  const { mcLower, mcUpper, mcAverage } = useMemo(() => {
    if (!monteCarloResult) return {};
    return {
        mcLower: monteCarloResult.probableRange.lower,
        mcUpper: monteCarloResult.probableRange.upper,
        mcAverage: monteCarloResult.averageTarget,
    }
  }, [monteCarloResult]);

  const yDomainPrice = useMemo(() => {
    const priceValues = chartData.flatMap(d => [d.upperBand, d.lowerBand, d.price]).filter(v => v !== null && !isNaN(v)) as number[];
    const targetValues = [shortTermTarget, breakoutTarget, breakdownTarget, mcLower, mcUpper, mcAverage].filter(v => v !== undefined && v !== null) as number[];
    
    const allValues = [...priceValues, ...targetValues];
    if (allValues.length === 0) return ['auto', 'auto'];

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);

    const padding = (maxVal - minVal) * 0.05 || 1;
    return [minVal - padding, maxVal + padding];
  }, [chartData, shortTermTarget, breakoutTarget, breakdownTarget, mcLower, mcUpper, mcAverage]);

  if (!chartData || chartData.length === 0) {
      return null;
  }

  return (
    <Card className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
                <CardTitle className="font-headline text-2xl">Advanced Charting for {ticker}</CardTitle>
                <CardDescription>
                    Price action with Volume and MACD momentum overlays.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 no-print">
                <Button size="sm" onClick={() => setZoom('3m')} variant={zoom === '3m' ? 'default' : 'outline'} disabled={marketData.length < 63}>3M</Button>
                <Button size="sm" onClick={() => setZoom('6m')} variant={zoom === '6m' ? 'default' : 'outline'} disabled={marketData.length < 126}>6M</Button>
                <Button size="sm" onClick={() => setZoom('1y')} variant={zoom === '1y' ? 'default' : 'outline'} disabled={marketData.length < 252}>1Y</Button>
                <Button size="sm" onClick={() => setZoom('all')} variant={zoom === 'all' ? 'default' : 'outline'}>All</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
         {/* Main Price Chart */}
         <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        tickCount={6}
                    />
                    <YAxis 
                        yAxisId="left"
                        domain={yDomainPrice}
                        tickFormatter={(value) => formatCurrency(value, currency).replace(/\.00$/, '')}
                        tick={{ fontSize: 10 }}
                    />
                    <YAxis yAxisId="right" orientation="right" hide />
                    
                    <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    
                    <Bar yAxisId="right" dataKey="volume" fill="hsl(var(--muted-foreground))" opacity={0.15} name="Volume" />
                    
                    {mcLower && mcUpper && (
                        <ReferenceArea 
                            yAxisId="left" y1={mcLower} y2={mcUpper} 
                            stroke={chartConfig.monteCarlo.color} strokeOpacity={0.2} 
                            fill={chartConfig.monteCarlo.color} fillOpacity={0.05}
                        />
                    )}

                    {shortTermTarget && (
                        <ReferenceLine 
                            yAxisId="left" y={shortTermTarget} 
                            label={{ value: "Tgt", position: 'right', fill: chartConfig.shortTermTarget.color, fontSize: 10 }}
                            stroke={chartConfig.shortTermTarget.color} strokeDasharray="3 3" 
                        />
                    )}

                    <Area
                        yAxisId="left" type="monotone" dataKey="bb_area"
                        stroke={chartConfig.upperBand.color} fill={chartConfig.upperBand.color}
                        strokeWidth={1} strokeOpacity={0.2} fillOpacity={0.05} activeDot={false}
                        name="Bollinger Bands"
                    />

                    <Line 
                        yAxisId="left" type="monotone" dataKey="price" 
                        stroke={chartConfig.price.color} strokeWidth={2} dot={false} name="Price"
                    />
                     {lastDataPoint && (
                        <ReferenceDot
                            yAxisId="left" x={lastDataPoint.date} y={lastDataPoint.price} r={4}
                            fill={chartConfig.price.color} stroke="white" strokeWidth={2}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MACD Chart */}
            <div className="h-48 w-full border rounded-md p-2 bg-muted/5">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="date" hide />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="macdHist" name="Hist" fill="hsl(var(--muted-foreground))" opacity={0.3} />
                        <Line type="monotone" dataKey="macd" stroke={chartConfig.macd.color} strokeWidth={1.5} dot={false} name="MACD" />
                        <Line type="monotone" dataKey="macdSignal" stroke={chartConfig.signal.color} strokeWidth={1} strokeDasharray="3 3" dot={false} name="Signal" />
                        <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={0.5} />
                    </ComposedChart>
                </ResponsiveContainer>
                <div className="text-[10px] text-muted-foreground font-bold px-2 uppercase tracking-tighter">MACD Oscillator</div>
            </div>

            {/* RSI Chart */}
            <div className="h-48 w-full border rounded-md p-2 bg-muted/5">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                        <ReferenceLine y={30} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="rsi" stroke={chartConfig.rsi.color} strokeWidth={1.5} dot={false} name="RSI" />
                    </LineChart>
                </ResponsiveContainer>
                <div className="text-[10px] text-muted-foreground font-bold px-2 uppercase tracking-tighter">Relative Strength (RSI)</div>
            </div>
         </div>
      </CardContent>
    </Card>
  );
}
