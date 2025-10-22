const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const BASE_URL = 'https://api.perplexity.ai/search';

// Cache for daily summary (24 hour cache)
const cache = new Map();
const CACHE_DURATION = 86400000; // 24 hours

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

const executeSearch = async (payload) => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Perplexity Search API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data?.error || 'Unknown error',
      });
      return null;
    }

    return data?.results || [];
  } catch (error) {
    console.error('Error executing Perplexity search:', error);
    return null;
  }
};

export const getDailyMarketSummary = async () => {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `daily_summary_${today}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const queries = [
    `pre-market stock market news and futures overview for ${today}`,
    `major economic events impacting markets on ${today}`,
    `key earnings announcements for ${today}`,
  ];

  const results = await executeSearch({
    query: queries,
    max_results: 5,
    max_tokens_per_page: 1024,
    country: 'US',
  });

  if (!results) {
    return null;
  }

  const flattenedResults = Array.isArray(results[0])
    ? results.flat()
    : results;

  setCachedData(cacheKey, flattenedResults);
  return flattenedResults;
};

export const getStockAnalysis = async (symbol, companyName) => {
  const cacheKey = `stock_analysis_${symbol}_${new Date().toISOString().split('T')[0]}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const query = `${companyName || symbol} stock latest news, analyst commentary, technical outlook`;

  const results = await executeSearch({
    query,
    max_results: 5,
    max_tokens_per_page: 1024,
    search_domain_filter: [
      'finance.yahoo.com',
      'seekingalpha.com',
      'marketwatch.com',
      'bloomberg.com',
      'cnbc.com',
    ],
  });

  if (!results) {
    return null;
  }

  setCachedData(cacheKey, results);
  return results;
};
