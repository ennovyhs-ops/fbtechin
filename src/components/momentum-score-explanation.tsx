import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function MomentumScoreExplanation() {
  return (
    <div className="mt-4 space-y-4 text-sm text-muted-foreground animate-in fade-in-50 duration-500">
      <p>
        The AI Momentum Score is a proprietary value calculated by analyzing five key technical indicators. Each indicator contributes points to a final score that ranges from -1.0 (strongly bearish) to +1.0 (strongly bullish).
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Indicator</TableHead>
              <TableHead className="font-semibold">Analysis</TableHead>
              <TableHead className="text-right font-semibold">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Rate of Change (ROC)</TableCell>
              <TableCell>Checks if the 22-day ROC is positive (bullish) or negative (bearish).</TableCell>
              <TableCell className="text-right">±0.2</TableCell>
            </TableRow>
             <TableRow>
              <TableCell>Bollinger Bands®</TableCell>
              <TableCell>Analyzes price vs. the 20-day SMA and checks for breakouts.</TableCell>
              <TableCell className="text-right">±0.2</TableCell>
            </TableRow>
             <TableRow>
              <TableCell>RSI</TableCell>
              <TableCell>Uses RSI level for alignment (>60 strong bullish, <40 strong bearish) and checks for bullish/bearish divergence against price.</TableCell>
              <TableCell className="text-right">±0.3</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>MACD</TableCell>
              <TableCell>Checks if the MACD line is above the signal line (bullish) and for bullish crossovers.</TableCell>
              <TableCell className="text-right">±0.3</TableCell>
            </TableRow>
             <TableRow>
              <TableCell>Volume Momentum</TableCell>
              <TableCell>Looks for signs of accumulation (buying) or distribution (selling) by analyzing high-volume days over the last 10 days.</TableCell>
              <TableCell className="text-right">±0.1</TableCell>
            </TableRow>
             <TableRow>
              <TableCell>Volatility Context</TableCell>
              <TableCell>Detects a Bollinger Band "squeeze" (low volatility), which can signal a stronger potential breakout. Adds points if momentum aligns with the squeeze direction.</TableCell>
              <TableCell className="text-right">±0.1</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

       <p className="pt-2 text-xs">
        Note: The points from each indicator are summed to produce the final score, which then determines the signal, interpretation, and suggested trading action based on predefined thresholds. The maximum possible score is capped at ±1.0.
      </p>
    </div>
  );
}
