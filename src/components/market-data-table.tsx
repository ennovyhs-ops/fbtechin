import type { MarketData } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { isCurrencyPair, isCryptoPair, formatCurrency } from '@/lib/utils';

interface MarketDataTableProps {
  data: MarketData[];
  ticker: string;
  currency: string | null;
}

export function MarketDataTable({ data, ticker, currency }: MarketDataTableProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Historical Data for {ticker}</CardTitle>
        <CardDescription>Showing recent end-of-day market data.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">High</TableHead>
                <TableHead className="text-right">Low</TableHead>
                <TableHead className="text-right">Close</TableHead>
                <TableHead className="text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="font-medium">{day.date}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.open, currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.high, currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.low, currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.close, currency)}</TableCell>
                  <TableCell className="text-right">{day.volume === 'N/A' ? 'N/A' : Number(day.volume).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
