const PERPLEXITY_API_KEY =
  process.env.PERPLEXITY_API_KEY || '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';
const BASE_URL = 'https://api.perplexity.ai/search';
const COMPLETIONS_URL = 'https://api.perplexity.ai/chat/completions';

// Cache for Perplexity responses
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

const executeCompletion = async ({ messages, maxTokens = 1200, temperature = 0.3 }) => {
  try {
    const response = await fetch(COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Perplexity Chat API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data?.error || 'Unknown error',
      });
      return null;
    }

    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : null;
  } catch (error) {
    console.error('Error executing Perplexity completion:', error);
    return null;
  }
};

const mapSummaryTextToHeadlines = (summaryText) => {
  if (!summaryText) return null;

  const lines = summaryText.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return [
      {
        title: 'AI Market Overview',
        snippet: summaryText,
        date: new Date().toISOString(),
      },
    ];
  }

  const headlines = [];
  let currentTitle = null;
  let currentSnippet = [];

  lines.forEach((line) => {
    const titleMatch = line.match(/^\d+\.\s*(.+)/);
    if (titleMatch) {
      if (currentTitle) {
        headlines.push({
          title: currentTitle,
          snippet: currentSnippet.join(' '),
          date: new Date().toISOString(),
        });
      }
      currentTitle = titleMatch[1];
      currentSnippet = [];
    } else if (line.startsWith('-')) {
      currentSnippet.push(line.replace(/^-\s*/, ''));
    } else if (currentTitle) {
      currentSnippet.push(line);
    }
  });

  if (currentTitle) {
    headlines.push({
      title: currentTitle,
      snippet: currentSnippet.join(' '),
      date: new Date().toISOString(),
    });
  }

  if (!headlines.length) {
    return [
      {
        title: 'AI Market Overview',
        snippet: summaryText,
        date: new Date().toISOString(),
      },
    ];
  }

  return headlines.slice(0, 6);
};

const mapInsightTextToItems = (text, symbol, companyName) => {
  if (!text) return [];
  const sections = text.split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean);

  return sections.slice(0, 5).map((chunk, idx) => ({
    title: `${companyName || symbol} Insight ${idx + 1}`,
    snippet: chunk,
    url: null,
    date: new Date().toISOString(),
  }));
};

const dedupeResults = (items = []) => {
  const unique = [];
  const seen = new Set();

  items.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const key = item.url || `${item.title || 'untitled'}-${item.date || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });

  return unique;
};

export const getDailyMarketSummary = async () => {
  const todayIso = new Date().toISOString().split('T')[0];
  const cacheKey = `daily_summary_${todayIso}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const queries = [
    `pre-market stock market news and futures overview for ${todayIso}`,
    `major economic events impacting markets on ${todayIso}`,
    `key earnings announcements for ${todayIso}`,
  ];

  const results = await executeSearch({
    query: queries,
    max_results: 5,
    max_tokens_per_page: 1024,
    country: 'US',
  });

  if (!results) {
    const completionText = await executeCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a financial analyst providing concise market summaries. Use numbered sections with short explanations.',
        },
        {
          role: 'user',
          content: `Provide a pre-market US market summary for ${todayIso}. Include: 1) overall market sentiment, 2) major economic events, 3) notable earnings, 4) sector highlights, 5) headline risks. Keep it concise.`,
        },
      ],
      maxTokens: 900,
    });

    if (!completionText) {
      return null;
    }

    const fallbackHeadlines = mapSummaryTextToHeadlines(completionText);
    setCachedData(cacheKey, fallbackHeadlines);
    return fallbackHeadlines;
  }

  const flattened = Array.isArray(results[0]) ? results.flat() : results;
  const uniqueResults = dedupeResults(flattened);

  setCachedData(cacheKey, uniqueResults);
  return uniqueResults;
};

export const getStockAnalysis = async (symbol, companyName) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const cacheKey = `stock_analysis_${symbol}_${todayIso}`;
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
    const completionText = await executeCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a market analyst summarizing actionable stock insights using short paragraphs.',
        },
        {
          role: 'user',
          content: `Provide the five most important updates for ${companyName || symbol}. Cover recent news, analyst commentary, technical signals, institutional activity, and any risks. Use short paragraphs.`,
        },
      ],
      maxTokens: 800,
    });

    if (!completionText) {
      return null;
    }

    const fallbackInsights = mapInsightTextToItems(completionText, symbol, companyName);
    setCachedData(cacheKey, fallbackInsights);
    return fallbackInsights;
  }

  const uniqueResults = dedupeResults(results);
  setCachedData(cacheKey, uniqueResults);
  return uniqueResults;
};
