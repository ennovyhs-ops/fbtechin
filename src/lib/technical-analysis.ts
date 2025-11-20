
// Simple implementation of technical indicators.
// For production use, a robust library like 'technicalindicators' would be better.

// Simple Moving Average
const sma = (data: number[], period: number): number[] => {
    const result: number[] = new Array(period - 1).fill(NaN);
    if (data.length < period) return new Array(data.length).fill(NaN);
    
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    result.push(sum / period);

    for (let i = period; i < data.length; i++) {
        sum -= data[i - period];
        sum += data[i];
        result.push(sum / period);
    }
    return result;
};

// Exponential Moving Average
const ema = (data: number[], period: number): number[] => {
    const result: number[] = new Array(data.length).fill(NaN);
    const k = 2 / (period + 1);
    
    if (data.length > 0) {
        result[0] = data[0]; // Start with the first data point

        for (let i = 1; i < data.length; i++) {
            if (isNaN(result[i-1])) {
                 // If previous EMA is NaN, try to re-seed from current data point.
                 result[i] = data[i];
            } else {
                 result[i] = (data[i] * k) + (result[i-1] * (1 - k));
            }
        }
    }
    return result;
};


// Standard Deviation
const stdDev = (data: number[], period: number): number[] => {
    const result: number[] = new Array(period-1).fill(NaN);
    if (data.length < period) return new Array(data.length).fill(NaN);

    for (let i = period - 1; i < data.length; i++) {
        const chunk = data.slice(i - period + 1, i + 1);
        const mean = chunk.reduce((a, b) => a + b, 0) / period;
        const sqDiffs = chunk.map(val => (val - mean) ** 2);
        const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / period;
        result.push(Math.sqrt(avgSqDiff));
    }
    return result;
};

export const calculateBollingerBands = (data: number[], period: number, stdDevMultiplier: number) => {
    const middleBand = sma(data, period);
    const sd = stdDev(data, period);

    const result = [];
    for(let i=0; i < data.length; i++) {
        const mid = middleBand[i];
        const s = sd[i];
        result.push({
            middle: mid,
            upper: mid + s * stdDevMultiplier,
            lower: mid - s * stdDevMultiplier,
        });
    }
    return result;
};

export const calculateRSI = (prices: number[], period: number): number[] => {
    const rsi: number[] = new Array(prices.length).fill(NaN);
    if (prices.length <= period) return rsi;

    let gainSum = 0;
    let lossSum = 0;
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i-1]);
    }

    // Calculate initial average gain and loss
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            gainSum += changes[i];
        } else {
            lossSum -= changes[i];
        }
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + rs));

    // Calculate subsequent RSI values using Wilder's smoothing method
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        let currentGain = 0;
        let currentLoss = 0;

        if (change > 0) {
            currentGain = change;
        } else {
            currentLoss = -change;
        }

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
        rsi[i + 1] = 100 - (100 / (1 + rs));
    }

    return rsi;
};


export const calculateMACD = (data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
    const emaFast = ema(data, fastPeriod);
    const emaSlow = ema(data, slowPeriod);
    
    const macdLine = emaFast.map((fast, i) => {
        if(isNaN(fast) || isNaN(emaSlow[i])) return NaN;
        return fast - emaSlow[i];
    });

    const signalLine = ema(macdLine, signalPeriod);

    const histogram = macdLine.map((macd, i) => {
        if(isNaN(macd) || isNaN(signalLine[i])) return NaN;
        return macd - signalLine[i];
    });

    const result = [];
    for(let i=0; i < data.length; i++) {
        result.push({
            MACD: macdLine[i],
            signal: signalLine[i],
            histogram: histogram[i]
        });
    }

    return result;
};


export const calculateROC = (data: number[], period: number) => {
    const result: number[] = new Array(period).fill(NaN);
    for (let i = period; i < data.length; i++) {
        const roc = ((data[i] - data[i - period]) / data[i - period]) * 100;
        result.push(roc);
    }
    return result;
};

export const calculateMultiROC = (data: number[], periods: number[]) => {
    const results: Record<string, number[]> = {};
    const maxPeriod = Math.max(...periods);

    if (data.length <= maxPeriod) {
        periods.forEach(p => {
            results[`roc${p}`] = new Array(data.length).fill(NaN);
        });
        return results;
    }

    periods.forEach(period => {
        results[`roc${period}`] = calculateROC(data, period);
    });

    return results;
};


/**
 * Calculates the annualized historical volatility.
 * @param data - Array of chronological close prices.
 * @param period - The number of periods (days) to calculate volatility for.
 * @returns The annualized volatility as a percentage, or null if not enough data.
 */
export const calculateVolatility = (data: number[], period: number): number | null => {
    if (data.length < period) return null;

    const relevantData = data.slice(data.length - period);
    
    // 1. Calculate daily log returns
    const logReturns: number[] = [];
    for (let i = 1; i < relevantData.length; i++) {
        logReturns.push(Math.log(relevantData[i] / relevantData[i - 1]));
    }

    if (logReturns.length === 0) return null;

    // 2. Calculate the standard deviation of the log returns
    const n = logReturns.length;
    const mean = logReturns.reduce((a, b) => a + b, 0) / n;
    const variance = logReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    // 3. Annualize the volatility (assuming 252 trading days in a year)
    const annualizedVolatility = stdDev * Math.sqrt(252);
    
    // Return as a percentage
    return annualizedVolatility * 100;
}
