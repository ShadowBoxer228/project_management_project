const PERPLEXITY_API_KEY = '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';
const BASE_URL = 'https://api.perplexity.ai/chat/completions';

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

export const getDailyMarketSummary = async () => {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `daily_summary_${today}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst providing concise, professional market analysis. Focus on facts and actionable insights without emojis or unnecessary formatting.',
          },
          {
            role: 'user',
            content: `Provide a comprehensive pre-market analysis for ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}. Include:

1. Overall Market Sentiment: Brief analysis of current market mood
2. Major Economic Events Today: Any FOMC meetings, CPI reports, GDP data, or other significant economic releases
3. Key Earnings Announcements: Major companies reporting today
4. Geopolitical Developments: Any significant global events affecting markets
5. Sector Highlights: Which sectors are expected to move and why
6. Corporate News: Major mergers, acquisitions, or corporate developments
7. Technical Market Analysis: Key support/resistance levels for major indices
8. Final Trading Strategy: Actionable advice for today's trading session

Format the response with clear bullet points. Be concise and professional.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const summary = data.choices[0].message.content;
      setCachedData(cacheKey, summary);
      return summary;
    }

    return null;
  } catch (error) {
    console.error('Error fetching daily market summary:', error);
    return null;
  }
};

export const getStockAnalysis = async (symbol, companyName) => {
  const cacheKey = `stock_analysis_${symbol}_${new Date().toISOString().split('T')[0]}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst providing concise stock analysis. Focus on recent developments and actionable insights.',
          },
          {
            role: 'user',
            content: `Provide a brief analysis of ${companyName} (${symbol}) stock. Include:
1. Recent significant news or developments (last 24-48 hours)
2. Current market sentiment
3. Key technical levels
4. Brief recommendation (bullish/bearish/neutral) with rationale

Keep it concise and professional with bullet points.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const analysis = data.choices[0].message.content;
      setCachedData(cacheKey, analysis);
      return analysis;
    }

    return null;
  } catch (error) {
    console.error('Error fetching stock analysis:', error);
    return null;
  }
};
