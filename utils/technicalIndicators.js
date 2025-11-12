/**
 * Technical Indicators Utility Functions
 * Calculates various technical analysis indicators for stock price data
 */

/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array} data - Array of price data points with { timestamp, value } or { timestamp, close }
 * @param {number} period - Number of periods for the moving average (e.g., 20, 50, 200)
 * @returns {Array} Array of { timestamp, value } for the SMA
 */
export function calculateSMA(data, period) {
  if (!Array.isArray(data) || data.length < period || period < 1) {
    return [];
  }

  const result = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      const price = data[i - j].close ?? data[i - j].value;
      sum += price;
    }
    const sma = sum / period;
    result.push({
      timestamp: data[i].timestamp,
      value: sma,
    });
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {Array} data - Array of price data points
 * @param {number} period - Number of periods for the EMA
 * @returns {Array} Array of { timestamp, value } for the EMA
 */
export function calculateEMA(data, period) {
  if (!Array.isArray(data) || data.length < period || period < 1) {
    return [];
  }

  const result = [];
  const multiplier = 2 / (period + 1);

  // Calculate the first EMA using SMA
  let ema = 0;
  for (let i = 0; i < period; i++) {
    const price = data[i].close ?? data[i].value;
    ema += price;
  }
  ema = ema / period;

  result.push({
    timestamp: data[period - 1].timestamp,
    value: ema,
  });

  // Calculate subsequent EMAs
  for (let i = period; i < data.length; i++) {
    const price = data[i].close ?? data[i].value;
    ema = (price - ema) * multiplier + ema;
    result.push({
      timestamp: data[i].timestamp,
      value: ema,
    });
  }

  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param {Array} data - Array of price data points
 * @param {number} period - RSI period (typically 14)
 * @returns {Array} Array of { timestamp, value } for the RSI (0-100)
 */
export function calculateRSI(data, period = 14) {
  if (!Array.isArray(data) || data.length < period + 1) {
    return [];
  }

  const result = [];
  let gains = [];
  let losses = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const currentPrice = data[i].close ?? data[i].value;
    const previousPrice = data[i - 1].close ?? data[i - 1].value;
    const change = currentPrice - previousPrice;

    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate RSI for first period
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));

  result.push({
    timestamp: data[period].timestamp,
    value: rsi,
  });

  // Calculate subsequent RSI values
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));

    result.push({
      timestamp: data[i + 1].timestamp,
      value: rsi,
    });
  }

  return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {Array} data - Array of price data points
 * @param {number} fastPeriod - Fast EMA period (typically 12)
 * @param {number} slowPeriod - Slow EMA period (typically 26)
 * @param {number} signalPeriod - Signal line EMA period (typically 9)
 * @returns {Object} { macd: Array, signal: Array, histogram: Array }
 */
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!Array.isArray(data) || data.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine = [];
  const slowStartIndex = slowPeriod - 1;

  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + (slowStartIndex - (fastPeriod - 1));
    if (fastIndex >= 0 && fastIndex < fastEMA.length) {
      macdLine.push({
        timestamp: slowEMA[i].timestamp,
        value: fastEMA[fastIndex].value - slowEMA[i].value,
      });
    }
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Calculate histogram (MACD - Signal)
  const histogram = [];
  for (let i = 0; i < signalLine.length; i++) {
    const macdIndex = i + (signalPeriod - 1);
    if (macdIndex < macdLine.length) {
      histogram.push({
        timestamp: signalLine[i].timestamp,
        value: macdLine[macdIndex].value - signalLine[i].value,
      });
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  };
}

/**
 * Calculate Bollinger Bands
 * @param {Array} data - Array of price data points
 * @param {number} period - Period for SMA (typically 20)
 * @param {number} stdDevMultiplier - Standard deviation multiplier (typically 2)
 * @returns {Object} { upper: Array, middle: Array, lower: Array }
 */
export function calculateBollingerBands(data, period = 20, stdDevMultiplier = 2) {
  if (!Array.isArray(data) || data.length < period) {
    return { upper: [], middle: [], lower: [] };
  }

  const middle = calculateSMA(data, period);
  const upper = [];
  const lower = [];

  for (let i = period - 1; i < data.length; i++) {
    // Calculate standard deviation
    let sum = 0;
    const prices = [];
    for (let j = 0; j < period; j++) {
      const price = data[i - j].close ?? data[i - j].value;
      prices.push(price);
      sum += price;
    }
    const mean = sum / period;

    const variance = prices.reduce((acc, price) => {
      return acc + Math.pow(price - mean, 2);
    }, 0) / period;

    const stdDev = Math.sqrt(variance);

    const middleValue = middle[i - (period - 1)].value;

    upper.push({
      timestamp: data[i].timestamp,
      value: middleValue + (stdDev * stdDevMultiplier),
    });

    lower.push({
      timestamp: data[i].timestamp,
      value: middleValue - (stdDev * stdDevMultiplier),
    });
  }

  return {
    upper,
    middle,
    lower,
  };
}

/**
 * Get all available indicators
 * @returns {Array} Array of indicator metadata
 */
export function getAvailableIndicators() {
  return [
    {
      id: 'sma_20',
      name: 'SMA (20)',
      color: '#2196F3',
      calculate: (data) => calculateSMA(data, 20),
    },
    {
      id: 'sma_50',
      name: 'SMA (50)',
      color: '#FF9800',
      calculate: (data) => calculateSMA(data, 50),
    },
    {
      id: 'sma_200',
      name: 'SMA (200)',
      color: '#9C27B0',
      calculate: (data) => calculateSMA(data, 200),
    },
    {
      id: 'ema_12',
      name: 'EMA (12)',
      color: '#00BCD4',
      calculate: (data) => calculateEMA(data, 12),
    },
    {
      id: 'ema_26',
      name: 'EMA (26)',
      color: '#FF5722',
      calculate: (data) => calculateEMA(data, 26),
    },
    {
      id: 'bollinger',
      name: 'Bollinger Bands',
      color: '#673AB7',
      calculate: (data) => calculateBollingerBands(data, 20, 2),
    },
  ];
}
