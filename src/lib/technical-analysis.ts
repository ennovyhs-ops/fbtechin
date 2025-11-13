
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
    if (data.length < period) return new Array(data.length).fill(NaN);

    const result: (number | null)[] = new Array(data.length).fill(null);
    const k = 2 / (period + 1);

    // Find the first valid data point to start the calculation
    let firstValidIndex = data.findIndex(d => d !== null && !isNaN(d));
    if (firstValidIndex === -1 || firstValidIndex + period > data.length) {
        return new Array(data.length).fill(NaN); // Not enough data
    }
    
    // Initial value is the SMA of the first 'period' values
    let sum = 0;
    for(let i = firstValidIndex; i < firstValidIndex + period; i++) {
        sum += data[i];
    }
    result[firstValidIndex + period - 1] = sum / period;
    
    // Subsequent values use the EMA formula
    for (let i = firstValidIndex + period; i < data.length; i++) {
         if (data[i] === null || isNaN(data[i])) {
            result[i] = result[i-1]; // carry forward last value if data is missing
            continue;
         }
         const prevEma = result[i-1];
         if (prevEma === null) {
            // Should not happen after correct initialization, but as a safeguard
            let tempSmaSum = 0;
            for(let j = i - period + 1; j <= i; j++) {
                tempSmaSum += data[j];
            }
            result[i] = tempSmaSum / period;
         } else {
            result[i] = (data[i] * k) + (prevEma * (1 - k));
         }
    }
    
    return result.map(val => val === null ? NaN : val);
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

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gainSum += change;
        } else {
            lossSum -= change;
        }
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + rs));

    // Calculate subsequent RSI values
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
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
        rsi[i] = 100 - (100 / (1 + rs));
    }

    return rsi;
};


export const calculateMACD = (data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
    const emaFast = ema(data, fastPeriod);
    const emaSlow = ema(data, slowPeriod);
    
    const macdLine = emaSlow.map((slow, i) => emaFast[i] - slow);
    const signalLine = ema(macdLine, signalPeriod);
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

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
}
