const ALPHA_VANTAGE_API_KEY = 'TRMIRT3FUXJ03QAJ';
const BASE_URL = 'https://www.alphavantage.co/query';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 300000; // 5 minutes for historical data

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const getIntradayData = async (symbol, interval = '5min') => {
  const cacheKey = `intraday_${symbol}_${interval}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching intraday data:', error);
    return null;
  }
};

export const getDailyData = async (symbol) => {
  const cacheKey = `daily_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching daily data:', error);
    return null;
  }
};

export const getWeeklyData = async (symbol) => {
  const cacheKey = `weekly_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=TIME_SERIES_WEEKLY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching weekly data:', error);
    return null;
  }
};

export const getMonthlyData = async (symbol) => {
  const cacheKey = `monthly_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=TIME_SERIES_MONTHLY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    return null;
  }
};

export const getCompanyOverview = async (symbol) => {
  const cacheKey = `overview_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching company overview:', error);
    return null;
  }
};

export const getSMA = async (symbol, interval = 'daily', timePeriod = 20) => {
  const cacheKey = `sma_${symbol}_${interval}_${timePeriod}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=SMA&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching SMA:', error);
    return null;
  }
};

export const getRSI = async (symbol, interval = 'daily', timePeriod = 14) => {
  const cacheKey = `rsi_${symbol}_${interval}_${timePeriod}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=RSI&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching RSI:', error);
    return null;
  }
};

export const getNewsAndSentiment = async (tickers) => {
  const cacheKey = `news_sentiment_${tickers}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}?function=NEWS_SENTIMENT&tickers=${tickers}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching news and sentiment:', error);
    return null;
  }
};
