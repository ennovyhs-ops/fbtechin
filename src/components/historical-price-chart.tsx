'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart, ReferenceArea, ReferenceDot, Bar } from 'recharts';
import type { MarketData, BbandsData, RsiData, CombinedAnalysisResult, MonteCarloResult, MacdData, MAVolData, EmaData, SmaData } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from './ui/button';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Layers } from "lucide-react";

const chartConfig = {
    price: {
        label: 'Price',
        color: 'hsl(var(--primary))',
    },
    upperBand: {
        label: 'Upper BB',
        color: 'hsl(var(--chart-2))',
    },
    lowerBand: {
        label: 'Lower BB',
        color: 'hsl(var(--chart-2))',
    },
    middleBand: {
        label: 'Middle BB',
        color: 'hsl(var(--chart-2))',
    },
    ema9: {
        label: 'EMA 9',
        color: 'hsl(var(--chart-1))',
    },
    ema20: {
        label: 'EMA 20',
        color: 'hsl(var(--chart-3))',
    },
    sma50: {
        label: 'SMA 50',
        color: 'hsl(var(--chart-4))',
    },
    sma200: {
        label: 'SMA 200',
        color: 'hsl(var(--destructive))',
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
    emaShort1: EmaData[];
    emaShort2: EmaData[];
    smaLong1: SmaData[];
    smaLong2: SmaData[];
  } | null;
  currency: string | null;
  ticker: string;
  analysisResult: CombinedAnalysisResult | null;
  monteCarloResult: MonteCarloResult | null;
}

export function HistoricalPriceChart({ marketData, indicatorData, currency, ticker, analysisResult, monteCarloResult }: HistoricalPriceChartProps) {
  const [zoom, setZoom] = useState('3m');
  const [showBB, setShowBB] = useState(true);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);

  const chartData = useMemo(() => {
    if (!marketData || !indicatorData) return [];
    
    const chronologicalData = [...marketData].reverse();
    const chronologicalBbands = [...indicatorData.bbands].reverse();
    const chronologicalRsi = [...indicatorData.rsi].reverse();
    const chronologicalMacd = [...indicatorData.macd].reverse();
    const chronologicalVol = [...indicatorData.maVol].reverse();
    const chronologicalEma9 = [...indicatorData.emaShort1].reverse();
    const chronologicalEma20 = [...indicatorData.emaShort2].reverse();
    const chronologicalSma50 = [...indicatorData.smaLong1].reverse();
    const chronologicalSma200 = [...indicatorData.smaLong2].reverse();

    const allData = chronologicalData.map((data, index) => {
        const bbands = chronologicalBbands[index];
        const rsi = chronologicalRsi[index];
        const macd = chronologicalMacd[index];
        const vol = chronologicalVol[index];
        const ema9 = chronologicalEma9[index];
        const ema20 = chronologicalEma20[index];
        const sma50 = chronologicalSma50[index];
        const sma200 = chronologicalSma200[index];

        return {
            date: data.date,
            price: parseFloat(data.close),
            upperBand: bbands?.['Real Upper Band'] ? parseFloat(bbands['Real Upper Band']) : null,
            lowerBand: bbands?.['Real Lower Band'] ? parseFloat(bbands['Real Lower Band']) : null,
            middleBand: bbands?.['Real Middle Band'] ? parseFloat(bbands['Real Middle Band']) : null,
            ema9: ema9?.EMA ? parseFloat(ema9.EMA) : null,
            ema20: ema20?.EMA ? parseFloat(ema20.EMA) : null,
            sma50: sma50?.SMA ? parseFloat(sma50.SMA) : null,
            sma200: sma200?.SMA ? parseFloat(sma200.SMA) : null,
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

  const { mcLower, mcUpper } = useMemo(() => {
    if (!monteCarloResult) return {};
    return {
        mcLower: monteCarloResult.probableRange.lower,
        mcUpper: monteCarloResult.probableRange.upper,
    }
  }, [monteCarloResult]);

  const yDomainPrice = useMemo(() => {
    const visibleData = chartData;
    const priceValues = visibleData.flatMap(d => {
        const values = [d.price];
        if (showBB) values.push(d.upperBand, d.lowerBand);
        if (showEMA9) values.push(d.ema9);
        if (showEMA20) values.push(d.ema20);
        if (showSMA50) values.push(d.sma50);
        if (showSMA200) values.push(d.sma200);
        return values;
    }).filter(v => v !== null && !isNaN(v)) as number[];

    const targetValues = [shortTermTarget, breakoutTarget, breakdownTarget, mcLower, mcUpper].filter(v => v !== undefined && v !== null) as number[];
    
    const allValues = [...priceValues, ...targetValues];
    if (allValues.length === 0) return ['auto', 'auto'];

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);

    const padding = (maxVal - minVal) * 0.05 || 1;
    return [minVal - padding, maxVal + padding];
  }, [chartData, shortTermTarget, breakoutTarget, breakdownTarget, mcLower, mcUpper, showBB, showEMA9, showEMA20, showSMA50, showSMA200]);

  if (!chartData || chartData.length === 0) {
      return null;
  }

  return (
    <Card className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Advanced Charting for {ticker}</CardTitle>
                <CardDescription>
                    Price action with Volume and customizable Study overlays.
                </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Layers className="mr-2 h-4 w-4" />
                            Overlay Studies
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Volatility</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={showBB} onCheckedChange={setShowBB}>
                            Bollinger Bands
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Moving Averages</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={showEMA9} onCheckedChange={setShowEMA9}>
                            EMA 9
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={showEMA20} onCheckedChange={setShowEMA20}>
                            EMA 20
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={showSMA50} onCheckedChange={setShowSMA50}>
                            SMA 50
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={showSMA200} onCheckedChange={setShowSMA200}>
                            SMA 200
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20">
                    <Button size="sm" variant={zoom === '3m' ? 'secondary' : 'ghost'} className="h-7 text-xs px-2" onClick={() => setZoom('3m')} disabled={marketData.length < 63}>3M</Button>
                    <Button size="sm" variant={zoom === '6m' ? 'secondary' : 'ghost'} className="h-7 text-xs px-2" onClick={() => setZoom('6m')} disabled={marketData.length < 126}>6M</Button>
                    <Button size="sm" variant={zoom === '1y' ? 'secondary' : 'ghost'} className="h-7 text-xs px-2" onClick={() => setZoom('1y')} disabled={marketData.length < 252}>1Y</Button>
                    <Button size="sm" variant={zoom === 'all' ? 'secondary' : 'ghost'} className="h-7 text-xs px-2" onClick={() => setZoom('all')}>All</Button>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
         <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="date" 
                        hide
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
                    
                    <Bar yAxisId="right" dataKey="volume" fill="hsl(var(--muted-foreground))" opacity={0.1} name="Volume" />
                    
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
                            label={{ value: "Momentum Target", position: 'right', fill: chartConfig.shortTermTarget.color, fontSize: 10 }}
                            stroke={chartConfig.shortTermTarget.color} strokeDasharray="3 3" 
                        />
                    )}

                    {showBB && (
                        <>
                            <Line 
                                yAxisId="left" type="monotone" dataKey="upperBand" 
                                stroke={chartConfig.upperBand.color} strokeWidth={1} strokeDasharray="3 3" dot={false} name="Upper BB"
                            />
                            <Line 
                                yAxisId="left" type="monotone" dataKey="lowerBand" 
                                stroke={chartConfig.lowerBand.color} strokeWidth={1} strokeDasharray="3 3" dot={false} name="Lower BB"
                            />
                            <Line 
                                yAxisId="left" type="monotone" dataKey="middleBand" 
                                stroke={chartConfig.middleBand.color} strokeWidth={1} opacity={0.3} dot={false} name="Middle BB"
                            />
                        </>
                    )}

                    {showEMA9 && (
                        <Line yAxisId="left" type="monotone" dataKey="ema9" stroke={chartConfig.ema9.color} strokeWidth={1.5} dot={false} name="EMA 9" />
                    )}
                    {showEMA20 && (
                        <Line yAxisId="left" type="monotone" dataKey="ema20" stroke={chartConfig.ema20.color} strokeWidth={1.5} dot={false} name="EMA 20" />
                    )}
                    {showSMA50 && (
                        <Line yAxisId="left" type="monotone" dataKey="sma50" stroke={chartConfig.sma50.color} strokeWidth={1.5} dot={false} name="SMA 50" />
                    )}
                    {showSMA200 && (
                        <Line yAxisId="left" type="monotone" dataKey="sma200" stroke={chartConfig.sma200.color} strokeWidth={2} dot={false} name="SMA 200" />
                    )}

                    <Line 
                        yAxisId="left" type="monotone" dataKey="price" 
                        stroke={chartConfig.price.color} strokeWidth={2.5} dot={false} name="Price"
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

         <div className="flex flex-col gap-2">
            <div className="h-32 w-full border rounded-md p-2 bg-muted/5">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
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

            <div className="h-40 w-full border rounded-md p-2 bg-muted/5">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            tick={{ fontSize: 9 }}
                            interval="preserveStartEnd"
                            tickCount={8}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                        <Tooltip contentStyle={{ fontSize: '10px' }} />
                        <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                        <ReferenceLine y={30} stroke="hsl(var(--chart-2))" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="rsi" stroke={chartConfig.rsi.color} strokeWidth={1.5} dot={false} name="RSI" />
                    </LineChart>
                </ResponsiveContainer>
                <div className="text-[10px] text-muted-foreground font-bold px-2 uppercase tracking-tighter -mt-4">Relative Strength (RSI)</div>
            </div>
         </div>
      </CardContent>
    </Card>
  );
}