
// Simple implementation of technical indicators.
// For production use, a robust library like 'technicalindicators' would be better.

import type { MarketData } from "./types";

// Simple Moving Average
const sma = (data: number[], period: number): number[] => {
    if (data.length < period) return new Array(data.length).fill(NaN);

    const result: number[] = new Array(period - 1).fill(NaN);
    
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
    if (data.length < period) {
        return new Array(data.length).fill(NaN);
    }
    
    const k = 2 / (period + 1);
    const result: number[] = new Array(data.length).fill(NaN);
    
    // Find the first valid data point to start the EMA
    let firstValidIndex = -1;
    for (let i = 0; i < data.length; i++) {
        if (!isNaN(data[i])) {
            firstValidIndex = i;
            break;
        }
    }
    
    if (firstValidIndex === -1 || data.length < firstValidIndex + period) {
        return result; // Not enough data
    }
    
    // Calculate initial SMA for the first EMA value
    let sum = 0;
    for (let i = firstValidIndex; i < firstValidIndex + period; i++) {
        sum += data[i];
    }
    result[firstValidIndex + period - 1] = sum / period;

    // Calculate subsequent EMAs
    for (let i = firstValidIndex + period; i < data.length; i++) {
        const prevEma = result[i - 1];
        if (isNaN(data[i]) || isNaN(prevEma)) {
             result[i] = prevEma; // Carry over last valid EMA
        } else {
             result[i] = (data[i] * k) + (prevEma * (1 - k));
        }
    }
    return result;
};


// Standard Deviation for a sliding window
const slidingStdDev = (data: number[], period: number): number[] => {
    if (data.length < period) return new Array(data.length).fill(NaN);

    const result: number[] = new Array(period - 1).fill(NaN);

    for (let i = period - 1; i < data.length; i++) {
        const chunk = data.slice(i - period + 1, i + 1);
        if (chunk.some(isNaN)) {
            result.push(NaN);
            continue;
        }
        const mean = chunk.reduce((a, b) => a + b, 0) / period;
        const variance = chunk.map(val => (val - mean) ** 2).reduce((a, b) => a + b, 0) / period;
        result.push(Math.sqrt(variance));
    }
    return result;
};

export const calculateBollingerBands = (data: number[], period: number, stdDevMultiplier: number) => {
    const middleBand = sma(data, period);
    const sd = slidingStdDev(data, period);

    const result = [];
    for(let i=0; i < data.length; i++) {
        const mid = middleBand[i];
        const s = sd[i];
        result.push({
            middle: mid,
            upper: (!isNaN(mid) && !isNaN(s)) ? mid + s * stdDevMultiplier : NaN,
            lower: (!isNaN(mid) && !isNaN(s)) ? mid - s * stdDevMultiplier : NaN,
        });
    }
    return result;
};

export const calculateRSI = (prices: number[], period: number): number[] => {
    const rsi: number[] = new Array(prices.length).fill(NaN);
    if (prices.length <= period) return rsi;

    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i-1]);
    }
    
    if (changes.length < period) return rsi;

    let gainSum = 0;
    let lossSum = 0;
    
    // Calculate initial average gain and loss from the first `period` changes
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            gainSum += changes[i];
        } else {
            lossSum -= changes[i]; // loss is positive
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
    if (data.length <= period) return new Array(data.length).fill(NaN);
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
        if (relevantData[i-1] <= 0 || relevantData[i] <= 0) continue; // Avoid log(0) or log(negative)
        logReturns.push(Math.log(relevantData[i] / relevantData[i - 1]));
    }

    if (logReturns.length === 0) return null;

    // 2. Calculate the standard deviation of the log returns
    const n = logReturns.length;
    if (n < 2) return null; // Need at least 2 returns to calculate variance
    const mean = logReturns.reduce((a, b) => a + b, 0) / n;
    const variance = logReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1); // Sample variance
    const stdDev = Math.sqrt(variance);

    // 3. Annualize the volatility (assuming 252 trading days in a year)
    const annualizedVolatility = stdDev * Math.sqrt(252);
    
    // Return as a percentage
    return annualizedVolatility * 100;
}

/**
 * Calculates the Moving Average of Volume.
 * @param volumeData - Array of chronological volume data.
 * @param period - The number of periods to average over.
 * @returns An array of the moving average of volume.
 */
export const calculateMAVol = (volumeData: number[], period: number): number[] => {
    return sma(volumeData, period);
};

/**
 * Calculates the Volume-Weighted Moving Average (VWMA).
 * @param prices - Array of chronological price data.
 * @param volumes - Array of chronological volume data.
 * @param period - The number of periods to average over.
 * @returns An array of the VWMA.
 */
export const calculateVWMA = (prices: number[], volumes: number[], period: number): number[] => {
    if (prices.length < period) return new Array(prices.length).fill(NaN);

    const result: number[] = new Array(period - 1).fill(NaN);

    let priceVolumeSum = 0;
    let volumeSum = 0;
    for (let i = 0; i < period; i++) {
        priceVolumeSum += prices[i] * volumes[i];
        volumeSum += volumes[i];
    }
    result.push(volumeSum === 0 ? prices[period -1] : priceVolumeSum / volumeSum);

    for (let i = period; i < prices.length; i++) {
        priceVolumeSum -= prices[i - period] * volumes[i - period];
        volumeSum -= volumes[i - period];
        
        priceVolumeSum += prices[i] * volumes[i];
        volumeSum += volumes[i];
        
        result.push(volumeSum === 0 ? prices[i] : priceVolumeSum / volumeSum);
    }
    return result;
};


// Box-Muller transform to get a normally distributed random number
const randomNormal = () => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

/**
 * Runs a Monte Carlo simulation for stock price projection.
 * @param prices - Array of chronological close prices (oldest to newest).
 * @param daysToSimulate - Number of future days to simulate.
 * @param numSimulations - Number of simulation paths to run.
 * @param confidenceInterval - The confidence interval (e.g., 0.7 for 70%).
 * @returns An object with the simulation results, or null if not enough data.
 */
export const runMonteCarloSimulation = (
    prices: number[], 
    daysToSimulate: number, 
    numSimulations: number,
    confidenceInterval: number
): { 
    probableRange: { lower: number, upper: number };
    averageTarget: number;
    confidence: number;
} | null => {
    if (prices.length < 2) return null;

    // 1. Calculate daily log returns
    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i-1] <= 0 || prices[i] <= 0) continue;
        logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    if (logReturns.length === 0) return null;

    // 2. Calculate drift and volatility
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance = logReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (logReturns.length - 1);
    const stdDev = Math.sqrt(variance);

    const drift = mean - (variance / 2);
    const volatility = stdDev;
    
    const lastPrice = prices[prices.length - 1];
    const finalPrices: number[] = [];

    // 3. Run simulations
    for (let i = 0; i < numSimulations; i++) {
        let pricePath = [lastPrice];
        for (let j = 0; j < daysToSimulate; j++) {
            const randomShock = randomNormal();
            const nextPrice = pricePath[j] * Math.exp(drift + volatility * randomShock);
            pricePath.push(nextPrice);
        }
        finalPrices.push(pricePath[pricePath.length - 1]);
    }

    // 4. Analyze results
    finalPrices.sort((a, b) => a - b);
    const averageTarget = finalPrices.reduce((a, b) => a + b, 0) / numSimulations;
    
    const lowerBoundIndex = Math.floor(((1 - confidenceInterval) / 2) * numSimulations);
    const upperBoundIndex = Math.floor(((1 + confidenceInterval) / 2) * numSimulations);
    
    const lowerBound = finalPrices[lowerBoundIndex];
    const upperBound = finalPrices[upperBoundIndex];

    return {
        probableRange: { lower: lowerBound, upper: upperBound },
        averageTarget,
        confidence: confidenceInterval * 100,
    };
};

/**
 * Calculates Average True Range (ATR).
 * @param data - Array of {high, low, close} objects in chronological order.
 * @param period - The period for the ATR calculation (usually 14).
 * @returns An array of ATR values.
 */
export const calculateATR = (
    data: { high: number, low: number, close: number }[],
    period: number
): number[] => {
    if (data.length < period) return new Array(data.length).fill(NaN);

    const trValues: number[] = [NaN]; // True Range values
    for (let i = 1; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i - 1].close;

        if (isNaN(high) || isNaN(low) || isNaN(prevClose)) {
            trValues.push(NaN);
            continue;
        }

        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trValues.push(tr);
    }
    
    const atr: number[] = new Array(period).fill(NaN);

    // Initial ATR is the simple average of the first 'period' TRs
    let sumTr = 0;
    for (let i = 1; i <= period; i++) {
      if(isNaN(trValues[i])) { // If any value is NaN, we can't calculate initial sum
          sumTr = NaN;
          break;
      }
      sumTr += trValues[i];
    }
    
    if (!isNaN(sumTr)) {
        atr[period] = sumTr / period;
    }


    // Subsequent ATRs use Wilder's smoothing
    for (let i = period + 1; i < data.length; i++) {
        const prevAtr = atr[i - 1];
        const currentTr = trValues[i];

        if (isNaN(prevAtr) || isNaN(currentTr)) {
             atr[i] = prevAtr; // Carry forward last valid ATR
        } else {
             atr[i] = (prevAtr * (period - 1) + currentTr) / period;
        }
    }
    
    // The ATR array is offset by 1 because TR starts at index 1.
    // Let's align it with the original data length.
    return atr;
};

/**
 * Calculates Standard Pivot Points.
 * @param data - An object with the high, low, and close of the PREVIOUS period.
 * @returns An object with the pivot point and support/resistance levels.
 */
export const calculatePivotPoints = (
    data: { high: number; low: number; close: number }
): { pp: number; s1: number; s2: number; r1: number; r2: number } | null => {
    const { high, low, close } = data;
    if (isNaN(high) || isNaN(low) || isNaN(close)) {
        return null;
    }

    const pp = (high + low + close) / 3;
    const r1 = (2 * pp) - low;
    const s1 = (2 * pp) - high;
    const r2 = pp + (high - low);
    const s2 = pp - (high - low);

    return { pp, s1, s2, r1, r2 };
};


/**
 * Calculates Fibonacci Retracement levels based on a price swing.
 * @param marketData - Array of market data objects, assumed to be in descending order by date (newest first).
 * @param period - The number of days to look back to find the high/low swing.
 * @returns An object with the Fibonacci levels, or null if not enough data.
 */
export const calculateFibonacciRetracement = (
    marketData: MarketData[],
    period: number
): { 
    level236: number; 
    level382: number;
    level500: number;
    level618: number;
    rangeHigh: number;
    rangeLow: number;
} | null => {
    if (marketData.length < period) {
        return null;
    }

    const dataSlice = marketData.slice(0, period);
    const isSynthesizedData = dataSlice.every(d => d.open === d.close && d.high === d.close && d.low === d.close);

    let high = -Infinity;
    let low = Infinity;

    dataSlice.forEach(d => {
        const h = isSynthesizedData ? parseFloat(d.close) : parseFloat(d.high);
        const l = isSynthesizedData ? parseFloat(d.close) : parseFloat(d.low);
        if (!isNaN(h) && h > high) high = h;
        if (!isNaN(l) && l < low) low = l;
    });

    if (high === -Infinity || low === Infinity || high === low) {
        return null;
    }

    const range = high - low;
    
    // In an uptrend, levels are subtracted from the high. In a downtrend, added to the low.
    // For simplicity, we calculate both directions and the UI can decide what to show, 
    // or we can determine trend direction here.
    // Let's assume we are calculating retracement from a recent swing, so we calculate levels *within* the range.
    
    const levels = {
        rangeHigh: high,
        rangeLow: low,
        level236: high - (range * 0.236),
        level382: high - (range * 0.382),
        level500: high - (range * 0.5),
        level618: high - (range * 0.618),
    };
    
    return levels;
};


// Helper to calculate Standard Deviation
export const calculateStdDev = (data: number[]): number => {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(variance);
};
