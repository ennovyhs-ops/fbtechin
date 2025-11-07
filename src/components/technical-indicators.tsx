
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Activity, Target, TrendingUp, TrendingDown, Minus, AreaChart } from 'lucide-react';
import type { RsiData, MacdData, BbandsData, RocData, IndicatorPeriods } from '@/lib/types';
import { isCryptoPair, isCurrencyPair, formatCurrency } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

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
    const [rocPeriod, setRocPeriod] = useState(periods.roc);
    const [debouncedRocPeriod] = useDebounce(rocPeriod, 500);

    const handleRocPeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0) {
            setRocPeriod(value);
            onPeriodsChange({ ...periods, roc: value });
        }
    };
    
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

    if (error) {
         return (
            <Alert variant="destructive" className="animate-in fade-in-50 duration-500">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Indicator Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
                    Latest calculated values based on daily data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                           <h3 className="font-semibold text-lg">Rate of Change</h3>
                           {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={rocPeriod}
                                onChange={handleRocPeriodChange}
                                className="w-20 h-8 text-sm"
                                placeholder="Days"
                            />
                            <span className="text-sm text-muted-foreground">days</span>
                        </div>
                    </div>

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
                    <h3 className="font-semibold text-lg mb-2">RSI (14-day)</h3>
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
                    <h3 className="font-semibold text-lg mb-2">MACD (12, 26, 9)</h3>
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
                    <h3 className="font-semibold text-lg mb-2">Bollinger Bands® (20, 2)</h3>
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
