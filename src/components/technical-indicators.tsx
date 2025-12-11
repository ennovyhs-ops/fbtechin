
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Activity, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import type { RsiData, MacdData, BbandsData, RocData, IndicatorPeriods, MAVolData, VwmaData } from '@/lib/types';
import { isCryptoPair, isCurrencyPair, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
    latestClose: number | null;
}

export function TechnicalIndicators({ ticker, data, loading, error, currency, periods, onPeriodsChange, latestClose }: TechnicalIndicatorsProps) {
    const [localPeriods, setLocalPeriods] = useState(periods);

    const handlePeriodChange = (indicator: keyof Omit<IndicatorPeriods, 'macd' | 'bbands'>, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue > 0) {
            setLocalPeriods(prev => ({ ...prev, [indicator]: numValue }));
        }
    };

    const handleComplexPeriodChange = (indicator: 'macd' | 'bbands', subKey: keyof IndicatorPeriods['macd'] | keyof IndicatorPeriods['bbands'], value: string) => {
        const numValue = parseFloat(value); // Use parseFloat for stdDev
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
    };
    
    if (isCurrencyPair(ticker) || isCryptoPair(ticker)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                        <Activity className="h-6 w-6 text-muted-foreground" />
                        <span>Technical Indicators (Calculated)</span>
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
                        <span>Technical Indicators for {ticker} (Calculated)</span>
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

    const bbandsContext = {
        middle: latestBbands?.['Real Middle Band'] ? parseFloat(latestBbands['Real Middle Band']) : null,
    };
    const bbandsPosition = latestClose && bbandsContext.middle
        ? latestClose > bbandsContext.middle ? 'Bullish' : 'Bearish'
        : null;

    const vwmaContext = latestVwma?.VWMA ? parseFloat(latestVwma.VWMA) : null;
    const vwmaPosition = latestClose && vwmaContext
        ? latestClose > vwmaContext ? 'Bullish' : 'Bearish'
        : null;


    return (
        <TooltipProvider>
            <Card className="animate-in fade-in-50 duration-500 delay-100">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                        <Activity className="h-6 w-6 text-accent" />
                        <span>Technical Indicators for {ticker} (Calculated)</span>
                    </CardTitle>
                    <CardDescription>
                        Latest calculated values based on daily data. You can adjust the periods and update.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        
                        {/* ROC */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">RATE OF CHANGE (ROC)</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>Measures the percentage change in price between the current price and the price a set number of periods ago. It indicates momentum.</p></TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="roc-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                    <Input id="roc-period" type="number" value={localPeriods.roc} onChange={(e) => handlePeriodChange('roc', e.target.value)} className="w-20 h-8 text-sm" />
                                </div>
                            </div>
                            <p className="font-semibold text-sm">{latestRoc?.ROC ? `${latestRoc.ROC}%` : 'N/A'}</p>
                        </div>
                        
                        {/* Bollinger Bands */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">BOLLINGER BANDS®</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>A volatility indicator. When bands are wide, volatility is high. When they are narrow (a 'squeeze'), it signals low volatility and a potential for a large price move.</p></TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <label htmlFor="bbands-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                    <Input id="bbands-period" type="number" value={localPeriods.bbands.period} onChange={(e) => handleComplexPeriodChange('bbands', 'period', e.target.value)} className="w-20 h-8 text-sm" />
                                    <label htmlFor="bbands-stddev" className="text-xs font-medium text-muted-foreground">StdDev</label>
                                    <Input id="bbands-stddev" type="number" step="0.1" value={localPeriods.bbands.stdDev} onChange={(e) => handleComplexPeriodChange('bbands', 'stdDev', e.target.value)} className="w-20 h-8 text-sm" />
                                </div>
                            </div>
                            <div className="flex items-start justify-between">
                                <div className="grid grid-cols-3 gap-2">
                                    <div><p className="text-xs text-muted-foreground">Upper</p><p className="font-semibold text-sm">{formatCurrency(latestBbands?.['Real Upper Band'], currency)}</p></div>
                                    <div><p className="text-xs text-muted-foreground">Middle</p><p className="font-semibold text-sm">{formatCurrency(latestBbands?.['Real Middle Band'], currency)}</p></div>
                                    <div><p className="text-xs text-muted-foreground">Lower</p><p className="font-semibold text-sm">{formatCurrency(latestBbands?.['Real Lower Band'], currency)}</p></div>
                                </div>
                                {bbandsPosition && (
                                    <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${bbandsPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {bbandsPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        Above Mid
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RSI */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">RELATIVE STRENGTH INDEX (RSI)</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>A momentum oscillator that measures the speed and change of price movements on a scale of 0 to 100. A value above 70 is considered 'overbought', and below 30 is 'oversold'.</p></TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="rsi-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                    <Input id="rsi-period" type="number" value={localPeriods.rsi} onChange={(e) => handlePeriodChange('rsi', e.target.value)} className="w-20 h-8 text-sm" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{latestRsi?.RSI ?? 'N/A'}</p>
                                <p className={`font-semibold px-2 py-0.5 rounded-md text-xs ${
                                    rsiStatus === 'Overbought' ? 'bg-red-500/20 text-red-400' : 
                                    rsiStatus === 'Oversold' ? 'bg-green-500/20 text-green-400' : 
                                    'bg-muted text-muted-foreground'
                                }`}>{rsiStatus}</p>
                            </div>
                        </div>

                        {/* Volume */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">VOLUME VS. AVG</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>Compares the most recent trading volume to its moving average. A significant spike in volume can indicate strong conviction behind a price move.</p></TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="mavol-period" className="text-xs font-medium text-muted-foreground">Avg Period</label>
                                    <Input id="mavol-period" type="number" value={localPeriods.maVol} onChange={(e) => handlePeriodChange('maVol', e.target.value)} className="w-20 h-8 text-sm" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-baseline gap-2">
                                     <p className="font-semibold text-sm">{latestMaVol?.volume ? Number(latestMaVol.volume).toLocaleString() : 'N/A'}</p>
                                     <p className="text-xs text-muted-foreground">/ Avg: {latestMaVol?.MAVol ? Number(latestMaVol.MAVol).toLocaleString() : 'N/A'}</p>
                                </div>
                                {isVolumeSpike && (
                                    <div className="flex items-center gap-1 text-orange-400 font-semibold text-xs bg-orange-500/20 px-2 py-0.5 rounded-md">
                                        <Zap className="h-3 w-3" />
                                        Spike
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* MACD */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">MOVING AVG CONVERGENCE DIVERGENCE (MACD)</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>A trend-following momentum indicator that shows the relationship between two moving averages of a security's price. A crossover of the MACD line and signal line can indicate a change in trend.</p></TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <label htmlFor="macd-fast" className="text-xs font-medium text-muted-foreground">Fast</label>
                                    <Input id="macd-fast" type="number" value={localPeriods.macd.fast} onChange={(e) => handleComplexPeriodChange('macd', 'fast', e.target.value)} className="w-20 h-8 text-sm" />
                                    <label htmlFor="macd-slow" className="text-xs font-medium text-muted-foreground">Slow</label>
                                    <Input id="macd-slow" type="number" value={localPeriods.macd.slow} onChange={(e) => handleComplexPeriodChange('macd', 'slow', e.target.value)} className="w-20 h-8 text-sm" />
                                    <label htmlFor="macd-signal" className="text-xs font-medium text-muted-foreground">Signal</label>
                                    <Input id="macd-signal" type="number" value={localPeriods.macd.signal} onChange={(e) => handleComplexPeriodChange('macd', 'signal', e.target.value)} className="w-20 h-8 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div><p className="text-xs text-muted-foreground">MACD</p><p className="font-semibold text-sm">{latestMacd?.MACD ? parseFloat(latestMacd.MACD).toFixed(3) : 'N/A'}</p></div>
                                <div><p className="text-xs text-muted-foreground">Signal</p><p className="font-semibold text-sm">{latestMacd?.MACD_Signal ? parseFloat(latestMacd.MACD_Signal).toFixed(3) : 'N/A'}</p></div>
                                <div><p className="text-xs text-muted-foreground">Hist</p><p className="font-semibold text-sm">{latestMacd?.MACD_Hist ? parseFloat(latestMacd.MACD_Hist).toFixed(3) : 'N/A'}</p></div>
                            </div>
                        </div>

                        {/* VWMA */}
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">VOLUME-WEIGHTED MOVING AVG (VWMA)</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>An average price over a period, where prices with higher trading volume are given more weight. It's often considered a truer representation of the average price.</p></TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="vwma-period" className="text-xs font-medium text-muted-foreground">Period</label>
                                    <Input id="vwma-period" type="number" value={localPeriods.vwma} onChange={(e) => handlePeriodChange('vwma', e.target.value)} className="w-20 h-8 text-sm" />
                                 </div>
                            </div>
                             <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{formatCurrency(latestVwma?.VWMA, currency) ?? 'N/A'}</p>
                                {vwmaPosition && (
                                     <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${vwmaPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {vwmaPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        Price Above
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleUpdateClick} disabled={loading} size="sm">
                            {loading && data ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                            {loading && data ? 'Calculating...' : 'Update All Indicators'}
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
        </TooltipProvider>
    );
}
