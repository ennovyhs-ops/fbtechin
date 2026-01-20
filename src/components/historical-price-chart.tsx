'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart, ReferenceArea } from 'recharts';
import type { MarketData, BbandsData, RsiData, CombinedAnalysisResult, MonteCarloResult } from '@/lib/types';
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
        color: 'hsl(var(--chart-1))',
    },
    breakdown: {
        label: 'Breakdown Target (S1)',
        color: 'hsl(var(--destructive))',
    }
};

interface HistoricalPriceChartProps {
  marketData: MarketData[];
  indicatorData: {
    bbands: BbandsData[];
    rsi: RsiData[];
  } | null;
  currency: string | null;
  ticker: string;
  analysisResult: CombinedAnalysisResult | null;
  monteCarloResult: MonteCarloResult | null;
}

export function HistoricalPriceChart({ marketData, indicatorData, currency, ticker, analysisResult, monteCarloResult }: HistoricalPriceChartProps) {
  const [zoom, setZoom] = useState('1y');

  const chartData = useMemo(() => {
    if (!marketData || !indicatorData) return [];
    
    const chronologicalData = [...marketData].reverse();
    const chronologicalBbands = [...indicatorData.bbands].reverse();
    const chronologicalRsi = [...indicatorData.rsi].reverse();

    const allData = chronologicalData.map((data, index) => {
        const bbands = chronologicalBbands[index];
        const rsi = chronologicalRsi[index];
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

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.05;

    return [min - padding, max + padding];
  }, [chartData, shortTermTarget, breakoutTarget, breakdownTarget, mcLower, mcUpper, mcAverage]);


  if (!chartData || chartData.length === 0) {
      return null;
  }

  return (
    <Card className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
                <CardTitle className="font-headline text-2xl">Price Chart for {ticker}</CardTitle>
                <CardDescription>
                    Historical price shown with key indicator and model target overlays.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setZoom('3m')} variant={zoom === '3m' ? 'default' : 'outline'} disabled={marketData.length < 63}>3M</Button>
                <Button size="sm" onClick={() => setZoom('6m')} variant={zoom === '6m' ? 'default' : 'outline'} disabled={marketData.length < 126}>6M</Button>
                <Button size="sm" onClick={() => setZoom('1y')} variant={zoom === '1y' ? 'default' : 'outline'} disabled={marketData.length < 252}>1Y</Button>
                <Button size="sm" onClick={() => setZoom('all')} variant={zoom === 'all' ? 'default' : 'outline'}>All</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
         {/* Price Chart with Bollinger Bands */}
         <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 20,
                        left: -10,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                        tickCount={6}
                    />
                    <YAxis 
                        yAxisId="left"
                        domain={yDomainPrice}
                        tickFormatter={(value) => formatCurrency(value, currency).replace(/\.00$/, '')}
                        tick={{ fontSize: 12 }}
                    />
                     <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        formatter={(value: number, name: string, item: any) => {
                            if (name === 'Bollinger Bands') {
                                const { payload } = item;
                                if (payload?.lowerBand && payload?.upperBand) {
                                    return [`${formatCurrency(payload.lowerBand, currency)} - ${formatCurrency(payload.upperBand, currency)}`, 'Bollinger Bands'];
                                }
                                return null;
                            }

                            if (name === 'Price' || name === '20D SMA') {
                                return [formatCurrency(value, currency), name];
                            }
                            
                            if (name === 'RSI') {
                                return [value.toFixed(2), 'RSI'];
                            }

                            return [value, name];
                        }}
                    />
                    <Legend />

                     {/* Monte Carlo Range Area */}
                    {mcLower && mcUpper && (
                        <ReferenceArea 
                            yAxisId="left" 
                            y1={mcLower} 
                            y2={mcUpper} 
                            stroke={chartConfig.monteCarlo.color} 
                            strokeOpacity={0.3} 
                            fill={chartConfig.monteCarlo.color} 
                            fillOpacity={0.08}
                            label={{ value: "MC Range", position: "insideTopRight", fill: chartConfig.monteCarlo.color, fontSize: 10, fillOpacity: 0.6 }}
                        />
                    )}

                    {/* Monte Carlo Average */}
                    {mcAverage && (
                        <ReferenceLine 
                            yAxisId="left" 
                            y={mcAverage} 
                            label={{ value: "MC Avg", position: 'right', fill: chartConfig.monteCarlo.color, fontSize: 10 }}
                            stroke={chartConfig.monteCarlo.color}
                            strokeDasharray="3 3" 
                        />
                    )}

                    {/* Momentum Target */}
                    {shortTermTarget && (
                        <ReferenceLine 
                            yAxisId="left" 
                            y={shortTermTarget} 
                            label={{ value: "Momentum Tgt", position: 'right', fill: chartConfig.shortTermTarget.color, fontSize: 10 }}
                            stroke={chartConfig.shortTermTarget.color}
                            strokeDasharray="3 3" 
                        />
                    )}

                    {/* Breakout Target (R1) - only show if momentum is neutral */}
                    {analysisResult?.analysis?.signal === '⚖️ NEUTRAL' && breakoutTarget && (
                        <ReferenceLine 
                            yAxisId="left" 
                            y={breakoutTarget} 
                            label={{ value: "Breakout (R1)", position: 'right', fill: chartConfig.breakout.color, fontSize: 10 }}
                            stroke={chartConfig.breakout.color}
                            strokeDasharray="5 5" 
                        />
                    )}

                    {/* Breakdown Target (S1) - only show if momentum is neutral */}
                    {analysisResult?.analysis?.signal === '⚖️ NEUTRAL' && breakdownTarget && (
                        <ReferenceLine 
                            yAxisId="left" 
                            y={breakdownTarget} 
                            label={{ value: "Breakdown (S1)", position: 'right', fill: chartConfig.breakdown.color, fontSize: 10 }}
                            stroke={chartConfig.breakdown.color}
                            strokeDasharray="5 5" 
                        />
                    )}

                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="lowerBand"
                        stackId="bollinger"
                        strokeWidth={0}
                        fill="transparent"
                        activeDot={false}
                        legendType="none"
                    />
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="bb_area"
                        stackId="bollinger"
                        name="Bollinger Bands"
                        stroke={chartConfig.upperBand.color}
                        fill={chartConfig.upperBand.color}
                        strokeWidth={1}
                        strokeOpacity={0.3}
                        fillOpacity={0.1}
                        activeDot={false}
                    />

                    <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="price" 
                        stroke={chartConfig.price.color} 
                        strokeWidth={2} 
                        dot={false}
                        name="Price"
                    />
                     <Line 
                        yAxisId="left"
                        type="monotone"
                        dataKey="middleBand"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="20D SMA"
                     />
                </ComposedChart>
            </ResponsiveContainer>
         </div>
         {/* RSI Chart */}
         <div className="h-40 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                     margin={{
                        top: 5,
                        right: 20,
                        left: -10,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                        tickCount={6}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                     <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        formatter={(value: number) => [value.toFixed(2), 'RSI']}
                    />
                    <Legend />
                    <ReferenceLine y={70} label={{ value: "Overbought", position: 'insideTopLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <ReferenceLine y={30} label={{ value: "Oversold", position: 'insideBottomLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="rsi" stroke={chartConfig.rsi.color} strokeWidth={2} dot={false} name="RSI" />
                </LineChart>
            </ResponsiveContainer>
         </div>
      </CardContent>
    </Card>
  );
}
