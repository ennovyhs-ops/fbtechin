'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, HelpCircle, Sparkles, CheckCircle, XCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';

import { analyzeUserOptionPlay, type AnalyzeUserOptionPlayInput, type AnalyzeUserOptionPlayOutput } from '@/ai/flows/analyze-user-option-play';
import type { CombinedAnalysisResult, MarketData } from '@/lib/types';
import { calculateVolatility } from '@/lib/technical-analysis';


const OptionLegSchema = z.object({
  action: z.enum(['Buy', 'Sell']),
  type: z.enum(['Call', 'Put']),
  strike: z.coerce.number().positive('Strike must be positive.'),
});

const UserOptionPlaySchema = z.object({
  leg1: OptionLegSchema,
  leg2action: z.enum(['Buy', 'Sell']).optional(),
  leg2type: z.enum(['Call', 'Put']).optional(),
  leg2strike: z.coerce.number().optional(),
  expiration: z.enum(['14', '30', '60']),
}).refine(data => {
    if (data.leg2strike) {
        return data.leg2action && data.leg2type;
    }
    return true;
}, {
    message: "Action and Type are required for the second leg if a strike is entered.",
    path: ['leg2action'],
});


interface UserOptionPlayAnalyzerProps {
  ticker: string;
  analysisResult: CombinedAnalysisResult | null;
  marketData: MarketData[] | null;
  latestClose: string;
}

const getAssessmentInfo = (assessment: AnalyzeUserOptionPlayOutput['assessment']) => {
    switch (assessment) {
        case 'Logical':
            return { icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' };
        case 'Speculative':
            return { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' };
        case 'Contrarian':
            return { icon: <Lightbulb className="h-5 w-5" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' };
        case 'Illogical':
            return { icon: <XCircle className="h-5 w-5" />, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' };
        default:
            return { icon: <HelpCircle className="h-5 w-5" />, color: 'text-muted-foreground', bgColor: 'bg-muted/50' };
    }
};

export function UserOptionPlayAnalyzer({ ticker, analysisResult, marketData, latestClose }: UserOptionPlayAnalyzerProps) {
  const [playAnalysis, setPlayAnalysis] = useState<AnalyzeUserOptionPlayOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof UserOptionPlaySchema>>({
    resolver: zodResolver(UserOptionPlaySchema),
    defaultValues: {
      leg1: { action: 'Buy', type: 'Call', strike: parseFloat(latestClose) * 1.05 },
      expiration: '30',
    },
  });

  const onSubmit = async (values: z.infer<typeof UserOptionPlaySchema>) => {
    const momentumAnalysis = analysisResult?.analysis;
    const volatility = marketData ? calculateVolatility(marketData.map(d => parseFloat(d.close)).reverse(), 30) : null;

    if (!momentumAnalysis || !('signal' in momentumAnalysis) || volatility === null || !latestClose) {
        setError("Market analysis data must be fully loaded to analyze an option play.");
        return;
    }

    setLoading(true);
    setError(null);
    setPlayAnalysis(null);

    let leg2;
    if (values.leg2strike && values.leg2action && values.leg2type) {
        leg2 = {
            action: values.leg2action,
            type: values.leg2type,
            strike: values.leg2strike,
        };
    }
    
    const analysisInput: AnalyzeUserOptionPlayInput = {
        ticker,
        currentPrice: parseFloat(latestClose),
        momentumSignal: momentumAnalysis.signal,
        volatility: volatility,
        userStrategy: {
            leg1: values.leg1,
            leg2: leg2,
            expiration: parseInt(values.expiration, 10),
        },
    };

    try {
        const result = await analyzeUserOptionPlay(analysisInput);
        setPlayAnalysis(result);
    } catch (e: any) {
        setError(e.message || "The AI could not analyze this play.");
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <HelpCircle className="h-6 w-6 text-accent" />
          <span>Option Play Sandbox (AI)</span>
        </CardTitle>
        <CardDescription>
          Construct a custom 1 or 2-leg option play and get an AI-powered logical assessment based on the current market analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Leg 1 */}
                <div className="space-y-2 p-3 border rounded-lg">
                    <FormLabel className="text-sm font-semibold">Leg 1</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={form.control} name="leg1.action" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Action</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="leg1.type" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Call">Call</SelectItem><SelectItem value="Put">Put</SelectItem></SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="leg1.strike" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Strike Price</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}/>
                    </div>
                </div>

                {/* Leg 2 */}
                <div className="space-y-2 p-3 border border-dashed rounded-lg">
                    <FormLabel className="text-sm font-semibold text-muted-foreground">Leg 2 (Optional)</FormLabel>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={form.control} name="leg2action" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Action</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Buy">Buy</SelectItem><SelectItem value="Sell">Sell</SelectItem></SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="leg2type" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Call">Call</SelectItem><SelectItem value="Put">Put</SelectItem></SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="leg2strike" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Strike Price</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="Leave blank for 1 leg" {...field} onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} /></FormControl>
                            </FormItem>
                        )}/>
                    </div>
                    <FormMessage>{form.formState.errors.leg2action?.message}</FormMessage>
                </div>
                
                 {/* Expiration */}
                <FormField control={form.control} name="expiration" render={({ field }) => (
                    <FormItem className="space-y-3">
                         <FormLabel className="text-sm font-semibold">Expiration</FormLabel>
                         <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="14"/></FormControl>
                                    <Label className="font-normal">14 Days (Weekly)</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="30"/></FormControl>
                                    <Label className="font-normal">30 Days (Monthly)</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="60"/></FormControl>
                                    <Label className="font-normal">60 Days (2-3 Months)</Label>
                                </FormItem>
                            </RadioGroup>
                         </FormControl>
                    </FormItem>
                )}/>


                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Analyze My Play
                </Button>
            </form>
        </Form>
        
        {error && (
             <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {playAnalysis && (
            <div className="mt-6 pt-6 border-t animate-in fade-in-50 duration-500 space-y-4">
                 <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Assessment
                </h3>
                <div className={`p-4 rounded-lg border ${getAssessmentInfo(playAnalysis.assessment).bgColor}`}>
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h4 className="font-semibold text-base text-foreground">{playAnalysis.strategyName}</h4>
                        <div className={`flex items-center gap-1.5 font-semibold text-sm px-3 py-1 rounded-md border ${getAssessmentInfo(playAnalysis.assessment).bgColor} ${getAssessmentInfo(playAnalysis.assessment).color}`}>
                           {getAssessmentInfo(playAnalysis.assessment).icon}
                           <span>{playAnalysis.assessment}</span>
                        </div>
                     </div>
                    <Separator className="my-3 bg-foreground/10" />
                    <p className="text-sm text-muted-foreground leading-relaxed">{playAnalysis.analysis}</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
