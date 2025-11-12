const FINNHUB_API_KEY = 'd3scib9r01qs1aps7j90d3scib9r01qs1aps7j9g';
const BASE_URL = 'https://finnhub.io/api/v1';

// Cache for API responses to minimize API calls
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute

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

export const getQuote = async (symbol) => {
  const cacheKey = `quote_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) {
      console.error('Finnhub quote request failed:', response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    if (data?.error) {
      console.error('Finnhub quote API error for symbol:', symbol, data.error);
      return null;
    }
    if (!data || typeof data.c !== 'number') {
      console.error('Finnhub quote payload invalid for symbol:', symbol, data);
      return null;
    }
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching quote:', error);
    return null;
  }
};

export const getCompanyProfile = async (symbol) => {
  const cacheKey = `profile_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) {
      console.error('Finnhub company profile request failed:', response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    if (data?.error) {
      console.error('Finnhub profile API error for symbol:', symbol, data.error);
      return null;
    }
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return null;
  }
};

export const getCompanyNews = async (symbol, from, to) => {
  const cacheKey = `news_${symbol}_${from}_${to}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) {
      console.error('Finnhub company news request failed:', response.status, response.statusText);
      return [];
    }
    const data = await response.json();
    if (data?.error) {
      console.error('Finnhub company news API error:', data.error);
      return [];
    }
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching company news:', error);
    return [];
  }
};

export const getMarketNews = async () => {
  const cacheKey = 'market_news';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) {
      console.error('Finnhub market news request failed:', response.status, response.statusText);
      return [];
    }
    const data = await response.json();
    if (data?.error) {
      console.error('Finnhub market news API error:', data.error);
      return [];
    }
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching market news:', error);
    return [];
  }
};

export const getEconomicCalendar = async () => {
  const cacheKey = 'economic_calendar';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const from = today.toISOString().split('T')[0];
    const to = tomorrow.toISOString().split('T')[0];

    const response = await fetch(
      `${BASE_URL}/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) {
      console.error('Finnhub economic calendar request failed:', response.status, response.statusText);
      return { economicCalendar: [] };
    }
    const data = await response.json();
    if (data?.error) {
      console.error('Finnhub economic calendar API error:', data.error);
      return { economicCalendar: [] };
    }
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching economic calendar:', error);
    return { economicCalendar: [] };
  }
};

export const getEarningsCalendar = async () => {
  const cacheKey = 'earnings_calendar';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const to = from;

    const response = await fetch(
      `${BASE_URL}/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) {
      console.error('Finnhub earnings calendar request failed:', response.status, response.statusText);
      return { earningsCalendar: [] };
    }
    const data = await response.json();
    if (data?.error) {
      console.error('Finnhub earnings calendar API error:', data.error);
      return { earningsCalendar: [] };
    }
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    return { earningsCalendar: [] };
  }
};

export const getBasicFinancials = async (symbol) => {
  const cacheKey = `financials_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) {
      console.error('Finnhub basic financials request failed:', response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    if (data?.error) {
      console.error('Finnhub financials API error for symbol:', symbol, data.error);
      return null;
    }
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching basic financials:', error);
    return null;
  }
};
