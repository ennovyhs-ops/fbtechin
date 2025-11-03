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
            ema = data[i] * k + ema * (1 - k);
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

export const calculateRSI = (data: number[], period: number): number[] => {
    const result: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        if (i <= period) {
            if (diff > 0) gains += diff;
            else losses -= diff;
        }

        if (i === period) {
            const avgGain = gains / period;
            const avgLoss = losses / period;
            const rs = avgGain / avgLoss;
            result.push(100 - 100 / (1 + rs));
        }

        if (i > period) {
            let currentGain = 0;
            let currentLoss = 0;
            if (diff > 0) currentGain = diff;
            else currentLoss = -diff;
            
            const lastAvgGain = (result[result.length - 1] / 100) * period / (100 - result[result.length-1]) * period;
            
            const prevAvgGain = (gains / period) * (period - 1);
            const prevAvgLoss = (losses / period) * (period - 1);

            const newAvgGain = ((prevAvgGain * (period -1)) + currentGain) / period;
            const newAvgLoss = ((prevAvgLoss * (period-1)) + currentLoss) / period;

            const newRs = newAvgGain / newAvgLoss;
            result.push(100 - 100 / (1 + newRs));
        }
    }
    
    const rsiValues: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
        const change = data[i] - data[i - 1];
        if (change > 0) {
            avgGain += change;
        } else {
            avgLoss -= change;
        }
    }
    avgGain /= period;
    avgLoss /= period;
    
    rsiValues.push(100 - 100 / (1 + avgGain / avgLoss));

    // Calculate subsequent RSI values
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        let gain = 0;
        let loss = 0;
        if (change > 0) {
            gain = change;
        } else {
            loss = -change;
        }
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsiValues.push(100 - 100 / (1 + avgGain / avgLoss));
    }


    return Array(data.length - rsiValues.length).fill(NaN).concat(rsiValues);
};


export const calculateMACD = (data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
    const emaFast = ema(data, fastPeriod);
    const emaSlow = ema(data, slowPeriod);
    
    const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
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
    const result: number[] = [];
    for (let i = period; i < data.length; i++) {
        const roc = ((data[i] - data[i - period]) / data[i - period]) * 100;
        result.push(roc);
    }
    return Array(data.length - result.length).fill(NaN).concat(result);
};
