// Simple implementation of technical indicators.
// For production use, a robust library like 'technicalindicators' would be better.

// Simple Moving Average
const sma = (data: number[], period: number): number[] => {
    const result: number[] = [];
    for (let i = 0; i <= data.length - period; i++) {
        const chunk = data.slice(i, i + period);
        const sum = chunk.reduce((a, b) => a + b, 0);
        result.push(sum / period);
    }
    // Pad with leading nulls to match original data length
    return Array(data.length - result.length).fill(NaN).concat(result);
};

// Exponential Moving Average
const ema = (data: number[], period: number): number[] => {
    const result: number[] = [];
    const k = 2 / (period + 1);
    let ema = NaN;

    for (let i = 0; i < data.length; i++) {
        if (i < period -1) {
             result.push(NaN);
             continue;
        }
        if (i === period - 1) {
            const chunk = data.slice(0, period);
            const sum = chunk.reduce((a, b) => a + b, 0);
            ema = sum / period;
        } else {
            // Check if previous ema is a number before calculating
            if (!isNaN(ema)) {
                ema = data[i] * k + ema * (1 - k);
            }
        }
        result.push(ema);
    }
    return result;
};


// Standard Deviation
const stdDev = (data: number[], period: number): number[] => {
    const result: number[] = [];
    for (let i = 0; i <= data.length - period; i++) {
        const chunk = data.slice(i, i + period);
        const mean = chunk.reduce((a, b) => a + b, 0) / period;
        const sqDiffs = chunk.map(val => (val - mean) ** 2);
        const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / period;
        result.push(Math.sqrt(avgSqDiff));
    }
     return Array(data.length - result.length).fill(NaN).concat(result);
};

export const calculateBollingerBands = (data: number[], period: number, stdDevMultiplier: number) => {
    const middleBand = sma(data, period);
    const sd = stdDev(data, period);
    const upperBand = middleBand.map((mid, i) => mid + sd[i] * stdDevMultiplier);
    const lowerBand = middleBand.map((mid, i) => mid - sd[i] * stdDevMultiplier);

    const result = [];
    for(let i=0; i < data.length; i++) {
        result.push({
            middle: middleBand[i],
            upper: upperBand[i],
            lower: lowerBand[i]
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
    
    const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
    const signalLine = ema(macdLine.filter(v => !isNaN(v)), signalPeriod);
    
    // Align signalLine with macdLine
    const alignedSignalLine = new Array(macdLine.length).fill(NaN);
    let signalIndex = 0;
    for(let i=0; i < macdLine.length; i++) {
        if(!isNaN(macdLine[i])) {
            if(signalIndex < signalLine.length) {
                alignedSignalLine[i] = signalLine[signalIndex];
                signalIndex++;
            }
        }
    }

    const histogram = macdLine.map((macd, i) => macd - alignedSignalLine[i]);

    const result = [];
    for(let i=0; i < data.length; i++) {
        result.push({
            MACD: macdLine[i],
            signal: alignedSignalLine[i],
            histogram: histogram[i]
        });
    }

    return result;
};


export const calculateROC = (data: number[], period: number) => {
    const result: number[] = [];
    for (let i = period; i < data.length; i++) {
        const roc = ((data[i] - data[i - period]) / data[i - period]) * 100;
        result.push(roc);
    }
    return Array(data.length - result.length).fill(NaN).concat(result);
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
