
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Activity, Target, TrendingUp, TrendingDown, Minus, AreaChart, RefreshCw } from 'lucide-react';
import type { RsiData, MacdData, BbandsData, RocData, IndicatorPeriods } from '@/lib/types';
import { isCryptoPair, isCurrencyPair, formatCurrency } from '@/lib/utils';


interface TechnicalIndicatorsProps {
    ticker: string;
    data: {
        rsi: RsiData[];
        macd: MacdData[];
        bbands: BbandsData[];
        roc: RocData[];
    } | null;
    loading: boolean;
    error: string | null;
    currency: string | null;
    periods: IndicatorPeriods;
    onPeriodsChange: (periods: IndicatorPeriods) => void;
}

export function TechnicalIndicators({ ticker, data, loading, error, currency, periods, onPeriodsChange }: TechnicalIndicatorsProps) {
    const [localPeriods, setLocalPeriods] = useState(periods);

    const handlePeriodChange = (indicator: 'roc' | 'rsi', value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue > 0) {
            setLocalPeriods(prev => ({ ...prev, [indicator]: numValue }));
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

    const getRsiStatus = (rsiValue: string | null) => {
        if (rsiValue === null) return 'N/A';
        const rsi = parseFloat(rsiValue);
        if (rsi > 70) return 'Overbought';
        if (rsi < 30) return 'Oversold';
        return 'Neutral';
    };
    
    const rsiStatus = getRsiStatus(latestRsi?.RSI ?? null);

    return (
        <Card className="animate-in fade-in-50 duration-500 delay-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Activity className="h-6 w-6 text-accent" />
                    <span>Technical Indicators for {ticker}</span>
                </CardTitle>
                <CardDescription>
                    Latest calculated values based on daily data. You can adjust the periods below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                             <div>
                                <label htmlFor="roc-period" className="text-sm font-medium text-muted-foreground">ROC Period</label>
                                <Input
                                    id="roc-period"
                                    type="number"
                                    value={localPeriods.roc}
                                    onChange={(e) => handlePeriodChange('roc', e.target.value)}
                                    className="w-24 h-9 text-sm mt-1"
                                    placeholder="Days"
                                />
                            </div>
                            <div>
                                <label htmlFor="rsi-period" className="text-sm font-medium text-muted-foreground">RSI Period</label>
                                <Input
                                    id="rsi-period"
                                    type="number"
                                    value={localPeriods.rsi}
                                    onChange={(e) => handlePeriodChange('rsi', e.target.value)}
                                    className="w-24 h-9 text-sm mt-1"
                                    placeholder="Days"
                                />
                            </div>
                        </div>
                        <Button onClick={handleUpdateClick} disabled={loading} size="sm">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw />}
                            {loading ? 'Calculating...' : 'Update Indicators'}
                        </Button>
                    </div>
                     {error && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Indicator Error</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>


                 <div>
                    <h3 className="font-semibold text-lg mb-2">Rate of Change ({periods.roc}-day)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <AreaChart className="text-muted-foreground h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">ROC</p>
                                <p className="font-semibold">{latestRoc?.ROC ? `${latestRoc.ROC}` : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-lg mb-2">RSI ({periods.rsi}-day)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Target className="text-muted-foreground h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Value</p>
                                <p className="font-semibold">{latestRsi?.RSI ?? 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className={`font-semibold px-2 py-1 rounded-md text-xs ${
                                rsiStatus === 'Overbought' ? 'bg-red-500/20 text-red-400' : 
                                rsiStatus === 'Oversold' ? 'bg-green-500/20 text-green-400' : 
                                'bg-muted text-muted-foreground'
                            }`}>
                                {rsiStatus}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg mb-2">MACD ({periods.macd.fast}, {periods.macd.slow}, {periods.macd.signal})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-blue-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">MACD</p>
                                <p className="font-semibold">{formatCurrency(latestMacd?.MACD, currency)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="text-orange-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Signal</p>
                                <p className="font-semibold">{formatCurrency(latestMacd?.MACD_Signal, currency)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Minus className="text-gray-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Histogram</p>
                                <p className="font-semibold">{formatCurrency(latestMacd?.MACD_Hist, currency)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 className="font-semibold text-lg mb-2">Bollinger Bands® ({periods.bbands.period}, {periods.bbands.stdDev})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-green-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Upper Band</p>
                                <p className="font-semibold">{formatCurrency(latestBbands?.['Real Upper Band'], currency)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Minus className="text-gray-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Middle Band</p>
                                <p className="font-semibold">{formatCurrency(latestBbands?.['Real Middle Band'], currency)}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <TrendingDown className="text-red-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Lower Band</p>
                                <p className="font-semibold">{formatCurrency(latestBbands?.['Real Lower Band'], currency)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
