const MARKETAUX_API_KEY = 'PbUA2StPaFvBtpXBL3REgxfMVVozwaPkV9iv07r7';
const BASE_URL = 'https://api.marketaux.com/v1';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 600000; // 10 minutes for news

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

export const getStockNews = async (symbols, limit = 10) => {
  const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : symbols;
  const cacheKey = `stock_news_${symbolsStr}_${limit}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/news/all?symbols=${symbolsStr}&limit=${limit}&api_token=${MARKETAUX_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching stock news:', error);
    return { data: [] };
  }
};

export const getMarketNews = async (limit = 20) => {
  const cacheKey = `market_news_${limit}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/news/all?filter_entities=true&limit=${limit}&api_token=${MARKETAUX_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching market news:', error);
    return { data: [] };
  }
};

export const getNewsByKeyword = async (keywords, limit = 10) => {
  const cacheKey = `keyword_news_${keywords}_${limit}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${BASE_URL}/news/all?search=${encodeURIComponent(keywords)}&limit=${limit}&api_token=${MARKETAUX_API_KEY}`
    );
    const data = await response.json();
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching news by keyword:', error);
    return { data: [] };
  }
};
