'use client';

import { useEffect, useState } from 'react';
import { Zap, Loader2, AlertCircle, TrendingUp, TrendingDown, Rocket, ShieldAlert, Scale, Hand, AlertTriangle, Info, Target, Gauge, Clock, Calendar, HelpCircle, ArrowRight, Minus } from 'lucide-react';
import type { CombinedAnalysisResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { MarketData } from '@/lib/types';
import { Separator } from './ui/separator';
import { formatCurrency, isCryptoPair, isCurrencyPair } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface StockAnalysisProps {
  ticker: string;
  marketData: MarketData[] | null;
  analysisResult: CombinedAnalysisResult | null;
  currency: string | null;
  loading: boolean;
  meanReversionTarget: number | null;
}

const getSignalInfo = (signal: string): { icon: React.ReactNode, color: string } => {
    if (signal.includes('STRONG BULLISH')) return { icon: <Rocket className="h-5 w-5" />, color: 'text-green-400' };
    if (signal.includes('MODERATE BULLISH')) return { icon: <TrendingUp className="h-5 w-5" />, color: 'text-green-400' };
    if (signal.includes('MILD BULLISH')) return { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-yellow-400' };
    if (signal.includes('STRONG BEARISH')) return { icon: <TrendingDown className="h-5 w-5" />, color: 'text-red-400' };
    if (signal.includes('MODERATE BEARISH')) return { icon: <ShieldAlert className="h-5 w-5" />, color: 'text-red-400' };
    if (signal.includes('MILD BEARISH')) return { icon: <Hand className="h-5 w-5" />, color: 'text-orange-400' };
    return { icon: <Scale className="h-5 w-5" />, color: 'text-muted-foreground' };
}

const getRecommendationColor = (recommendation: string) => {
    if (recommendation.includes('Strong Buy')) return 'bg-green-500 text-white';
    if (recommendation.includes('Buy')) return 'bg-green-500/80 text-white';
    if (recommendation.includes('Sell')) return 'bg-red-500/80 text-white';
    if (recommendation.includes('Strong Sell')) return 'bg-red-500 text-white';
    return 'bg-muted text-muted-foreground';
}

const actionGlossary: Record<string, { title: string; description: string; }> = {
    'Use pullbacks to enter': {
        title: "What is a 'Pullback'?",
        description: "A pullback is a temporary dip or pause in a stock's strong upward trend. The suggestion to 'use pullbacks to enter' means waiting for one of these small price drops to buy the stock, rather than buying it when the price is at a high point. It's a strategy aimed at getting a better entry price within a larger uptrend."
    },
    'Use rallies to enter': {
        title: "What is a 'Rally'?",
        description: "A rally is a temporary price increase in a stock's strong downward trend. The suggestion to 'use rallies to enter' a short position means waiting for one of these small price spikes to sell or short the stock, rather than selling when the price is at a low point. It's a strategy for getting a better entry price within a larger downtrend."
    },
    'Manage risk with stop losses': {
        title: "What does 'Manage Risk' mean?",
        description: "This suggests that while there is a directional trend, it's not strong enough to ignore potential reversals. Using a 'stop loss' order—an automated order to sell if the stock drops to a certain price—is a common way to manage this risk and protect capital."
    },
    'Look for additional confirmation': {
        title: "What is 'Additional Confirmation'?",
        description: "This means the signal is weak and you should look for other signs before acting. This could include waiting for another day of price movement in the same direction, seeing a volume increase, or getting confirmation from another indicator before committing to a trade."
    },
    'Market is choppy, avoid new trades': {
        title: "What does 'Choppy Market' mean?",
        description: "A choppy market moves up and down without a clear direction. The 'Neutral' signal indicates that indicators are mixed, making it difficult to predict the next move. In these conditions, it's often wise to wait for a clearer trend to emerge before entering new positions."
    },
    'Caution is advised, consider hedging': {
        title: "What does 'Hedging' mean?",
        description: "A hedge is an investment made to reduce the risk of adverse price movements in an asset. If you own the stock, for example, you could buy a put option to protect against a potential decline. The 'Mild Bearish' signal suggests there's a risk of a downturn, but it's not yet a strong trend."
    }
}

const getSignalInfoForPrediction = (signal: string): { explanation: string } => {
    if (signal.includes('STRONG')) return { explanation: "'Strong' signals mean that multiple key indicators are aligned, pointing to a high-conviction trend." };
    if (signal.includes('MODERATE')) return { explanation: "'Moderate' signals suggest a good level of indicator alignment, but some conflicting data may exist." };
    if (signal.includes('MILD')) return { explanation: "'Mild' signals suggest that technical indicators are not strongly aligned and the trend is weak or unclear. Interpret with caution." };
    return { explanation: "'Neutral' signals indicate no clear directional edge; the market may be choppy or range-bound." };
}

const PivotDisplay = ({ label, value, currency }: { label: string; value: number; currency: string | null }) => (
    <div className="flex flex-col items-center">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold text-sm text-foreground">{formatCurrency(value, currency)}</span>
    </div>
);

const FibonacciDisplay = ({ label, value, currency, highlight }: { label: string; value: number; currency: string | null, highlight?: boolean }) => (
    <div className={`flex flex-col items-center p-1 rounded-md ${highlight ? 'bg-background' : ''}`}>
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold text-sm text-foreground">{formatCurrency(value, currency)}</span>
    </div>
);

const MomentumGauge = ({ score }: { score: number }) => {
  // Score is -1 to 1. Map to 0 to 180 for a semi-circle
  const needleAngle = (score + 1) * 90;
  
  const data = [
    { name: 'Bearish', value: 60, color: 'hsl(var(--destructive))' },
    { name: 'Neutral', value: 60, color: 'hsl(var(--muted))' },
    { name: 'Bullish', value: 60, color: 'hsl(var(--chart-2))' },
  ];

  const RADIAN = Math.PI / 180;
  const cx = 150;
  const cy = 110;
  const iR = 60;
  const oR = 100;

  const needle = (value: number, data: any[], cx: number, cy: number, iR: number, oR: number, color: string) => {
    let total = 0;
    data.forEach((v) => {
      total += v.value;
    });
    const ang = 180.0 * (1 - value / total);
    const length = (iR + 2 * oR) / 3;
    const sin = Math.sin(-RADIAN * ang);
    const cos = Math.cos(-RADIAN * ang);

    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill={color} stroke="none" />
        <path d={`M${cx} ${cy} L${cx + length * cos} ${cy + length * sin}`} strokeWidth="3" stroke={color} fill="none" />
      </g>
    );
  };

  return (
    <div className="w-full h-[150px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Pie
            dataKey="value"
            startAngle={180}
            endAngle={0}
            data={data}
            cx={cx}
            cy={cy}
            innerRadius={iR}
            outerRadius={oR}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
            ))}
          </Pie>
          {needle(score + 1, [{ value: 2 }], cx, cy, iR, oR, 'hsl(var(--foreground))')}
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="text-2xl font-black tracking-tighter">{score.toFixed(2)}</span>
      </div>
    </div>
  );
};

export function StockAnalysis({ ticker, marketData, analysisResult, currency, loading, meanReversionTarget }: StockAnalysisProps) {

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-accent" />
                    <span>Analysis &amp; Recommendation for {ticker}</span>
                </CardTitle>
                <CardDescription>
                    Running a detailed scoring model and price projection...
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running analysis... This may take a moment.</span>
                </div>
            </CardContent>
        </Card>
    );
  }
  
  if (!analysisResult) return null;

  if (analysisResult.error && !analysisResult.analysis) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-destructive" />
                    <span>Momentum Analysis (Calculated)</span>
                </CardTitle>
                <CardDescription>
                    Could not complete the analysis for {ticker}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{analysisResult.error}</span>
                </div>
            </CardContent>
        </Card>
    );
  }
  
  const momentumAnalysis = analysisResult.analysis;
  const prevMomentumAnalysis = analysisResult.prevAnalysis;
  const prediction = analysisResult.prediction;
  
  if (!momentumAnalysis) return null;

  const { icon, color } = getSignalInfo(momentumAnalysis.signal);
  const actionExplanation = actionGlossary[momentumAnalysis.tradeAction];
  const isPredictionError = analysisResult.error && (!prediction || 'error' in prediction);
  const signalInfo = getSignalInfoForPrediction(momentumAnalysis.signal);
  const pivots = (prediction && 'pivots' in prediction && prediction.pivots) ? prediction.pivots : null;
  const fibonacci = (prediction && 'fibonacci' in prediction && prediction.fibonacci) ? prediction.fibonacci : null;

  let momentumChange: 'Increasing' | 'Decreasing' | 'Stable' | null = null;
  let momentumDiff = 0;
  if (momentumAnalysis && prevMomentumAnalysis && 'totalScore' in momentumAnalysis && 'totalScore' in prevMomentumAnalysis) {
      momentumDiff = momentumAnalysis.totalScore - prevMomentumAnalysis.totalScore;
      if (Math.abs(momentumDiff) < 0.01) {
          momentumChange = 'Stable';
      } else if (momentumDiff > 0) {
          momentumChange = 'Increasing';
      } else {
          momentumChange = 'Decreasing';
      }
  }

  const PriceTargetContent = ({ targetType, icon: Icon }: { targetType: 'shortTerm' | 'longTerm', icon: React.ElementType }) => {
    if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/></div>;
    if (isPredictionError || !prediction || 'error' in prediction) return <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Failed</div>;
    
    const targetData = prediction[targetType];
    const isNotApplicable = targetData.timeframe === "N/A";
    
    if (isNotApplicable) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-2 cursor-help text-center max-w-sm">
                             <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-semibold text-sm text-muted-foreground">Price Target N/A</span>
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <p>{targetData.interpretation}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    const isUp = marketData && targetData.priceTarget > parseFloat(marketData[0].close);
    const predColor = isUp ? 'text-green-400' : 'text-red-400';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 cursor-help">
                        <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 text-muted-foreground`} />
                            <div className="flex flex-col items-center">
                                <span className={`font-bold text-base ${predColor}`}>{formatCurrency(targetData.priceTarget, currency)}</span>
                                <span className="text-xs text-muted-foreground">{targetData.timeframe}</span>
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                     <p>{targetData.interpretation}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  }

  if (momentumAnalysis.signal === 'N/A') {
      return (
           <Card className="animate-in fade-in-50 duration-500 delay-300">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                    <Zap className="h-6 w-6 text-accent" />
                    <span>Analysis for {ticker} (Calculated)</span>
                </CardTitle>
                <CardDescription>
                    {momentumAnalysis.interpretation}
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50">
                    <div className="flex flex-col items-center gap-4 text-center">
                         <h3 className="font-semibold text-sm text-muted-foreground">Price Target (Calculated)</h3>
                         <div className="flex flex-col sm:flex-row items-center gap-6">
                            <PriceTargetContent targetType="shortTerm" icon={Clock} />
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      )
  }

  return (
    <Card className="animate-in fade-in-50 duration-500 delay-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Zap className="h-6 w-6 text-accent" />
          <span>Analysis &amp; Recommendation for {ticker}</span>
        </CardTitle>
        <CardDescription>
          A proprietary momentum score and derived short- and long-term price targets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {'recommendation' in momentumAnalysis && momentumAnalysis.recommendation !== "N/A" && (
            <div className="text-center p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Recommendation from Technicals</h3>
                <div className={`inline-block px-6 py-2 rounded-full font-bold text-lg ${getRecommendationColor(momentumAnalysis.recommendation)}`}>
                    {momentumAnalysis.recommendation}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{momentumAnalysis.interpretation}</p>
            </div>
        )}
        <div className="flex flex-col md:flex-row justify-around items-center gap-6 p-4 rounded-lg bg-muted/50">
            <div className="flex flex-col items-center gap-2 text-center w-full md:w-1/3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 cursor-help">
                                Momentum Gauge
                                <HelpCircle className="h-4 w-4" />
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                             <p>This score is calculated from multiple technical indicators. A score closer to +1.0 is strongly bullish, while a score closer to -1.0 is strongly bearish.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <MomentumGauge score={momentumAnalysis.totalScore} />
                
                {momentumChange && prevMomentumAnalysis && 'totalScore' in prevMomentumAnalysis && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={`flex items-center justify-center gap-1 text-xs font-semibold cursor-help ${
                                    momentumChange === 'Increasing' ? 'text-green-400' :
                                    momentumChange === 'Decreasing' ? 'text-red-400' :
                                    'text-muted-foreground'
                                }`}>
                                    {momentumChange === 'Increasing' ? <TrendingUp className="h-3 w-3" /> :
                                    momentumChange === 'Decreasing' ? <TrendingDown className="h-3 w-3" /> :
                                    <Minus className="h-3 w-3" />}
                                    <span>Momentum is {momentumChange}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Change vs. yesterday: {momentumDiff > 0 ? '+' : ''}{momentumDiff.toFixed(3)}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={`flex items-center justify-center gap-1.5 font-semibold text-base ${color} cursor-help mt-1`}>
                                {icon}
                                <span>{momentumAnalysis.signal}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{signalInfo.explanation}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <Separator orientation="vertical" className="h-24 hidden md:block" />
            <Separator orientation="horizontal" className="w-full md:hidden" />

             <div className="flex flex-col items-center gap-4 text-center w-full md:w-1/2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 cursor-help">
                                Price Targets (Calculated)
                                <HelpCircle className="h-4 w-4" />
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs space-y-2">
                             <div>
                                <p className="font-bold">Short-Term Target:</p>
                                <p>Projected price based on momentum strength and current volatility (ATR).</p>
                            </div>
                            <Separator/>
                            <div>
                                <p className="font-bold">Long-Term Target:</p>
                                <p>6-month forecast using standard deviation and historical trend persistence.</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6">
                    <PriceTargetContent targetType="shortTerm" icon={Clock} />
                    <Separator orientation="vertical" className="h-12 hidden sm:block" />
                    <PriceTargetContent targetType="longTerm" icon={Calendar} />
                 </div>
            </div>
        </div>
        
        {momentumAnalysis.signal === '⚖️ NEUTRAL' ? (
             <div className="p-3 rounded-lg border-dashed border bg-blue-500/10 border-blue-500/20 text-center">
                <div className="flex items-center justify-center gap-2">
                    <Target className="h-4 w-4 text-blue-400" />
                    <h4 className="font-semibold text-sm text-blue-400">Alternative Outlook: Breakout Potential</h4>
                </div>
                <p className="text-xs text-blue-400/90 mt-2 max-w-xl mx-auto">
                    Neutral momentum often precedes a breakout. A move above the R1 pivot could signal a new uptrend, while a drop below S1 could indicate a new downtrend.
                </p>
                {pivots ? (
                    <div className="mt-3 flex justify-center items-center gap-8">
                        <div className="text-center">
                            <p className="text-xs font-semibold text-blue-400/90">Bullish Breakout</p>
                            <p className="font-bold text-lg text-blue-400/90">{formatCurrency(pivots.r1, currency)}</p>
                            <p className="text-xs text-blue-400/80">(R1 Pivot)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-semibold text-blue-400/90">Bearish Breakdown</p>
                            <p className="font-bold text-lg text-blue-400/90">{formatCurrency(pivots.s1, currency)}</p>
                            <p className="text-xs text-blue-400/80">(S1 Pivot)</p>
                        </div>
                    </div>
                ) : null}
            </div>
        ) : (
            <div className="p-3 rounded-lg border-dashed border bg-orange-500/10 border-orange-500/20 text-center">
                <div className="flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <h4 className="font-semibold text-sm text-orange-400">Alternative Outlook: Mean Reversion</h4>
                </div>
                {meanReversionTarget ? (
                    <>
                        <p className="text-xs text-orange-400/90 mt-2 max-w-xl mx-auto">
                           If the current trend stalls, prices may revert to the 20-day moving average.
                        </p>
                        <div className="mt-3">
                            <p className="text-xs font-semibold text-orange-400/90">Reversion Target</p>
                            <p className="font-bold text-lg text-orange-400/90">{formatCurrency(meanReversionTarget, currency)}</p>
                            <p className="text-xs text-orange-400/80">(Current 20-Day SMA)</p>
                        </div>
                    </>
                ) : (
                    <p className="text-xs text-orange-400/90 mt-2 max-w-xl mx-auto">
                        This analysis is purely technical. Prices can revert to their historical average if momentum fades.
                    </p>
                )}
            </div>
        )}

        {pivots && (
            <div className="space-y-4">
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5 cursor-help">
                                Swing Pivot Points (30-Day, Calculated)
                                <HelpCircle className="h-4 w-4" />
                            </h3>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs space-y-4">
                          <div>
                            <p className="font-bold text-foreground mb-1">What are Swing Pivots?</p>
                            <p>Key support and resistance levels watched by traders to identify potential turning points within a 30-day "swing" window.</p>
                          </div>
                          <Separator />
                          <div>
                            <p className="font-bold text-foreground mb-1">How are they calculated?</p>
                            <p className="text-[10px] leading-relaxed">
                                Our engine calculates these daily using the Standard Pivot formula:
                                <br/><br/>
                                • <strong>Pivot Point (PP):</strong> The average of the 30-day High, 30-day Low, and latest Close.
                                <br/>
                                • <strong>Resistance (R1/R2):</strong> Calculated by doubling the PP and subtracting the 30-day Low.
                                <br/>
                                • <strong>Support (S1/S2):</strong> Calculated by doubling the PP and subtracting the 30-day High.
                            </p>
                          </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="flex flex-row flex-wrap justify-around items-center gap-x-4 gap-y-2 p-3 rounded-lg bg-muted/50">
                    <PivotDisplay label="S2" value={pivots.s2} currency={currency} />
                    <PivotDisplay label="S1" value={pivots.s1} currency={currency} />
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold text-muted-foreground">PIVOT</span>
                        <span className="font-bold text-sm text-foreground">{formatCurrency(pivots.pp, currency)}</span>
                    </div>
                    <PivotDisplay label="R1" value={pivots.r1} currency={currency} />
                    <PivotDisplay label="R2" value={pivots.r2} currency={currency} />
                </div>
            </div>
        )}

        <div className="space-y-2 text-center pt-2">
            <div className="flex items-center justify-center gap-2">
                <h3 className="font-semibold text-sm">Suggested Action:</h3>
                 <div className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20">{momentumAnalysis.tradeAction}</div>
                {actionExplanation && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{actionExplanation.title}</DialogTitle>
                                <DialogDescription>
                                    {actionExplanation.description}
                                </DialogDescription>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}