const PERPLEXITY_API_KEY = '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';
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
    console.log('[PerplexityAPI] executeSearch called', { query: payload.query });
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('[PerplexityAPI] executeSearch response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Perplexity Search API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data?.error || 'Unknown error',
      });
      return null;
    }

    const results = data?.results || [];
    console.log('[PerplexityAPI] executeSearch results:', results.length);
    return results;
  } catch (error) {
    console.error('Error executing Perplexity search:', error, error.message);
    return null;
  }
};

const executeCompletion = async ({ messages, maxTokens = 1200, temperature = 0.3 }) => {
  try {
    console.log('[PerplexityAPI] executeCompletion called');
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

    console.log('[PerplexityAPI] executeCompletion response status:', response.status);
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

    console.log('[PerplexityAPI] executeCompletion content length:', content?.length || 0);
    return {
      content: typeof content === 'string' ? content.trim() : null,
      citations: citations,
    };
  } catch (error) {
    console.error('Error executing Perplexity completion:', error, error.message);
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

  // Use Chat Completions API directly for consistent, formatted results
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

  const headlines = mapSummaryTextToHeadlines(completionResponse.content);
  setCachedData(cacheKey, headlines);
  return headlines;
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
  if (cached) {
    console.log(`[PerplexityAPI] Returning cached analysis for ${symbol}`);
    return cached;
  }

  console.log(`[PerplexityAPI] Fetching analysis for ${symbol} (${companyName})`);

  // Use completion API directly for better cross-platform compatibility
  const completionResponse = await executeCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are a market analyst providing concise, actionable stock insights. Format your response as 3-5 distinct insights, each as a separate paragraph.',
      },
      {
        role: 'user',
        content: `Provide 3-5 key insights about ${companyName || symbol} stock. Include recent price action, analyst sentiment, upcoming catalysts, technical outlook, and any notable risks. Each insight should be a concise paragraph (2-3 sentences).`,
      },
    ],
    maxTokens: 800,
  });

  if (!completionResponse || !completionResponse.content) {
    console.log(`[PerplexityAPI] Completion failed for ${symbol}, returning empty array`);
    return [];
  }

  const insights = mapInsightTextToItems(completionResponse.content, symbol, companyName);
  console.log(`[PerplexityAPI] Analysis success for ${symbol}: ${insights.length} insights`);

  // Return empty array instead of null if no insights generated
  const result = insights.length > 0 ? insights : [];
  setCachedData(cacheKey, result);
  return result;
};
