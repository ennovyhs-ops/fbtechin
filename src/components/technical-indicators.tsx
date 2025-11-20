
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Activity, Target, TrendingUp, TrendingDown, Minus, AreaChart, RefreshCw, BarChart3, Zap } from 'lucide-react';
import type { RsiData, MacdData, BbandsData, RocData, IndicatorPeriods, MAVolData, VwmaData } from '@/lib/types';
import { isCryptoPair, isCurrencyPair, formatCurrency } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface TechnicalIndicatorsProps {
    ticker: string;
    data: {
        rsi: RsiData[];
        macd: MacdData[];
        bbands: BbandsData[];
        roc: RocData[];
        maVol: MAVolData[];
        vwma: VwmaData[];
    } | null;
    loading: boolean;
    error: string | null;
    currency: string | null;
    periods: IndicatorPeriods;
    onPeriodsChange: (periods: IndicatorPeriods) => void;
}

export function TechnicalIndicators({ ticker, data, loading, error, currency, periods, onPeriodsChange }: TechnicalIndicatorsProps) {
    const [localPeriods, setLocalPeriods] = useState(periods);

    const handlePeriodChange = (indicator: keyof Omit<IndicatorPeriods, 'macd' | 'bbands'>, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue > 0) {
            setLocalPeriods(prev => ({ ...prev, [indicator]: numValue }));
        }
    };

    const handleComplexPeriodChange = (indicator: 'macd' | 'bbands', subKey: keyof IndicatorPeriods['macd'] | keyof IndicatorPeriods['bbands'], value: string) => {
        const numValue = parseInt(value, 10);
         if (!isNaN(numValue) && numValue > 0) {
            setLocalPeriods(prev => ({
                ...prev,
                [indicator]: {
                    ...prev[indicator],
                    [subKey]: numValue
                }
            }));
        }
    };


    const handleUpdateClick = () => {
        onPeriodsChange(localPeriods);
    }
    
    if (isCurrencyPair(ticker) || isCryptoPair(ticker)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                        <Activity className="h-6 w-6 text-muted-foreground" />
                        <span>Technical Indicators</span>
                    </CardTitle>
                    <CardDescription>
                        Standard technical indicator analysis is not applicable to currency or crypto pairs.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (loading && !data) { // Show loading only on initial load
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                        <Activity className="h-6 w-6 text-accent" />
                        <span>Technical Indicators for {ticker}</span>
                    </CardTitle>
                    <CardDescription>Loading technical analysis data...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Crunching the numbers...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const latestRsi = data?.rsi?.[0];
    const latestMacd = data?.macd?.[0];
    const latestBbands = data?.bbands?.[0];
    const latestRoc = data?.roc?.[0];
    const latestMaVol = data?.maVol?.[0];
    const latestVwma = data?.vwma?.[0];

    const getRsiStatus = (rsiValue: string | null) => {
        if (rsiValue === null) return 'N/A';
        const rsi = parseFloat(rsiValue);
        if (rsi > 70) return 'Overbought';
        if (rsi < 30) return 'Oversold';
        return 'Neutral';
    };

    const rsiStatus = getRsiStatus(latestRsi?.RSI ?? null);
    
    const isVolumeSpike = latestMaVol?.volume && latestMaVol?.MAVol ? parseFloat(latestMaVol.volume) > parseFloat(latestMaVol.MAVol) * 1.5 : false;


    return (
        <Card className="animate-in fade-in-50 duration-500 delay-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Activity className="h-6 w-6 text-accent" />
                    <span>Technical Indicators for {ticker}</span>
                </CardTitle>
                <CardDescription>
                    Latest calculated values based on daily data. You can adjust the periods and update.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Tabs defaultValue="momentum" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="momentum">Momentum</TabsTrigger>
                        <TabsTrigger value="trend">Trend</TabsTrigger>
                        <TabsTrigger value="volatility">Volatility</TabsTrigger>
                        <TabsTrigger value="volume">Volume</TabsTrigger>
                    </TabsList>
                    <TooltipProvider>
                    
                    {/* Momentum Tab */}
                    <TabsContent value="momentum" className="space-y-6 pt-4">
                        {/* ROC */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-4">
                                <AreaChart className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                                <div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <h3 className="font-semibold text-sm text-muted-foreground cursor-help underline decoration-dotted">Rate of Change (ROC)</h3>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-xs">
                                            <p className="font-bold mb-1">Rate of Change (ROC)</p>
                                            <p>A momentum oscillator that measures the percentage change in price between the current price and the price a certain number of periods ago.</p>
                                            <p className="mt-2"><span className="font-semibold">Interpretation:</span> Positive values suggest upward momentum (buying pressure), while negative values suggest downward momentum (selling pressure). Values crossing zero can signal a trend change.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <p className="font-semibold text-lg">{latestRoc?.ROC ? `${latestRoc.ROC}%` : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="roc-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                <Input id="roc-period" type="number" value={localPeriods.roc} onChange={(e) => handlePeriodChange('roc', e.target.value)} className="w-20 h-8 text-sm" />
                            </div>
                        </div>

                        <Separator />

                        {/* RSI */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-4">
                                <Target className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                                <div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <h3 className="font-semibold text-sm text-muted-foreground cursor-help underline decoration-dotted">Relative Strength Index (RSI)</h3>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-xs">
                                            <p className="font-bold mb-1">Relative Strength Index (RSI)</p>
                                            <p>A momentum oscillator that measures the speed and change of price movements on a scale of 0 to 100.</p>
                                            <p className="mt-2"><span className="font-semibold">Interpretation:</span> A value over 70 is typically considered 'overbought' (potential for a pullback), while a value under 30 is considered 'oversold' (potential for a bounce). These are not sell/buy signals on their own.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <p className="font-semibold text-lg">{latestRsi?.RSI ?? 'N/A'}</p>
                                </div>
                                <p className={`font-semibold px-2 py-1 rounded-md text-xs ${
                                    rsiStatus === 'Overbought' ? 'bg-red-500/20 text-red-400' : 
                                    rsiStatus === 'Oversold' ? 'bg-green-500/20 text-green-400' : 
                                    'bg-muted text-muted-foreground'
                                }`}>{rsiStatus}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="rsi-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                <Input id="rsi-period" type="number" value={localPeriods.rsi} onChange={(e) => handlePeriodChange('rsi', e.target.value)} className="w-20 h-8 text-sm" />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Trend Tab */}
                    <TabsContent value="trend" className="space-y-6 pt-4">
                        {/* MACD */}
                        <div className="flex flex-col items-start gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
                                <div className="flex items-center gap-4">
                                    <Activity className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <h3 className="font-semibold text-sm text-muted-foreground cursor-help underline decoration-dotted">Moving Average Convergence Divergence (MACD)</h3>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-xs">
                                            <p className="font-bold mb-1">Moving Average Convergence Divergence (MACD)</p>
                                            <p>A trend-following momentum indicator that shows the relationship between two exponential moving averages (EMAs) of a security’s price.</p>
                                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                                <li><span className="font-semibold">MACD Line:</span> The difference between the 12-period and 26-period EMAs. It shows short-term momentum.</li>
                                                <li><span className="font-semibold">Signal Line:</span> A 9-period EMA of the MACD Line. It acts as a trigger for buy and sell signals.</li>
                                                <li><span className="font-semibold">Histogram:</span> The difference between the MACD Line and the Signal Line. It shows the strength of the momentum.</li>
                                            </ul>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="flex items-center gap-3 w-full flex-wrap sm:w-auto justify-start sm:justify-end">
                                    <div className="flex items-center gap-1.5">
                                        <label htmlFor="macd-fast" className="text-xs font-medium text-muted-foreground">Fast</label>
                                        <Input id="macd-fast" type="number" value={localPeriods.macd.fast} onChange={(e) => handleComplexPeriodChange('macd', 'fast', e.target.value)} className="w-16 h-8 text-sm" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <label htmlFor="macd-slow" className="text-xs font-medium text-muted-foreground">Slow</label>
                                        <Input id="macd-slow" type="number" value={localPeriods.macd.slow} onChange={(e) => handleComplexPeriodChange('macd', 'slow', e.target.value)} className="w-16 h-8 text-sm" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <label htmlFor="macd-signal" className="text-xs font-medium text-muted-foreground">Signal</label>
                                        <Input id="macd-signal" type="number" value={localPeriods.macd.signal} onChange={(e) => handleComplexPeriodChange('macd', 'signal', e.target.value)} className="w-16 h-8 text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm w-full">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="text-blue-400 h-5 w-5" />
                                    <div><p className="text-muted-foreground">MACD Line</p><p className="font-semibold text-base">{latestMacd?.MACD ? parseFloat(latestMacd.MACD).toFixed(3) : 'N/A'}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="text-orange-400 h-5 w-5" />
                                    <div><p className="text-muted-foreground">Signal Line</p><p className="font-semibold text-base">{latestMacd?.MACD_Signal ? parseFloat(latestMacd.MACD_Signal).toFixed(3) : 'N/A'}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Minus className="text-gray-400 h-5 w-5" />
                                    <div><p className="text-muted-foreground">Histogram</p><p className="font-semibold text-base">{latestMacd?.MACD_Hist ? parseFloat(latestMacd.MACD_Hist).toFixed(3) : 'N/A'}</p></div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    
                    {/* Volatility Tab */}
                     <TabsContent value="volatility" className="space-y-6 pt-4">
                        {/* Bollinger Bands */}
                        <div className="flex flex-col items-start gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
                                <div className="flex items-center gap-4">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground flex-shrink-0"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <h3 className="font-semibold text-sm text-muted-foreground cursor-help underline decoration-dotted">Bollinger Bands®</h3>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-xs">
                                            <p className="font-bold mb-1">Bollinger Bands®</p>
                                            <p>A volatility indicator consisting of a middle band (a simple moving average) and two outer bands that are a set number of standard deviations away.</p>
                                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                                <li><span className="font-semibold">Interpretation:</span> When the bands are wide, volatility is high. When they are narrow (a "squeeze"), volatility is low and a significant price move may be coming. Prices are considered high at the upper band and low at the lower band.</li>
                                            </ul>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="flex items-center gap-3 w-full flex-wrap sm:w-auto justify-start sm:justify-end">
                                    <div className="flex items-center gap-1.5">
                                        <label htmlFor="bbands-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                        <Input id="bbands-period" type="number" value={localPeriods.bbands.period} onChange={(e) => handleComplexPeriodChange('bbands', 'period', e.target.value)} className="w-16 h-8 text-sm" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <label htmlFor="bbands-stddev" className="text-xs font-medium text-muted-foreground">StdDev</label>
                                        <Input id="bbands-stddev" type="number" step="0.1" value={localPeriods.bbands.stdDev} onChange={(e) => handleComplexPeriodChange('bbands', 'stdDev', e.target.value)} className="w-16 h-8 text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm w-full">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="text-green-400 h-5 w-5" />
                                    <div><p className="text-muted-foreground">Upper</p><p className="font-semibold text-base">{formatCurrency(latestBbands?.['Real Upper Band'], currency)}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Minus className="text-gray-400 h-5 w-5" />
                                    <div><p className="text-muted-foreground">Middle</p><p className="font-semibold text-base">{formatCurrency(latestBbands?.['Real Middle Band'], currency)}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="text-red-400 h-5 w-5" />
                                    <div><p className="text-muted-foreground">Lower</p><p className="font-semibold text-base">{formatCurrency(latestBbands?.['Real Lower Band'], currency)}</p></div>
                                </div>
                            </div>
                        </div>
                     </TabsContent>
                     
                      {/* Volume Tab */}
                    <TabsContent value="volume" className="space-y-6 pt-4">
                        {/* Volume */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-4">
                                <BarChart3 className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                                 <div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <h3 className="font-semibold text-sm text-muted-foreground cursor-help underline decoration-dotted">Volume vs. Avg.</h3>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-xs">
                                            <p className="font-bold mb-1">Volume vs. Moving Average</p>
                                            <p>This compares the most recent trading volume to its moving average over a specified period.</p>
                                            <p className="mt-2"><span className="font-semibold">Interpretation:</span> A "volume spike" (volume significantly above its average) can indicate strong conviction behind a price move, confirming a trend or signaling a potential reversal. It's a sign of heightened interest.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <div className="flex items-baseline gap-2">
                                         <p className="font-semibold text-lg">{latestMaVol?.volume ? Number(latestMaVol.volume).toLocaleString() : 'N/A'}</p>
                                         <p className="text-xs text-muted-foreground">/ Avg: {latestMaVol?.MAVol ? Number(latestMaVol.MAVol).toLocaleString() : 'N/A'}</p>
                                    </div>
                                </div>
                                {isVolumeSpike && (
                                    <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-xs bg-orange-500/20 px-2 py-1 rounded-md">
                                        <Zap className="h-3 w-3" />
                                        Volume Spike
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="mavol-period" className="text-xs font-medium text-muted-foreground">Avg. Period</label>
                                <Input id="mavol-period" type="number" value={localPeriods.maVol} onChange={(e) => handlePeriodChange('maVol', e.target.value)} className="w-20 h-8 text-sm" />
                            </div>
                        </div>

                         <Separator />
                        
                        {/* VWMA */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground flex-shrink-0">
                                    <path d="M12 3V5"/><path d="M12 19v2"/><path d="M5 12H3"/><path d="M19 12h2"/>
                                    <path d="M19 5 17.6 6.4"/><path d="m5 19 1.4-1.4"/><path d="M19 19 17.6 17.6"/>
                                    <path d="m5 5 1.4 1.4"/><circle cx="12" cy="12" r="2"/>
                                    <path d="M12 12h.01"/>
                                </svg>
                                 <div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <h3 className="font-semibold text-sm text-muted-foreground cursor-help underline decoration-dotted">Volume-Weighted Moving Avg (VWMA)</h3>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start" className="max-w-xs">
                                            <p className="font-bold mb-1">Volume-Weighted Moving Average (VWMA)</p>
                                            <p>A moving average that gives more weight to prices with higher trading volume. It represents a more 'true' average price by considering trading activity.</p>
                                            <p className="mt-2"><span className="font-semibold">Interpretation:</span> If the price is trading above the VWMA, it can be a bullish sign, suggesting buyers are in control. If it's below, it can be bearish. The VWMA can act as a dynamic support or resistance level.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <p className="font-semibold text-lg">{formatCurrency(latestVwma?.VWMA, currency) ?? 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="vwma-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                <Input id="vwma-period" type="number" value={localPeriods.vwma} onChange={(e) => handlePeriodChange('vwma', e.target.value)} className="w-20 h-8 text-sm" />
                            </div>
                        </div>

                    </TabsContent>

                    </TooltipProvider>
                </Tabs>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleUpdateClick} disabled={loading} size="sm">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        {loading ? 'Calculating...' : 'Update All Indicators'}
                    </Button>
                </div>
                 {error && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Indicator Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
