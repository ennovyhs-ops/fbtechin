'use client';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, X, HelpCircle, Printer, Zap, BrainCircuit, BarChart3, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(20, 'Ticker symbol is too long.'),
});

interface DataInputFormProps {
    isPending: boolean;
    uploadedFileName: string | null;
    onFormSubmit: (values: z.infer<typeof FormSchema>) => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPrint: () => void;
    hasMarketData: boolean;
}

export function DataInputForm({ 
    isPending, 
    uploadedFileName, 
    onFormSubmit, 
    onFileUpload,
    onPrint,
    hasMarketData,
}: DataInputFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            ticker: '',
        },
    });

    return (
        <Card className="w-full no-print">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Search or Upload Market Data</CardTitle>
                <CardDescription>Enter a symbol to fetch data, or upload a CSV/XLS/XLSX file with historical data.</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit)}>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="flex-grow w-full">
                        <FormField
                            control={form.control}
                            name="ticker"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ticker Symbol / Currency Pair / Crypto</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            placeholder="e.g., AAPL, EURUSD, 0700.HK, BTCUSD"
                                            {...field}
                                            onInput={(e) => {
                                                field.onChange(e.currentTarget.value.toUpperCase())
                                            }}
                                            className={field.value ? 'pr-8' : ''}
                                        />
                                        {field.value && (
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                    form.setValue('ticker', '');
                                                    field.onChange('');
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                                <span className="sr-only">Clear</span>
                                            </Button>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>

                        <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={onFileUpload}
                                accept=".csv, .xlsx, .xls"
                                className="hidden"
                            />
                            <div className="w-full text-center">
                                <p className="text-xs text-muted-foreground mb-2">
                                    File format: Date, Close required
                                </p>
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending} className="w-full">
                                    <Upload className="mr-2 h-4 w-4" />
                                    {uploadedFileName ? 'New File' : 'Upload File'}
                                </Button>
                            </div>
                    </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={isPending}>
                        {isPending && !uploadedFileName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isPending && !uploadedFileName ? 'Retrieving Data...' : 'Get Data'}
                    </Button>
                    <Button type="button" variant="outline" onClick={onPrint} disabled={!hasMarketData}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Report
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline">
                            Application Guide
                            <HelpCircle className="ml-2 h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                            <DialogHeader>
                            <DialogTitle className="font-headline text-3xl">Application Guide</DialogTitle>
                            <DialogDescription>
                                Deep dive into the market data integration and AI-driven insights of fbtechin.
                            </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 text-sm overflow-y-auto pr-4 pb-4">
                            
                            <section>
                                <h3 className="font-bold text-base text-foreground mb-2 flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    1. Data Sources & Capabilities
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-muted-foreground">
                                        Integrated via Alpha Vantage, providing high-fidelity financial data across multiple asset classes:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                        <li><strong>Global Equities:</strong> Access end-of-day data for thousands of tickers across US and international exchanges (e.g., AAPL, TSLA, 0700.HK, BABA).</li>
                                        <li><strong>Forex (FX):</strong> Track major and minor currency pairs with daily historical precision (e.g., EURUSD, GBPJPY, AUDCAD).</li>
                                        <li><strong>Cryptocurrencies:</strong> Monitor digital asset performance paired with USD (e.g., BTCUSD, ETHUSD, SOLUSD).</li>
                                        <li><strong>News & Sentiment:</strong> Real-time feed with ticker-specific sentiment scores derived from natural language processing.</li>
                                    </ul>
                                </div>
                            </section>

                            <Separator />

                            <section>
                                <h3 className="font-bold text-base text-foreground mb-2 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-primary" />
                                    2. Limits & Data Management
                                </h3>
                                <div className="space-y-3">
                                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                        <li><strong>The 100-Day Limit:</strong> To ensure stability on the Alpha Vantage free tier, stock data is fetched in <strong>"compact"</strong> mode (the last 100 trading days). This provides roughly 5 months of history.</li>
                                        <li><strong>Full Historical Analysis:</strong> Features like the <strong>52-Week Range</strong> or long-term backtesting require 252+ days. To unlock these for stocks, use the <strong>Upload File</strong> feature with your own CSV/Excel data.</li>
                                        <li><strong>File Requirements:</strong> Uploaded files must include at least two columns: <code>date</code> and <code>close</code>. The engine will automatically detect other headers like <code>volume</code> and <code>high/low</code>.</li>
                                    </ul>
                                </div>
                            </section>

                            <Separator />

                            <section>
                                <h3 className="font-bold text-base text-foreground mb-2 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-primary" />
                                    3. Dynamic Market Simulation
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-muted-foreground">
                                        One of the core features is the <strong>Live Price Simulation</strong> located in the main data card.
                                    </p>
                                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                        <li><strong>What-If Analysis:</strong> Manually adjust the price in the input field to simulate a real-time move.</li>
                                        <li><strong>Instant Recalculation:</strong> Clicking "Recalculate" instantly updates the AI Momentum Score, the probabilistic Monte Carlo range, and the short-term price targets based on your hypothetical entry.</li>
                                    </ul>
                                </div>
                            </section>

                            <Separator />

                            <section>
                                <h3 className="font-bold text-base text-foreground mb-2 flex items-center gap-2">
                                    <BrainCircuit className="h-4 w-4 text-primary" />
                                    4. Advanced AI Synthesis
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-foreground text-sm">Momentum & Probability</h4>
                                        <p className="text-muted-foreground mt-1">A deterministic engine scores momentum (-1 to +1) while a 10,000-path Monte Carlo simulation calculates a 30-day "probable range" based on historical drift and volatility.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground text-sm">Option Play Sandbox</h4>
                                        <p className="text-muted-foreground mt-1">Build custom multi-leg strategies. The AI evaluates your play's alignment with current technical momentum and annualized volatility, highlighting structural advantages and risks.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground text-sm">Trade Idea Synthesis</h4>
                                        <p className="text-muted-foreground mt-1">Google Gemini 1.5 Flash synthesizes the momentum model, Monte Carlo forecast, and volatility state into three distinct ideas: <strong>Primary</strong> (highest suitability), <strong>Alternative</strong> (creative hedging), and <strong>Lotto Ticket</strong> (high-risk/high-reward speculative play).</p>
                                    </div>
                                </div>
                            </section>
                            
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
