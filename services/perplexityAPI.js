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
    const citations = data?.citations || [];

    return {
      content: typeof content === 'string' ? content.trim() : null,
      citations: citations,
    };
  } catch (error) {
    console.error('Error executing Perplexity completion:', error);
    return null;
  }
};

const mapSummaryTextToHeadlines = (summaryText) => {
  if (!summaryText) return null;

  // Clean up the text - remove markdown, citations numbers like [1], [2], etc.
  const cleanText = summaryText
    .replace(/\*\*/g, '')
    .replace(/\[[\d,\s]+\]/g, '')
    .trim();

  const lines = cleanText.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;

  const headlines = [];

  // Process each line as a bullet point
  lines.forEach((line) => {
    // Skip header lines and intro text
    if (
      line.match(/^(market headlines|bullet points?|key points?|summary)[:]*$/i) ||
      line.match(/^(here are|here is|below are|following are)/i) ||
      line.length < 30
    ) {
      return;
    }

    // Match numbered or bulleted items
    const bulletMatch = line.match(/^[•\-*]\s*(.+)/);
    const numberedMatch = line.match(/^\d+[.)]\s*(.+)/);

    let content = bulletMatch ? bulletMatch[1] : numberedMatch ? numberedMatch[1] : line;
    content = content.trim();

    // Split into title and snippet if there's a colon or dash
    const splitMatch = content.match(/^([^:—-]+)[:\—\-]\s*(.+)$/);

    if (splitMatch && splitMatch[1].length < 80) {
      headlines.push({
        title: splitMatch[1].trim(),
        snippet: splitMatch[2].trim(),
        date: new Date().toISOString(),
        url: null,
      });
    } else {
      // No clear split - take first 1-2 sentences
      const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 15);
      if (sentences.length >= 2) {
        headlines.push({
          title: sentences[0].trim() + '.',
          snippet: sentences[1].trim() + '.',
          date: new Date().toISOString(),
          url: null,
        });
      } else if (content.length > 50) {
        // Single long sentence - use first part as title
        const words = content.split(' ');
        const midPoint = Math.min(10, Math.floor(words.length / 2));
        headlines.push({
          title: words.slice(0, midPoint).join(' ') + '...',
          snippet: words.slice(midPoint).join(' '),
          date: new Date().toISOString(),
          url: null,
        });
      }
    }
  });

  return headlines.length > 0 ? headlines.slice(0, 7) : null;
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
    const completionResponse = await executeCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a financial analyst providing concise market updates.',
        },
        {
          role: 'user',
          content: `Provide 5-7 concise bullet points about US pre-market conditions for ${todayIso}.

Each bullet point should be 1-2 sentences covering:
- Market sentiment and index movements
- Key economic events and data releases today
- Notable earnings reports
- Sector performance highlights
- Significant company news or events

Format as bullet points with a colon separating topic from details (e.g., "Market Sentiment: Indices are up 0.5% in pre-market trading.")`,
        },
      ],
      maxTokens: 600,
    });

    if (!completionResponse || !completionResponse.content) {
      return null;
    }

    const fallbackHeadlines = mapSummaryTextToHeadlines(completionResponse.content);
    setCachedData(cacheKey, fallbackHeadlines);
    return fallbackHeadlines;
  }

  const flattened = Array.isArray(results[0]) ? results.flat() : results;
  const uniqueResults = dedupeResults(flattened);

  setCachedData(cacheKey, uniqueResults);
  return uniqueResults;
};

export const getMarketAdvice = async () => {
  const todayIso = new Date().toISOString().split('T')[0];
  const cacheKey = `market_advice_${todayIso}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const completionResponse = await executeCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are a senior market strategist providing actionable trading advice.',
      },
      {
        role: 'user',
        content: `Based on current US market conditions for ${todayIso}, provide 3-4 sentences of actionable advice for traders and investors.

Address:
- What to expect in today's market
- Which sectors or opportunities to watch
- Key risks to be aware of
- Recommended trading approach (cautious, aggressive, selective, etc.)

Be specific and practical.`,
      },
    ],
    maxTokens: 300,
  });

  if (!completionResponse || !completionResponse.content) {
    return null;
  }

  const advice = completionResponse.content
    .replace(/\*\*/g, '')
    .replace(/\[[\d,\s]+\]/g, '')
    .trim();

  setCachedData(cacheKey, advice);
  return advice;
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
    const completionResponse = await executeCompletion({
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

    if (!completionResponse || !completionResponse.content) {
      return null;
    }

    const fallbackInsights = mapInsightTextToItems(completionResponse.content, symbol, companyName);
    setCachedData(cacheKey, fallbackInsights);
    return fallbackInsights;
  }

  const uniqueResults = dedupeResults(results);
  setCachedData(cacheKey, uniqueResults);
  return uniqueResults;
};
