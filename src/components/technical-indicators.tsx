'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Activity, Target, TrendingUp, TrendingDown, Minus, AreaChart } from 'lucide-react';
import type { RsiData, MacdData, BbandsData, RocData } from '@/lib/types';

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
}

export function TechnicalIndicators({ ticker, data, loading, error }: TechnicalIndicatorsProps) {
    if (loading) {
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
    
    if (!data) {
        return null;
    }

    const latestRsi = data.rsi?.[0];
    const latestMacd = data.macd?.[0];
    const latestBbands = data.bbands?.[0];
    const latestRoc = data.roc?.[0];

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
                    <h3 className="font-semibold text-lg mb-2">Rate of Change (22-day)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <AreaChart className="text-muted-foreground h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">ROC</p>
                                <p className="font-semibold">{latestRoc ? `${parseFloat(latestRoc.ROC).toFixed(2)}%` : 'N/A'}</p>
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
                                <p className="font-semibold">{latestRsi ? parseFloat(latestRsi.RSI).toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {latestRsi ? (
                                <p className={`font-semibold px-2 py-1 rounded-md text-xs ${
                                    parseFloat(latestRsi.RSI) > 70 ? 'bg-red-500/20 text-red-400' : 
                                    parseFloat(latestRsi.RSI) < 30 ? 'bg-green-500/20 text-green-400' : 
                                    'bg-muted text-muted-foreground'
                                }`}>
                                    {parseFloat(latestRsi.RSI) > 70 ? 'Overbought' : 
                                    parseFloat(latestRsi.RSI) < 30 ? 'Oversold' : 
                                    'Neutral'}
                                </p>
                            ) : (
                                 <p className="font-semibold px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground">N/A</p>
                            )}
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
                                <p className="font-semibold">{latestMacd ? parseFloat(latestMacd.MACD).toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="text-orange-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Signal</p>
                                <p className="font-semibold">{latestMacd ? parseFloat(latestMacd.MACD_Signal).toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Minus className="text-gray-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Histogram</p>
                                <p className="font-semibold">{latestMacd ? parseFloat(latestMacd.MACD_Hist).toFixed(2) : 'N/A'}</p>
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
                                <p className="font-semibold">{latestBbands ? parseFloat(latestBbands['Real Upper Band']).toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Minus className="text-gray-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Middle Band</p>
                                <p className="font-semibold">{latestBbands ? parseFloat(latestBbands['Real Middle Band']).toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <TrendingDown className="text-red-400 h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Lower Band</p>
                                <p className="font-semibold">{latestBbands ? parseFloat(latestBbands['Real Lower Band']).toFixed(2) : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
