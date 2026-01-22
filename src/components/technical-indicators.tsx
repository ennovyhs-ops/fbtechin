

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Activity, Zap, TrendingUp, TrendingDown, ChevronsUp, ChevronsDown, Info, Minus } from 'lucide-react';
import type { RsiData, MacdData, BbandsData, RocData, IndicatorPeriods, MAVolData, VwmaData, ObvData, StochasticData, CmfData, MarketData, EmaData } from '@/lib/types';
import { isCryptoPair, isCurrencyPair, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';

interface TechnicalIndicatorsProps {
    ticker: string;
    data: {
        rsi: RsiData[];
        macd: MacdData[];
        bbands: BbandsData[];
        roc: RocData[];
        maVol: MAVolData[];
        vwma: VwmaData[];
        obv: ObvData[];
        stochastic: StochasticData[];
        cmf: CmfData[];
        emaShort: EmaData[];
        emaLong: EmaData[];
    } | null;
    loading: boolean;
    error: string | null;
    currency: string | null;
    periods: IndicatorPeriods;
    onPeriodsChange: (periods: IndicatorPeriods) => void;
    latestClose: number | null;
    marketData: MarketData[] | null;
}

export function TechnicalIndicators({ ticker, data, loading, error, currency, periods, onPeriodsChange, latestClose, marketData }: TechnicalIndicatorsProps) {
    const [localPeriods, setLocalPeriods] = useState(periods);
    
    const isSynthesizedData = useMemo(() => {
        if (!marketData || marketData.length === 0) return false;
        // Check a sample of recent data to avoid iterating over a huge array
        const sample = marketData.slice(0, 20);
        return sample.every(d => d.high === d.low);
    }, [marketData]);

    const handlePeriodChange = (indicator: keyof Omit<IndicatorPeriods, 'macd' | 'bbands' | 'stochastic' | 'cmf'>, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue > 0) {
            setLocalPeriods(prev => ({ ...prev, [indicator]: numValue }));
        }
    };

    const handleComplexPeriodChange = (indicator: 'macd' | 'bbands' | 'stochastic', subKey: keyof IndicatorPeriods['macd'] | keyof IndicatorPeriods['bbands'] | keyof IndicatorPeriods['stochastic'], value: string) => {
        const numValue = parseFloat(value); // Use parseFloat for stdDev
         if (!isNaN(numValue) && numValue > 0) {
            setLocalPeriods(prev => ({
                ...prev,
                [indicator]: {
                    ...(prev[indicator] as any),
                    [subKey]: numValue
                }
            }));
        }
    };
    
    const handleCmfPeriodChange = (indicator: 'cmf', value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue > 0) {
            setLocalPeriods(prev => ({ ...prev, [indicator]: numValue }));
        }
    };

    const handleUpdateClick = () => {
        onPeriodsChange(localPeriods);
    };
    
    const TrendIcon = ({ current, previous, precision = 3, formatter }: { current: string | null | undefined, previous: string | null | undefined, precision?: number, formatter?: (val: number) => string }) => {
        if (current === null || previous === null || current === undefined || previous === undefined) return null;
        const currentVal = parseFloat(current);
        const prevVal = parseFloat(previous);
        if (isNaN(currentVal) || isNaN(prevVal)) return null;

        const diff = currentVal - prevVal;
        
        const displayVal = formatter ? formatter(prevVal) : prevVal.toFixed(precision);

        let Icon, color;
        if (Math.abs(diff) < 1e-5) {
            Icon = Minus;
            color = 'text-muted-foreground';
        } else {
            const isUp = diff > 0;
            Icon = isUp ? TrendingUp : TrendingDown;
            color = isUp ? 'text-green-400' : 'text-red-400';
        }

        return (
            <>
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <span className="text-xs text-muted-foreground shrink-0">(was {displayVal})</span>
            </>
        );
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
    const prevRsi = data?.rsi?.[1];
    const latestMacd = data?.macd?.[0];
    const prevMacd = data?.macd?.[1];
    const latestBbands = data?.bbands?.[0];
    const latestRoc = data?.roc?.[0];
    const prevRoc = data?.roc?.[1];
    const latestMaVol = data?.maVol?.[0];
    const prevMaVol = data?.maVol?.[1];
    const latestVwma = data?.vwma?.[0];
    const prevVwma = data?.vwma?.[1];
    const latestEmaShort = data?.emaShort?.[0];
    const prevEmaShort = data?.emaShort?.[1];
    const latestEmaLong = data?.emaLong?.[0];
    const prevEmaLong = data?.emaLong?.[1];
    const latestObv = data?.obv?.[0];
    const prevObv = data?.obv?.[1];
    const latestStochastic = data?.stochastic?.[0];
    const prevStochastic = data?.stochastic?.[1];
    const latestCmf = data?.cmf?.[0];
    const prevCmf = data?.cmf?.[1];


    const getRsiStatus = (rsiValue: string | null) => {
        if (rsiValue === null) return 'N/A';
        const rsi = parseFloat(rsiValue);
        if (rsi > 70) return 'Overbought';
        if (rsi < 30) return 'Oversold';
        return 'Neutral';
    };

    const getStochasticStatus = (k: string | null) => {
        if (k === null) return 'N/A';
        const kVal = parseFloat(k);
        if (kVal > 80) return 'Overbought';
        if (kVal < 20) return 'Oversold';
        return 'Neutral';
    }

    const rsiStatus = getRsiStatus(latestRsi?.RSI ?? null);
    const stochasticStatus = getStochasticStatus(latestStochastic?.k ?? null);
    
    const isVolumeSpike = latestMaVol?.volume && latestMaVol?.MAVol ? parseFloat(latestMaVol.volume) > parseFloat(latestMaVol.MAVol) * 1.5 : false;

    const bbandsContext = {
        middle: latestBbands?.['Real Middle Band'] ? parseFloat(latestBbands['Real Middle Band']) : null,
    };
    
    const vwmaPosition = latestVwma?.VWMA && latestClose && parseFloat(latestVwma.VWMA)
        ? latestClose > parseFloat(latestVwma.VWMA) ? 'Bullish' : 'Bearish'
        : null;
        
    let crossStatus: 'Golden Cross' | 'Death Cross' | 'Bullish' | 'Bearish' | null = null;
    if (latestEmaShort?.EMA && latestEmaLong?.EMA && prevEmaShort?.EMA && prevEmaLong?.EMA) {
        const latestShort = parseFloat(latestEmaShort.EMA);
        const latestLong = parseFloat(latestEmaLong.EMA);
        const prevShort = parseFloat(prevEmaShort.EMA);
        const prevLong = parseFloat(prevEmaLong.EMA);

        if (!isNaN(latestShort) && !isNaN(latestLong) && !isNaN(prevShort) && !isNaN(prevLong)) {
            if (prevShort <= prevLong && latestShort > latestLong) {
                crossStatus = 'Golden Cross';
            } else if (prevShort >= prevLong && latestShort < latestLong) {
                crossStatus = 'Death Cross';
            } else if (latestShort > latestLong) {
                crossStatus = 'Bullish';
            } else {
                crossStatus = 'Bearish';
            }
        }
    }
        
    const rocValue = latestRoc?.ROC ? parseFloat(latestRoc.ROC) : null;
    const rocPosition = rocValue !== null ? (rocValue > 0 ? 'Bullish' : 'Bearish') : null;

    const macdLine = latestMacd?.MACD ? parseFloat(latestMacd.MACD) : null;
    const signalLine = latestMacd?.MACD_Signal ? parseFloat(latestMacd.MACD_Signal) : null;
    const macdPosition = macdLine !== null && signalLine !== null ? (macdLine > signalLine ? 'Bullish' : 'Bearish') : null;
    
    const obvTrend = latestObv?.OBV && prevObv?.OBV
        ? parseFloat(latestObv.OBV) > parseFloat(prevObv.OBV) ? 'Rising' : 'Falling'
        : null;
        
    const cmfValue = latestCmf?.CMF ? parseFloat(latestCmf.CMF) : null;
    const cmfPosition = cmfValue !== null ? (cmfValue > 0 ? 'Bullish' : 'Bearish') : null;
    
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
                <CardContent className="space-y-4">
                    {/* MACD */}
                    <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">MOVING AVG CONVERGENCE DIVERGENCE (MACD)</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                        <p className="font-bold text-foreground">What is MACD?</p>
                                        <p>A trend-following momentum indicator that shows the relationship between two exponential moving averages (EMAs) of a security's price.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground">How to Interpret It:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li><span className="text-green-400 font-semibold">Crossovers:</span> A bullish signal occurs when the MACD Line crosses above the Signal Line. A bearish signal is when it crosses below.</li>
                                            <li><span className="font-semibold">Divergence:</span> When the stock price makes a new high/low but the MACD does not, it can signal a potential reversal.</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Common Setting</p>
                                        <p>The standard parameters are a 12-period fast EMA, a 26-period slow EMA, and a 9-period signal line EMA.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                                <div className="flex items-center gap-1">
                                    <label htmlFor="macd-fast" className="text-xs font-medium text-muted-foreground">F:</label>
                                    <Input id="macd-fast" type="number" value={localPeriods.macd.fast} onChange={(e) => handleComplexPeriodChange('macd', 'fast', e.target.value)} className="w-16 h-7 text-sm" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <label htmlFor="macd-slow" className="text-xs font-medium text-muted-foreground">S:</label>
                                    <Input id="macd-slow" type="number" value={localPeriods.macd.slow} onChange={(e) => handleComplexPeriodChange('macd', 'slow', e.target.value)} className="w-16 h-7 text-sm" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <label htmlFor="macd-signal" className="text-xs font-medium text-muted-foreground">Sig:</label>
                                    <Input id="macd-signal" type="number" value={localPeriods.macd.signal} onChange={(e) => handleComplexPeriodChange('macd', 'signal', e.target.value)} className="w-16 h-7 text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <div className="grid grid-cols-3 gap-x-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">MACD</p>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-semibold text-sm">{latestMacd?.MACD ? parseFloat(latestMacd.MACD).toFixed(3) : 'N/A'}</p>
                                        <TrendIcon current={latestMacd?.MACD} previous={prevMacd?.MACD} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Signal</p>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-semibold text-sm">{latestMacd?.MACD_Signal ? parseFloat(latestMacd.MACD_Signal).toFixed(3) : 'N/A'}</p>
                                        <TrendIcon current={latestMacd?.MACD_Signal} previous={prevMacd?.MACD_Signal} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Hist</p>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-semibold text-sm">{latestMacd?.MACD_Hist ? parseFloat(latestMacd.MACD_Hist).toFixed(3) : 'N/A'}</p>
                                        <TrendIcon current={latestMacd?.MACD_Hist} previous={prevMacd?.MACD_Hist} />
                                    </div>
                                </div>
                            </div>
                            {macdPosition && (
                                <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${macdPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {macdPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {macdPosition === 'Bullish' ? 'Above Signal' : 'Below Signal'}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* ROC */}
                    <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">RATE OF CHANGE (ROC)</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                    <p className="font-bold text-foreground">What is ROC?</p>
                                    <p>The Rate of Change (ROC) is a momentum-based technical indicator that measures the percentage change in price between the current price and the price a certain number of periods ago.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                    <p className="font-bold text-foreground">How to Interpret It:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li><span className="font-semibold text-green-400">Positive Values:</span> Indicate upward buying pressure or momentum. A cross above the zero line can signal the start of an uptrend.</li>
                                        <li><span className="font-semibold text-red-400">Negative Values:</span> Indicate downward selling pressure. A cross below the zero line can signal the start of a downtrend.</li>
                                    </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Common Settings</p>
                                        <p>Commonly used periods are between 10 and 20. A 22-day period is often used to approximate monthly momentum.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-1">
                                <label htmlFor="roc-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                <Input id="roc-period" type="number" value={localPeriods.roc} onChange={(e) => handlePeriodChange('roc', e.target.value)} className="w-16 h-7 text-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm">{latestRoc?.ROC ? `${parseFloat(latestRoc.ROC).toFixed(2)}%` : 'N/A'}</p>
                                <TrendIcon current={latestRoc?.ROC} previous={prevRoc?.ROC} precision={2} />
                            </div>
                            {rocPosition && (
                                <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${rocPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {rocPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {rocPosition === 'Bullish' ? 'Positive' : 'Negative'}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* RSI */}
                    <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">RELATIVE STRENGTH INDEX (RSI)</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                    <p className="font-bold text-foreground">What is RSI?</p>
                                    <p>A momentum oscillator that measures the speed and magnitude of a security's recent price changes on a scale of 0 to 100.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                    <p className="font-bold text-foreground">How to Interpret It:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li><span className="font-semibold text-red-400">Overbought (Above 70):</span> Suggests the asset may be overvalued and could be due for a pullback.</li>
                                        <li><span className="font-semibold text-green-400">Oversold (Below 30):</span> Suggests the asset may be undervalued and could be due for a bounce.</li>
                                        <li><span className="font-semibold text-primary">Centerline (50):</span> RSI movements above 50 generally indicate a bullish trend, while movements below 50 indicate a bearish trend.</li>
                                    </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Common Setting</p>
                                        <p>The standard and most widely used period for RSI is 14.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-1">
                                <label htmlFor="rsi-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                <Input id="rsi-period" type="number" value={localPeriods.rsi} onChange={(e) => handlePeriodChange('rsi', e.target.value)} className="w-16 h-7 text-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm">{latestRsi?.RSI ? parseFloat(latestRsi.RSI).toFixed(2) : 'N/A'}</p>
                                <TrendIcon current={latestRsi?.RSI} previous={prevRsi?.RSI} precision={2} />
                            </div>
                            <p className={`font-semibold px-2 py-0.5 rounded-md text-xs ${
                                rsiStatus === 'Overbought' ? 'bg-red-500/20 text-red-400' : 
                                rsiStatus === 'Oversold' ? 'bg-green-500/20 text-green-400' : 
                                'bg-muted text-muted-foreground'
                            }`}>{rsiStatus}</p>
                        </div>
                    </div>
                     {/* Stochastic Oscillator */}
                    {isSynthesizedData ? (
                        <div className="p-3 border rounded-lg space-y-2 bg-muted/50 border-dashed">
                             <h3 className="font-semibold text-xs text-muted-foreground">STOCHASTIC OSCILLATOR</h3>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Info className="h-4 w-4" />
                                <p>Not applicable. This indicator requires distinct high and low price data for calculation.</p>
                             </div>
                        </div>
                    ) : (
                        <div className="p-3 border rounded-lg space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">STOCHASTIC OSCILLATOR</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-3 space-y-2">
                                        <div>
                                            <p className="font-bold text-foreground">What is the Stochastic Oscillator?</p>
                                            <p>It's a momentum indicator that compares a security's closing price to its price range over a specific period. It is designed to show overbought and oversold conditions on a scale of 0 to 100.</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="font-bold text-foreground">How to Interpret It:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                <li><span className="text-red-400 font-semibold">Overbought:</span> Readings above 80 suggest the asset might be due for a pullback.</li>
                                                <li><span className="text-green-400 font-semibold">Oversold:</span> Readings below 20 suggest the asset might be due for a bounce.</li>
                                                <li><span className="font-semibold">Crossovers:</span> A bullish signal can occur when the %K line crosses above the %D line, especially in oversold territory.</li>
                                            </ul>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="font-bold text-foreground mb-1">Common Setting</p>
                                            <p>The most common parameters are a 14-period lookback for %K, with a 3-period smoothing for both the %K and %D lines.</p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                                    <div className="flex items-center gap-1">
                                        <label htmlFor="stoch-k" className="text-xs font-medium text-muted-foreground">P:</label>
                                        <Input id="stoch-k" type="number" value={localPeriods.stochastic.kPeriod} onChange={(e) => handleComplexPeriodChange('stochastic', 'kPeriod', e.target.value)} className="w-12 h-7 text-sm" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label htmlFor="stoch-d" className="text-xs font-medium text-muted-foreground">K%:</label>
                                        <Input id="stoch-d" type="number" value={localPeriods.stochastic.kSlowing} onChange={(e) => handleComplexPeriodChange('stochastic', 'kSlowing', e.target.value)} className="w-12 h-7 text-sm" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label htmlFor="stoch-slowing" className="text-xs font-medium text-muted-foreground">D%:</label>
                                        <Input id="stoch-slowing" type="number" value={localPeriods.stochastic.dSlowing} onChange={(e) => handleComplexPeriodChange('stochastic', 'dSlowing', e.target.value)} className="w-12 h-7 text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                                <div className="grid grid-cols-2 gap-x-4">
                                     <div>
                                        <p className="text-xs text-muted-foreground">%K Line</p>
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-semibold text-sm">{latestStochastic?.k ? parseFloat(latestStochastic.k).toFixed(2) : 'N/A'}</p>
                                            <TrendIcon current={latestStochastic?.k} previous={prevStochastic?.k} precision={2} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">%D Line</p>
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-semibold text-sm">{latestStochastic?.d ? parseFloat(latestStochastic.d).toFixed(2) : 'N/A'}</p>
                                            <TrendIcon current={latestStochastic?.d} previous={prevStochastic?.d} precision={2} />
                                        </div>
                                    </div>
                                </div>
                                <p className={`font-semibold px-2 py-0.5 rounded-md text-xs ${
                                    stochasticStatus === 'Overbought' ? 'bg-red-500/20 text-red-400' : 
                                    stochasticStatus === 'Oversold' ? 'bg-green-500/20 text-green-400' : 
                                    'bg-muted text-muted-foreground'
                                }`}>{stochasticStatus}</p>
                            </div>
                        </div>
                    )}
                    {/* EMA Crossover */}
                    <div className="p-3 border rounded-lg space-y-3">
                        <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">EMA CROSSOVER ANALYSIS</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                        <p className="font-bold text-foreground">What is EMA Crossover?</p>
                                        <p>This analysis compares a short-term Exponential Moving Average (EMA) with a long-term one. Crossovers between these two lines are often used as trading signals.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground">How to Interpret It:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li><span className="text-green-400 font-semibold">Golden Cross:</span> When the short-term EMA crosses ABOVE the long-term EMA, it's a bullish signal, suggesting upward momentum is building.</li>
                                            <li><span className="text-red-400 font-semibold">Death Cross:</span> When the short-term EMA crosses BELOW the long-term EMA, it's a bearish signal, suggesting downward momentum is building.</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Common Settings</p>
                                        <p>Common pairs are 12/26 for short-term signals, and 50/200 for long-term trend changes.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                                <div className="flex items-center gap-1">
                                    <label htmlFor="ema-short" className="text-xs font-medium text-muted-foreground">Short:</label>
                                    <Input id="ema-short" type="number" value={localPeriods.emaShort} onChange={(e) => handlePeriodChange('emaShort', e.target.value)} className="w-16 h-7 text-sm" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <label htmlFor="ema-long" className="text-xs font-medium text-muted-foreground">Long:</label>
                                    <Input id="ema-long" type="number" value={localPeriods.emaLong} onChange={(e) => handlePeriodChange('emaLong', e.target.value)} className="w-16 h-7 text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-xs text-muted-foreground">Short ({localPeriods.emaShort}-day)</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-sm">{formatCurrency(latestEmaShort?.EMA, currency) ?? 'N/A'}</p>
                                    <TrendIcon current={latestEmaShort?.EMA} previous={prevEmaShort?.EMA} precision={2} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-xs text-muted-foreground">Long ({localPeriods.emaLong}-day)</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-sm">{formatCurrency(latestEmaLong?.EMA, currency) ?? 'N/A'}</p>
                                    <TrendIcon current={latestEmaLong?.EMA} previous={prevEmaLong?.EMA} precision={2} />
                                </div>
                            </div>
                        </div>
                        {crossStatus && (
                            <div className="flex items-center justify-center pt-2">
                                <div className={`flex items-center gap-1.5 font-semibold text-xs px-2 py-1 rounded-md ${
                                    crossStatus === 'Golden Cross' ? 'bg-green-500/20 text-green-400' : 
                                    crossStatus === 'Death Cross' ? 'bg-red-500/20 text-red-400' :
                                    crossStatus === 'Bullish' ? 'bg-green-500/10 text-green-400/80' :
                                    'bg-red-500/10 text-red-400/80'
                                }`}>
                                    {crossStatus === 'Golden Cross' ? <ChevronsUp className="h-4 w-4" /> : 
                                    crossStatus === 'Death Cross' ? <ChevronsDown className="h-4 w-4" /> :
                                    crossStatus === 'Bullish' ? <TrendingUp className="h-3 w-3" /> :
                                    <TrendingDown className="h-3 w-3" />}
                                    <span>
                                        {crossStatus === 'Bullish' ? `Short > Long` :
                                        crossStatus === 'Bearish' ? `Short < Long` :
                                        crossStatus}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                     {/* Volume */}
                    <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">VOLUME VS. AVG</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <p>Compares the most recent trading volume to its moving average. A significant spike in volume can indicate strong conviction behind a price move.</p>
                                    <Separator/>
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Common Setting</p>
                                        <p>A 50-day moving average is standard for volume analysis.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-1">
                                <label htmlFor="mavol-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                <Input id="mavol-period" type="number" value={localPeriods.maVol} onChange={(e) => handlePeriodChange('maVol', e.target.value)} className="w-16 h-7 text-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                             <div className="flex items-baseline gap-2 flex-wrap">
                                 <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-sm">{latestMaVol?.volume ? Number(latestMaVol.volume).toLocaleString() : 'N/A'}</p>
                                    <TrendIcon current={latestMaVol?.volume} previous={prevMaVol?.volume} precision={0} formatter={(v) => v.toLocaleString()} />
                                 </div>
                                <p className="text-xs text-muted-foreground">/ avg: {latestMaVol?.MAVol ? Number(parseFloat(latestMaVol.MAVol).toFixed(0)).toLocaleString() : 'N/A'}</p>
                            </div>
                            {isVolumeSpike && (
                                <div className="flex items-center gap-1 text-orange-400 font-semibold text-xs bg-orange-500/20 px-2 py-0.5 rounded-md">
                                    <Zap className="h-3 w-3" />
                                    Spike
                                </div>
                            )}
                        </div>
                    </div>
                     {/* VWMA */}
                    <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">VOLUME-WEIGHTED MOVING AVG (VWMA)</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                        <p className="font-bold text-foreground">What is VWMA?</p>
                                        <p>The Volume-Weighted Moving Average (VWMA) is an average price over a period, but it gives more weight to prices that were accompanied by higher trading volume.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground">How to Interpret It:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li><span className="font-semibold text-primary">Price vs. VWMA:</span> When the price is above the VWMA, it's a bullish sign. When it's below, it's bearish. Crossovers can signal a change in trend.</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Common Setting</p>
                                        <p>A 20-period VWMA is a commonly used baseline for short- to medium-term analysis.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-1">
                                <label htmlFor="vwma-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                <Input id="vwma-period" type="number" value={localPeriods.vwma} onChange={(e) => handlePeriodChange('vwma', e.target.value)} className="w-16 h-7 text-sm" />
                            </div>
                        </div>
                         <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm">{formatCurrency(latestVwma?.VWMA, currency) ?? 'N/A'}</p>
                                <TrendIcon current={latestVwma?.VWMA} previous={prevVwma?.VWMA} precision={2} />
                            </div>
                            {vwmaPosition && (
                                <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${vwmaPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {vwmaPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {vwmaPosition === 'Bullish' ? 'Price Above' : 'Price Below'}
                                </div>
                            )}
                        </div>
                    </div>
                      {/* On-Balance Volume (OBV) */}
                    <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">ON-BALANCE VOLUME (OBV)</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                    <p className="font-bold text-foreground">What is OBV?</p>
                                    <p>On-Balance Volume is a momentum indicator that uses volume flow to predict price changes. It maintains a running total of volume, adding volume on up days and subtracting it on down days.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                    <p className="font-bold text-foreground">How to Interpret It:</p>
                                    <p>The <span className="font-semibold text-primary">trend of OBV is key</span>; the absolute numeric value is not important. A rising OBV reflects positive buying pressure, which can confirm an uptrend. A falling OBV suggests selling pressure.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Note on Parameters</p>
                                        <p>OBV is a cumulative indicator and does not have a user-defined period setting.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                             <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm">{latestObv?.OBV ? Number(parseFloat(latestObv.OBV).toFixed(0)).toLocaleString() : 'N/A'}</p>
                                <TrendIcon current={latestObv?.OBV} previous={prevObv?.OBV} precision={0} formatter={(v) => v.toLocaleString()} />
                            </div>
                            {obvTrend && (
                                <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${obvTrend === 'Rising' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {obvTrend === 'Rising' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {obvTrend}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Chaikin Money Flow (CMF) */}
                    <div className="p-3 border rounded-lg space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">CHAIKIN MONEY FLOW (CMF)</h3>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                        <p className="font-bold text-foreground">What is CMF?</p>
                                        <p>The Chaikin Money Flow (CMF) measures the amount of Money Flow Volume over a set period. It oscillates between -1 and +1.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground">How to Interpret It:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li>A CMF value <span className="text-green-400 font-semibold">above 0</span> indicates buying pressure (Accumulation).</li>
                                            <li>A CMF value <span className="text-red-400 font-semibold">below 0</span> indicates selling pressure (Distribution).</li>
                                        </ul>
                                    </div>
                                    <Separator />
                                    <div>
                                        <p className="font-bold text-foreground mb-1">Common Setting</p>
                                        <p>A 20 or 21-period lookback is standard for Chaikin Money Flow.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <div className="flex items-center gap-1">
                                <label htmlFor="cmf-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                <Input id="cmf-period" type="number" value={localPeriods.cmf} onChange={(e) => handleCmfPeriodChange('cmf', e.target.value)} className="w-16 h-7 text-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm">{latestCmf?.CMF ? parseFloat(latestCmf.CMF).toFixed(3) : 'N/A'}</p>
                                <TrendIcon current={latestCmf?.CMF} previous={prevCmf?.CMF} />
                            </div>
                            {cmfPosition && (
                                <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${cmfPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {cmfPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {cmfPosition === 'Bullish' ? 'Buying Pressure' : 'Selling Pressure'}
                                </div>
                            )}
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
