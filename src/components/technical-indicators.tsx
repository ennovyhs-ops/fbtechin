

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Activity, Zap, TrendingUp, TrendingDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import type { RsiData, MacdData, BbandsData, RocData, IndicatorPeriods, MAVolData, VwmaData, ObvData, StochasticData, CmfData, EmaData } from '@/lib/types';
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
        ema: EmaData[];
    } | null;
    loading: boolean;
    error: string | null;
    currency: string | null;
    periods: IndicatorPeriods;
    onPeriodsChange: (periods: IndicatorPeriods) => void;
    latestClose: number | null;
}

const EmaDisplay = ({ label, value, position, currency }: { label: string, value: string | null, position: 'Above' | 'Below' | null, currency: string | null }) => (
    <div className="flex flex-col items-center text-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-semibold text-sm">{formatCurrency(value, currency)}</span>
        {position && (
             <span className={`text-xs font-semibold ${position === 'Above' ? 'text-green-400' : 'text-red-400'}`}>
                (Price is {position})
            </span>
        )}
    </div>
);


export function TechnicalIndicators({ ticker, data, loading, error, currency, periods, onPeriodsChange, latestClose }: TechnicalIndicatorsProps) {
    const [localPeriods, setLocalPeriods] = useState(periods);

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
    const latestObv = data?.obv?.[0];
    const latestStochastic = data?.stochastic?.[0];
    const latestCmf = data?.cmf?.[0];
    const latestEma = data?.ema?.[0];


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
    const bbandsPosition = latestClose && bbandsContext.middle
        ? latestClose > bbandsContext.middle ? 'Bullish' : 'Bearish'
        : null;

    const vwmaContext = latestVwma?.VWMA ? parseFloat(latestVwma.VWMA) : null;
    const vwmaPosition = latestClose && vwmaContext
        ? latestClose > vwmaContext ? 'Bullish' : 'Bearish'
        : null;
        
    const rocValue = latestRoc?.ROC ? parseFloat(latestRoc.ROC) : null;
    const rocPosition = rocValue !== null ? (rocValue > 0 ? 'Bullish' : 'Bearish') : null;

    const macdLine = latestMacd?.MACD ? parseFloat(latestMacd.MACD) : null;
    const signalLine = latestMacd?.MACD_Signal ? parseFloat(latestMacd.MACD_Signal) : null;
    const macdPosition = macdLine !== null && signalLine !== null ? (macdLine > signalLine ? 'Bullish' : 'Bearish') : null;
    
    const obvTrend = data?.obv && data.obv.length > 1 && data.obv[0]?.OBV && data.obv[1]?.OBV
        ? parseFloat(data.obv[0].OBV) > parseFloat(data.obv[1].OBV) ? 'Rising' : 'Falling'
        : null;
        
    const cmfValue = latestCmf?.CMF ? parseFloat(latestCmf.CMF) : null;
    const cmfPosition = cmfValue !== null ? (cmfValue > 0 ? 'Bullish' : 'Bearish') : null;
    
    const getPosition = (price: number | null, ema: string | null) => {
        if (price === null || ema === null) return null;
        const emaVal = parseFloat(ema);
        if (isNaN(emaVal)) return null;
        return price > emaVal ? 'Above' : 'Below';
    }

    const shortTermTrend = latestEma?.EMA12 && latestEma?.EMA26 ? parseFloat(latestEma.EMA12) > parseFloat(latestEma.EMA26) : null;
    const longTermTrend = latestEma?.EMA50 && latestEma?.EMA200 ? parseFloat(latestEma.EMA50) > parseFloat(latestEma.EMA200) : null;
    const prevLongTermTrend = data?.ema?.[1]?.EMA50 && data?.ema?.[1]?.EMA200 ? parseFloat(data.ema[1].EMA50) > parseFloat(data.ema[1].EMA200) : null;
    
    let longTermCross: 'Golden Cross' | 'Death Cross' | null = null;
    if (longTermTrend === true && prevLongTermTrend === false) {
        longTermCross = 'Golden Cross';
    } else if (longTermTrend === false && prevLongTermTrend === true) {
        longTermCross = 'Death Cross';
    }


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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        
                        {/* EMA */}
                        <div className="p-3 border rounded-lg space-y-2 md:col-span-2 lg:col-span-3">
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">EXPONENTIAL MOVING AVERAGES (EMA)</h3>
                                 </TooltipTrigger>
                                 <TooltipContent className="max-w-xs p-3 space-y-2">
                                    <div>
                                      <p className="font-bold text-foreground">What are EMAs?</p>
                                      <p>EMAs are a type of moving average that places a greater weight and significance on the most recent data points. They are used to identify trend direction and potential support/resistance zones.</p>
                                    </div>
                                    <Separator />
                                    <div>
                                      <p className="font-bold text-foreground">How to Interpret Them:</p>
                                      <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li><span className="font-semibold text-green-400">Short-Term Trend:</span> When the faster EMA (12) is above the slower EMA (26), it suggests bullish short-term momentum.</li>
                                        <li><span className="font-semibold text-red-400">Long-Term Trend:</span> When the faster EMA (50) is above the slower EMA (200), it indicates a long-term uptrend (a "Golden Cross"). The opposite is a "Death Cross."</li>
                                      </ul>
                                    </div>
                                 </TooltipContent>
                             </Tooltip>
                             <div className="flex flex-col sm:flex-row justify-around items-start sm:items-center gap-4 pt-1">
                                <div className="flex flex-col gap-2 items-center text-center">
                                    <h4 className="font-semibold text-sm">Short-Term Trend</h4>
                                    <div className="flex gap-4">
                                        <EmaDisplay label="EMA(12)" value={latestEma?.EMA12 ?? null} position={getPosition(latestClose, latestEma?.EMA12 ?? null)} currency={currency} />
                                        <EmaDisplay label="EMA(26)" value={latestEma?.EMA26 ?? null} position={getPosition(latestClose, latestEma?.EMA26 ?? null)} currency={currency} />
                                    </div>
                                    {shortTermTrend !== null && (
                                        <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md mt-1 ${shortTermTrend ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {shortTermTrend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {shortTermTrend ? 'EMA(12) > EMA(26)' : 'EMA(12) < EMA(26)'}
                                        </div>
                                    )}
                                </div>
                                <Separator orientation="vertical" className="h-16 hidden sm:block" />
                                <div className="flex flex-col gap-2 items-center text-center">
                                     <h4 className="font-semibold text-sm">Long-Term Trend</h4>
                                     <div className="flex gap-4">
                                        <EmaDisplay label="EMA(50)" value={latestEma?.EMA50 ?? null} position={getPosition(latestClose, latestEma?.EMA50 ?? null)} currency={currency} />
                                        <EmaDisplay label="EMA(200)" value={latestEma?.EMA200 ?? null} position={getPosition(latestClose, latestEma?.EMA200 ?? null)} currency={currency} />
                                    </div>
                                    {longTermTrend !== null && (
                                        <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md mt-1 ${longTermTrend ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {longTermTrend ? <ChevronsUp className="h-3 w-3" /> : <ChevronsDown className="h-3 w-3" />}
                                            {longTermCross ? longTermCross : (longTermTrend ? 'EMA(50) > EMA(200)' : 'EMA(50) < EMA(200)')}
                                        </div>
                                    )}
                                </div>
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
                                     </TooltipContent>
                                 </Tooltip>
                                 <div className="flex items-center gap-1">
                                     <label htmlFor="roc-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                     <Input id="roc-period" type="number" value={localPeriods.roc} onChange={(e) => handlePeriodChange('roc', e.target.value)} className="w-16 h-7 text-sm" />
                                 </div>
                             </div>
                             <div className="flex items-center flex-wrap gap-2 pt-1">
                                 <p className="font-semibold text-sm">{latestRoc?.ROC ? `${latestRoc.ROC}%` : 'N/A'}</p>
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
                                     </TooltipContent>
                                 </Tooltip>
                                <div className="flex items-center gap-1">
                                     <label htmlFor="rsi-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                     <Input id="rsi-period" type="number" value={localPeriods.rsi} onChange={(e) => handlePeriodChange('rsi', e.target.value)} className="w-16 h-7 text-sm" />
                                 </div>
                             </div>
                             <div className="flex items-center flex-wrap gap-2 pt-1">
                                 <p className="font-semibold text-sm">{latestRsi?.RSI ?? 'N/A'}</p>
                                 <p className={`font-semibold px-2 py-0.5 rounded-md text-xs ${
                                     rsiStatus === 'Overbought' ? 'bg-red-500/20 text-red-400' : 
                                     rsiStatus === 'Oversold' ? 'bg-green-500/20 text-green-400' : 
                                     'bg-muted text-muted-foreground'
                                 }`}>{rsiStatus}</p>
                             </div>
                         </div>

                        {/* Volume */}
                         <div className="p-3 border rounded-lg space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">VOLUME VS. AVG</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>Compares the most recent trading volume to its moving average. A significant spike in volume can indicate strong conviction behind a price move.</p></TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-1">
                                    <label htmlFor="mavol-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                    <Input id="mavol-period" type="number" value={localPeriods.maVol} onChange={(e) => handlePeriodChange('maVol', e.target.value)} className="w-16 h-7 text-sm" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                     <p className="font-semibold text-sm">{latestMaVol?.volume ? Number(latestMaVol.volume).toLocaleString() : 'N/A'}</p>
                                     <p className="text-xs text-muted-foreground">/ avg: {latestMaVol?.MAVol ? Number(latestMaVol.MAVol).toLocaleString() : 'N/A'}</p>
                                </div>
                                {isVolumeSpike && (
                                    <div className="flex items-center gap-1 text-orange-400 font-semibold text-xs bg-orange-500/20 px-2 py-0.5 rounded-md">
                                        <Zap className="h-3 w-3" />
                                        Spike
                                    </div>
                                )}
                            </div>
                         </div>
                         
                        {/* Bollinger Bands */}
                        <div className="p-3 border rounded-lg space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="font-semibold text-xs text-muted-foreground cursor-help underline decoration-dotted">BOLLINGER BANDS®</h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-3 space-y-2">
                                        <div>
                                            <p className="font-bold text-foreground">What are Bollinger Bands®?</p>
                                            <p>A volatility indicator consisting of a Simple Moving Average (Middle Band) and two outer bands representing standard deviations.</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <p className="font-bold text-foreground">How to Interpret Them:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                <li><span className="font-semibold text-primary">Volatility:</span> Bands widen as volatility increases and narrow as it decreases.</li>
                                                <li><span className="font-semibold text-primary">The Squeeze:</span> Very narrow bands signal a period of low volatility that is often followed by a significant price move.</li>
                                                <li><span className="font-semibold text-primary">Price vs. Bands:</span> Prices near the upper band can be considered overbought, while prices near the lower band can be considered oversold.</li>
                                            </ul>
                                        </div>
                                     </TooltipContent>
                                </Tooltip>
                                <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                                    <div className="flex items-center gap-1">
                                        <label htmlFor="bbands-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                        <Input id="bbands-period" type="number" value={localPeriods.bbands.period} onChange={(e) => handleComplexPeriodChange('bbands', 'period', e.target.value)} className="w-16 h-7 text-sm" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label htmlFor="bbands-stddev" className="text-xs font-medium text-muted-foreground">StdDev:</label>
                                        <Input id="bbands-stddev" type="number" step="0.1" value={localPeriods.bbands.stdDev} onChange={(e) => handleComplexPeriodChange('bbands', 'stdDev', e.target.value)} className="w-16 h-7 text-sm" />
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                                <div className="grid grid-cols-3 gap-x-4">
                                     <div><p className="text-xs text-muted-foreground">Lower</p><p className="font-semibold text-sm">{formatCurrency(latestBbands?.['Real Lower Band'], currency)}</p></div>
                                     <div><p className="text-xs text-muted-foreground">Middle</p><p className="font-semibold text-sm">{formatCurrency(latestBbands?.['Real Middle Band'], currency)}</p></div>
                                     <div><p className="text-xs text-muted-foreground">Upper</p><p className="font-semibold text-sm">{formatCurrency(latestBbands?.['Real Upper Band'], currency)}</p></div>
                                 </div>
                                 {bbandsPosition && (
                                     <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${bbandsPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                         {bbandsPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                         {bbandsPosition === 'Bullish' ? 'Price Above Mid' : 'Price Below Mid'}
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
                                     </TooltipContent>
                                 </Tooltip>
                                <div className="flex items-center gap-1">
                                     <label htmlFor="vwma-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                     <Input id="vwma-period" type="number" value={localPeriods.vwma} onChange={(e) => handlePeriodChange('vwma', e.target.value)} className="w-16 h-7 text-sm" />
                                  </div>
                             </div>
                              <div className="flex items-center flex-wrap gap-2 pt-1">
                                 <p className="font-semibold text-sm">{formatCurrency(latestVwma?.VWMA, currency) ?? 'N/A'}</p>
                                 {vwmaPosition && (
                                      <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${vwmaPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                         {vwmaPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                         {vwmaPosition === 'Bullish' ? 'Price Above' : 'Price Below'}
                                     </div>
                                 )}
                             </div>
                         </div>
                         
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
                                     <div><p className="text-xs text-muted-foreground">MACD</p><p className="font-semibold text-sm">{latestMacd?.MACD ? parseFloat(latestMacd.MACD).toFixed(3) : 'N/A'}</p></div>
                                     <div><p className="text-xs text-muted-foreground">Signal</p><p className="font-semibold text-sm">{latestMacd?.MACD_Signal ? parseFloat(latestMacd.MACD_Signal).toFixed(3) : 'N/A'}</p></div>
                                     <div><p className="text-xs text-muted-foreground">Hist</p><p className="font-semibold text-sm">{latestMacd?.MACD_Hist ? parseFloat(latestMacd.MACD_Hist).toFixed(3) : 'N/A'}</p></div>
                                 </div>
                                 {macdPosition && (
                                      <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${macdPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                         {macdPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                         {macdPosition === 'Bullish' ? 'Above Signal' : 'Below Signal'}
                                     </div>
                                 )}
                             </div>
                         </div>

                        {/* Stochastic Oscillator */}
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
                                     <div><p className="text-xs text-muted-foreground">%K Line</p><p className="font-semibold text-sm">{latestStochastic?.k ?? 'N/A'}</p></div>
                                     <div><p className="text-xs text-muted-foreground">%D Line</p><p className="font-semibold text-sm">{latestStochastic?.d ?? 'N/A'}</p></div>
                                 </div>
                                <p className={`font-semibold px-2 py-0.5 rounded-md text-xs ${
                                     stochasticStatus === 'Overbought' ? 'bg-red-500/20 text-red-400' : 
                                     stochasticStatus === 'Oversold' ? 'bg-green-500/20 text-green-400' : 
                                     'bg-muted text-muted-foreground'
                                 }`}>{stochasticStatus}</p>
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
                                     </TooltipContent>
                                 </Tooltip>
                             </div>
                              <div className="flex items-center flex-wrap gap-2 pt-1">
                                 <p className="font-semibold text-sm">{latestObv?.OBV ? Number(latestObv.OBV).toLocaleString() : 'N/A'}</p>
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
                                     </TooltipContent>
                                 </Tooltip>
                                <div className="flex items-center gap-1">
                                     <label htmlFor="cmf-period" className="text-xs font-medium text-muted-foreground">P:</label>
                                     <Input id="cmf-period" type="number" value={localPeriods.cmf} onChange={(e) => handleCmfPeriodChange('cmf', e.target.value)} className="w-16 h-7 text-sm" />
                                 </div>
                             </div>
                              <div className="flex items-center flex-wrap gap-2 pt-1">
                                 <p className="font-semibold text-sm">{latestCmf?.CMF ?? 'N/A'}</p>
                                 {cmfPosition && (
                                      <div className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-md ${cmfPosition === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                         {cmfPosition === 'Bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                         {cmfPosition === 'Bullish' ? 'Buying Pressure' : 'Selling Pressure'}
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
