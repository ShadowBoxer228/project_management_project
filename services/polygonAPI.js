const POLYGON_API_KEY = 'CC6_g1v7dJp1tgDkOzkYMX36p4vH6YYX';
const POLYGON_BASE_URL = 'https://api.polygon.io';

/**
 * Calculate date range based on timeRange parameter
 * @param {string} timeRange - One of: '1D', '1W', '1M', '3M', '1Y', 'ALL'
 * @returns {object} Object with from, to dates and bar configuration
 */
function getDateRangeForTimeRange(timeRange) {
  const now = new Date();
  const to = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  let from;
  let multiplier = 1;
  let timespan = 'day';

  switch (timeRange) {
    case '1D':
      // Last trading day with 5-minute bars
      from = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 5;
      timespan = 'minute';
      break;
    case '1W':
      // Last week with 1-hour bars
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'hour';
      break;
    case '1M':
      // Last month with daily bars
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'day';
      break;
    case '3M':
      // Last 3 months with daily bars
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'day';
      break;
    case '1Y':
      // Last year with daily bars
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'day';
      break;
    case 'ALL':
      // Last 5 years with weekly bars for performance
      from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'week';
      break;
    default:
      // Default to 1 month
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      multiplier = 1;
      timespan = 'day';
  }

  return { from, to, multiplier, timespan };
}

/**
 * Transform polygon.io response data to app's expected format
 * @param {Array} results - Array of OHLC bars from polygon.io
 * @returns {Array} Transformed data array
 */
function transformPolygonData(results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return [];
  }

  return results.map((bar) => ({
    timestamp: bar.t, // Unix millisecond timestamp
    value: bar.c, // Closing price (used for line charts)
    open: bar.o, // Opening price
    high: bar.h, // High price
    low: bar.l, // Low price
    close: bar.c, // Closing price
    volume: bar.v, // Volume (optional, for future use)
  }));
}

/**
 * Fetch aggregated OHLC data from polygon.io
 * @param {string} symbol - Stock ticker symbol (e.g., 'AAPL')
 * @param {string} timeRange - Time range ('1D', '1W', '1M', '3M', '1Y', 'ALL')
 * @returns {Promise<Array>} Array of chart data points
 */
export async function getAggregates(symbol, timeRange = '1M') {
  try {
    const { from, to, multiplier, timespan } = getDateRangeForTimeRange(timeRange);

    // Construct the API URL
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;

    console.log(`[PolygonAPI] Fetching ${timeRange} data for ${symbol}`);
    console.log(`[PolygonAPI] URL: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Polygon.io API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.status === 'ERROR') {
      throw new Error(`Polygon.io API error: ${data.error || 'Unknown error'}`);
    }

    // Check if we have results
    if (!data.results || data.results.length === 0) {
      console.warn(`[PolygonAPI] No data returned for ${symbol} (${timeRange})`);
      return [];
    }

    console.log(`[PolygonAPI] Retrieved ${data.results.length} data points`);

    // Transform and return the data
    return transformPolygonData(data.results);
  } catch (error) {
    console.error('[PolygonAPI] Error fetching aggregates:', error);
    throw error;
  }
}

/**
 * Get the previous day's OHLC data for a stock
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Previous day's OHLC data
 */
export async function getPreviousClose(symbol) {
  try {
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;

    console.log(`[PolygonAPI] Fetching previous close for ${symbol}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Polygon.io API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'ERROR' || !data.results || data.results.length === 0) {
      throw new Error('No previous close data available');
    }

    const result = data.results[0];

    return {
      timestamp: result.t,
      open: result.o,
      high: result.h,
      low: result.l,
      close: result.c,
      volume: result.v,
    };
  } catch (error) {
    console.error('[PolygonAPI] Error fetching previous close:', error);
    throw error;
  }
}

/**
 * Get current snapshot quote for a stock
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Current snapshot data
 */
export async function getSnapshot(symbol) {
  try {
    const url = `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${POLYGON_API_KEY}`;

    console.log(`[PolygonAPI] Fetching snapshot for ${symbol}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Polygon.io API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'ERROR' || !data.ticker) {
      throw new Error('No snapshot data available');
    }

    const ticker = data.ticker;

    return {
      symbol: ticker.ticker,
      lastPrice: ticker.lastTrade?.p || ticker.day?.c,
      change: ticker.todaysChange || 0,
      changePercent: ticker.todaysChangePerc || 0,
      open: ticker.day?.o,
      high: ticker.day?.h,
      low: ticker.day?.l,
      close: ticker.prevDay?.c,
      volume: ticker.day?.v,
      timestamp: ticker.lastTrade?.t || ticker.updated,
    };
  } catch (error) {
    console.error('[PolygonAPI] Error fetching snapshot:', error);
    throw error;
  }
}

/**
 * Get bulk snapshot quotes for multiple stocks using grouped daily endpoint (free tier compatible)
 * @param {Array<string>} symbols - Array of stock ticker symbols (e.g., ['AAPL', 'MSFT', 'GOOGL'])
 * @returns {Promise<Object>} Object mapping symbols to quote data (Finnhub-compatible format)
 */
export async function getBulkSnapshots(symbols) {
  try {
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Symbols array is required');
    }

    // Use the grouped daily endpoint which is available on free tier
    // This returns previous day's OHLC for all stocks
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Format date as YYYY-MM-DD
    const dateStr = yesterday.toISOString().split('T')[0];

    const url = `${POLYGON_BASE_URL}/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&apiKey=${POLYGON_API_KEY}`;

    console.log(`[PolygonAPI] Fetching grouped daily data for ${symbols.length} symbols`);

    const response = await fetch(url);

    if (!response.ok) {
      // If grouped daily fails, fall back to individual requests (with rate limiting)
      console.warn(`[PolygonAPI] Grouped daily returned ${response.status}, using fallback method`);
      return await getBulkSnapshotsFallback(symbols);
    }

    const data = await response.json();

    if (data.status === 'ERROR') {
      console.warn('[PolygonAPI] Grouped daily error, using fallback method');
      return await getBulkSnapshotsFallback(symbols);
    }

    if (!data.results || data.results.length === 0) {
      console.warn('[PolygonAPI] No results in grouped daily, using fallback method');
      return await getBulkSnapshotsFallback(symbols);
    }

    console.log(`[PolygonAPI] Retrieved ${data.results.length} grouped daily results`);

    // Create a map for quick lookup
    const symbolsSet = new Set(symbols);
    const quotesMap = {};

    // Transform results to Finnhub-compatible format
    data.results.forEach((bar) => {
      const symbol = bar.T; // Ticker symbol

      // Only include symbols we requested
      if (!symbolsSet.has(symbol)) return;

      const currentPrice = bar.c; // Close price
      const open = bar.o; // Open price
      const change = currentPrice - open; // Approximate change (close - open)
      const changePercent = open !== 0 ? (change / open) * 100 : 0;

      quotesMap[symbol] = {
        c: currentPrice,           // current price (close)
        d: change,                 // change (close - open)
        dp: changePercent,         // change percent
        v: bar.v || 0,             // volume
        h: bar.h,                  // high
        l: bar.l,                  // low
        o: bar.o,                  // open
        t: bar.t,                  // timestamp
      };
    });

    console.log(`[PolygonAPI] Processed ${Object.keys(quotesMap).length} quotes from grouped daily`);
    return quotesMap;
  } catch (error) {
    console.error('[PolygonAPI] Error fetching bulk snapshots:', error);
    // Try fallback method
    return await getBulkSnapshotsFallback(symbols);
  }
}

/**
 * Fallback method: Fetch previous close for requested symbols only
 * Uses batching to stay within rate limits
 */
async function getBulkSnapshotsFallback(symbols) {
  console.log(`[PolygonAPI] Using fallback: fetching previous close for ${symbols.length} symbols`);

  const quotesMap = {};

  // Batch process to avoid rate limits (max 5 concurrent requests)
  const batchSize = 5;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (symbol) => {
        try {
          const prevClose = await getPreviousClose(symbol);
          return { symbol, data: prevClose };
        } catch (error) {
          console.warn(`[PolygonAPI] Failed to fetch ${symbol}:`, error.message);
          return { symbol, data: null };
        }
      })
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.data) {
        const { symbol, data } = result.value;
        const change = data.close - data.open;
        const changePercent = data.open !== 0 ? (change / data.open) * 100 : 0;

        quotesMap[symbol] = {
          c: data.close,
          d: change,
          dp: changePercent,
          v: data.volume || 0,
          h: data.high,
          l: data.low,
          o: data.open,
          t: data.timestamp,
        };
      }
    });

    // Small delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[PolygonAPI] Fallback completed: ${Object.keys(quotesMap).length} quotes fetched`);
  return quotesMap;
}
