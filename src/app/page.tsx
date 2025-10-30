'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Search } from 'lucide-react';

import type { MarketData } from '@/lib/types';
import { fetchMarketData } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Header } from '@/components/header';
import { MarketDataTable } from '@/components/market-data-table';
import { SuggestedQuestions } from '@/components/suggested-questions';

const FormSchema = z.object({
  ticker: z.string().min(1, 'Ticker symbol is required.').max(10, 'Ticker symbol is too long.').toUpperCase(),
});

export default function Home() {
  const [isPending, startTransition] = useTransition();
  const [marketData, setMarketData] = useState<MarketData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ticker: '',
    },
  });

  async function onSubmit(values: z.infer<typeof FormSchema>) {
    setError(null);
    setMarketData(null);
    setSubmittedTicker(null);

    startTransition(async () => {
      const result = await fetchMarketData(values.ticker);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setMarketData(result.data);
        setSubmittedTicker(values.ticker);
      }
    });
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Header />
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Search Stock Data</CardTitle>
            <CardDescription>Enter a stock ticker symbol to retrieve end-of-day market data.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent>
                <FormField
                  control={form.control}
                  name="ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker Symbol</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g., AAPL, MSFT, 0005.HK" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? 'Retrieving Data...' : 'Get Data'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <div className="mt-8 space-y-8">
          {isPending && (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {marketData && marketData.length > 0 && (
            <div className="animate-in fade-in-50 duration-500">
              <MarketDataTable data={marketData} ticker={submittedTicker!} />
            </div>
          )}
          
          {submittedTicker && marketData && marketData.length > 0 && (
            <div className="animate-in fade-in-50 duration-500 delay-200">
                <SuggestedQuestions ticker={submittedTicker} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
