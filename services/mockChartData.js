// Mock chart data generator for when APIs are unavailable
// Creates realistic stock price movements

export const generateRealisticChartData = (symbol, timeRange) => {
  // Use symbol to create consistent but different base prices for each stock
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 50 + (symbolHash % 200); // Price between $50-$250

  // Determine number of data points based on time range
  const pointsMap = {
    '1D': 78,    // 6.5 hours of 5-min intervals
    '1W': 5,     // 5 trading days
    '1M': 21,    // ~21 trading days
    '3M': 63,    // ~63 trading days
    '1Y': 252,   // ~252 trading days
    'ALL': 1260, // ~5 years of trading days
  };

  const points = pointsMap[timeRange] || 30;
  const now = Date.now();

  // Time interval between points
  const intervalMap = {
    '1D': 300000,      // 5 minutes
    '1W': 86400000,    // 1 day
    '1M': 86400000,    // 1 day
    '3M': 86400000,    // 1 day
    '1Y': 86400000,    // 1 day
    'ALL': 86400000,   // 1 day
  };

  const interval = intervalMap[timeRange] || 86400000;

  // Generate realistic price movements
  const data = [];
  let currentPrice = basePrice;

  for (let i = 0; i < points; i++) {
    // Add trend (slight upward bias over time)
    const trend = (i / points) * (basePrice * 0.15); // 15% growth over period

    // Add realistic volatility
    const dailyVolatility = basePrice * 0.02; // 2% daily volatility
    const randomWalk = (Math.random() - 0.5) * dailyVolatility;

    // Calculate price with trend and volatility
    currentPrice = basePrice + trend + randomWalk;

    // Ensure price doesn't go below a minimum
    currentPrice = Math.max(currentPrice, basePrice * 0.5);

    // Create OHLC (Open, High, Low, Close) values
    const open = currentPrice + (Math.random() - 0.5) * dailyVolatility * 0.5;
    const close = currentPrice + (Math.random() - 0.5) * dailyVolatility * 0.5;
    const high = Math.max(open, close) + Math.random() * dailyVolatility * 0.3;
    const low = Math.min(open, close) - Math.random() * dailyVolatility * 0.3;

    data.push({
      timestamp: now - (points - i) * interval,
      value: close,
      open: open,
      high: high,
      low: low,
      close: close,
    });
  }

  return data;
};

// Generate demo data for specific major stocks with realistic prices
export const getRealisticPriceForSymbol = (symbol) => {
  const priceMap = {
    'AAPL': 175,
    'MSFT': 380,
    'GOOGL': 140,
    'AMZN': 150,
    'NVDA': 480,
    'META': 350,
    'TSLA': 240,
    'BRK.B': 380,
    'JPM': 155,
    'V': 260,
    'UNH': 510,
    'JNJ': 160,
    'WMT': 165,
    'XOM': 110,
    'MA': 430,
    'PG': 155,
    'HD': 340,
    'CVX': 155,
    'ABBV': 170,
    'MRK': 115,
  };

  // Return known price or calculate from symbol
  if (priceMap[symbol]) {
    return priceMap[symbol];
  }

  // Calculate price from symbol hash
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 50 + (symbolHash % 200);
};

export const generateEnhancedChartData = (symbol, timeRange) => {
  const basePrice = getRealisticPriceForSymbol(symbol);

  // Determine number of data points
  const pointsMap = {
    '1D': 78,
    '1W': 5,
    '1M': 21,
    '3M': 63,
    '1Y': 252,
    'ALL': 1260,
  };

  const points = pointsMap[timeRange] || 30;
  const now = Date.now();

  const intervalMap = {
    '1D': 300000,
    '1W': 86400000,
    '1M': 86400000,
    '3M': 86400000,
    '1Y': 86400000,
    'ALL': 86400000,
  };

  const interval = intervalMap[timeRange] || 86400000;

  const data = [];
  let price = basePrice;

  for (let i = 0; i < points; i++) {
    // Add overall trend
    const trendPercent = timeRange === '1D' ? 0.005 :
                        timeRange === '1W' ? 0.02 :
                        timeRange === '1M' ? 0.05 :
                        timeRange === '3M' ? 0.08 :
                        timeRange === '1Y' ? 0.15 : 0.50;

    const trend = (i / points) * (basePrice * trendPercent);

    // Add realistic random walk
    const volatilityPercent = timeRange === '1D' ? 0.005 : 0.015;
    const volatility = basePrice * volatilityPercent;
    const randomMove = (Math.random() - 0.48) * volatility; // Slight upward bias

    price = price + randomMove;
    price = Math.max(price, basePrice * 0.7); // Don't drop below 70%
    price = Math.min(price, basePrice * 1.5); // Don't go above 150%

    const finalPrice = basePrice + trend + (price - basePrice);

    // Create OHLC
    const dailyRange = finalPrice * 0.01; // 1% daily range
    const open = finalPrice + (Math.random() - 0.5) * dailyRange;
    const close = finalPrice + (Math.random() - 0.5) * dailyRange;
    const high = Math.max(open, close) + Math.random() * dailyRange * 0.5;
    const low = Math.min(open, close) - Math.random() * dailyRange * 0.5;

    data.push({
      timestamp: now - (points - i) * interval,
      value: Number(close.toFixed(2)),
      open: Number(Math.max(0, open).toFixed(2)),
      high: Number(Math.max(0, high).toFixed(2)),
      low: Number(Math.max(0, low).toFixed(2)),
      close: Number(Math.max(0, close).toFixed(2)),
    });
  }

  return data;
};
