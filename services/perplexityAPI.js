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

const mapSummaryTextToHeadlines = (summaryText, citations = []) => {
  if (!summaryText) return null;

  // Clean up the text - remove markdown, citations numbers like [1], [2], etc.
  const cleanText = summaryText
    .replace(/\*\*/g, '')
    .replace(/\[[\d,\s]+\]/g, '')
    .trim();

  const lines = cleanText.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;

  const headlines = [];
  let summarySection = '';
  let adviceSection = '';
  let currentSection = 'summary';

  // Split content into summary and advice sections
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    // Detect advice/outlook section - check for headers or last paragraph
    if (
      lowerLine.startsWith('market outlook') ||
      lowerLine.startsWith('key takeaway') ||
      lowerLine.startsWith('in summary') ||
      lowerLine.startsWith('advice') ||
      lowerLine.startsWith('recommendation') ||
      (index === lines.length - 1 && line.length > 50) // Last substantial line is likely outlook
    ) {
      currentSection = 'advice';
    }

    if (currentSection === 'summary') {
      summarySection += line + ' ';
    } else if (currentSection === 'advice') {
      // Skip header lines like "Market Outlook:" or "**Market Outlook:**"
      if (!lowerLine.match(/^(market outlook|key takeaway|in summary|advice|recommendation)[:]*$/)) {
        adviceSection += line + ' ';
      }
    }
  });

  // Create main summary headline with 1-2 sentence highlight
  const sentences = summarySection.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const highlightText = sentences.slice(0, 2).join('.').trim() + (sentences.length > 0 ? '.' : '');

  if (highlightText) {
    headlines.push({
      title: 'Market Summary',
      snippet: highlightText,
      date: new Date().toISOString(),
      url: citations[0]?.url || null,
      source: citations[0] ? 'View Sources' : null,
      isAiGenerated: true,
    });
  }

  // Add advice section if available
  if (adviceSection.trim()) {
    const adviceSentences = adviceSection.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    const adviceText = adviceSentences.slice(0, 2).join('.').trim() + (adviceSentences.length > 0 ? '.' : '');

    if (adviceText) {
      headlines.push({
        title: "Today's Market Outlook",
        snippet: adviceText,
        date: new Date().toISOString(),
        url: null,
        source: null,
        isAdvice: true,
        isAiGenerated: true,
      });
    }
  }

  return headlines.length > 0 ? headlines : null;
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
            'You are a financial analyst providing concise, actionable market summaries.',
        },
        {
          role: 'user',
          content: `Provide a comprehensive pre-market summary for US markets on ${todayIso}.

Write 2-3 paragraphs covering:
- Current market sentiment and major index movements
- Key economic events and data releases
- Notable earnings reports and company news
- Sector performance and trends
- Major risks and opportunities

Then end with a section titled "Market Outlook" or "Key Takeaways" that provides 1-2 sentences of actionable advice for traders and investors today.`,
        },
      ],
      maxTokens: 800,
    });

    if (!completionResponse || !completionResponse.content) {
      return null;
    }

    const fallbackHeadlines = mapSummaryTextToHeadlines(
      completionResponse.content,
      completionResponse.citations
    );
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
