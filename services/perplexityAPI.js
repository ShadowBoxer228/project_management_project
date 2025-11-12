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

  return sections.slice(0, 5).map((chunk, idx) => {
    // Generate meaningful title from content
    let title = '';
    
    // Try to extract a title from the first sentence or key phrases
    const firstSentence = chunk.split(/[.!?]/)[0].trim();
    
    // Common patterns to extract meaningful titles
    if (firstSentence.match(/recent.*price|price.*action|trading|stock.*movement/i)) {
      title = 'Price Action';
    } else if (firstSentence.match(/analyst|rating|upgrade|downgrade|consensus/i)) {
      title = 'Analyst Sentiment';
    } else if (firstSentence.match(/catalyst|upcoming|event|earnings|launch/i)) {
      title = 'Upcoming Catalysts';
    } else if (firstSentence.match(/technical|support|resistance|trend|momentum/i)) {
      title = 'Technical Outlook';
    } else if (firstSentence.match(/risk|concern|challenge|headwind|warning/i)) {
      title = 'Risk Factors';
    } else if (firstSentence.match(/revenue|growth|earnings|profit|performance/i)) {
      title = 'Financial Performance';
    } else if (firstSentence.match(/market.*share|competition|competitor/i)) {
      title = 'Market Position';
    } else if (firstSentence.match(/valuation|expensive|cheap|overvalued|undervalued/i)) {
      title = 'Valuation Analysis';
    } else {
      // Fallback: extract first 2-3 meaningful words
      const words = firstSentence
        .replace(/^(The|A|An|This|That|These|Those)\s+/i, '')
        .split(/\s+/)
        .filter(w => w.length > 3);
      title = words.slice(0, 3).join(' ');
      // Capitalize first letter of each word
      title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      // Limit length
      if (title.length > 25) {
        title = words.slice(0, 2).join(' ');
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }

    return {
      title: title || `Insight ${idx + 1}`,
      snippet: chunk,
      url: null,
      date: new Date().toISOString(),
    };
  });
};

const mapPortfolioInsightsToItems = (text) => {
  if (!text) return [];

  // Clean up the text - remove markdown, citations
  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/\[[\d,\s]+\]/g, '')
    .trim();

  // Try to split by numbered sections (1., 2., 3., etc.)
  const numberedSections = cleanText.split(/\n(?=\d+\.)/);

  if (numberedSections.length > 1) {
    // Format with numbered sections
    return numberedSections
      .map(section => section.trim())
      .filter(section => section.length > 30)
      .map(section => {
        // Extract title and content from section (e.g., "1. Diversification Analysis: This portfolio...")
        // Match pattern: "1. Title: Content"
        const fullMatch = section.match(/^\d+\.\s*([^:]+):\s*(.+)$/s);
        if (fullMatch) {
          const title = fullMatch[1].trim();
          const snippet = fullMatch[2].trim();
          return {
            title,
            snippet,
            date: new Date().toISOString(),
            url: null,
          };
        }

        // Try alternate pattern without colon: "1. Title Content"
        const altMatch = section.match(/^\d+\.\s*(.+)$/s);
        if (altMatch) {
          const content = altMatch[1].trim();
          // Find first sentence break to separate title from content
          const sentences = content.split(/(?<=[.!?])\s+/);
          if (sentences.length >= 2) {
            return {
              title: sentences[0].replace(/[.!?]+$/, ''),
              snippet: sentences.slice(1).join(' '),
              date: new Date().toISOString(),
              url: null,
            };
          }
        }

        return null;
      })
      .filter(Boolean)
      .slice(0, 5);
  }

  // Fallback: split by paragraphs
  const paragraphs = cleanText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  if (paragraphs.length === 1) {
    // Single paragraph - split by sentences
    const sentences = cleanText.split(/\.\s+/).filter(s => s.trim().length > 20);
    const items = [];

    for (let i = 0; i < sentences.length; i += 2) {
      if (i < sentences.length) {
        const title = sentences[i].trim();
        const snippet = sentences[i + 1] ? sentences[i + 1].trim() + '.' : '';

        items.push({
          title: title.length > 80 ? title.substring(0, 77) + '...' : title,
          snippet: snippet || title + '.',
          date: new Date().toISOString(),
          url: null,
        });
      }
    }

    return items.slice(0, 5);
  }

  // Multiple paragraphs - each paragraph becomes an item
  return paragraphs.slice(0, 5).map((paragraph, idx) => {
    // Try to extract title from first part
    const colonMatch = paragraph.match(/^([^:]+):\s*(.+)$/s);
    if (colonMatch && colonMatch[1].length < 80) {
      return {
        title: colonMatch[1].trim(),
        snippet: colonMatch[2].trim(),
        date: new Date().toISOString(),
        url: null,
      };
    }

    const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 15);
    if (sentences.length >= 2) {
      return {
        title: sentences[0].trim(),
        snippet: sentences.slice(1).join('. ').trim() + '.',
        date: new Date().toISOString(),
        url: null,
      };
    } else if (paragraph.length > 50) {
      // Long single sentence - split it
      const words = paragraph.split(' ');
      const midPoint = Math.min(10, Math.floor(words.length / 2));
      return {
        title: words.slice(0, midPoint).join(' ') + '...',
        snippet: words.slice(midPoint).join(' '),
        date: new Date().toISOString(),
        url: null,
      };
    }

    return {
      title: `Portfolio Insight ${idx + 1}`,
      snippet: paragraph,
      date: new Date().toISOString(),
      url: null,
    };
  });
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
          'You are a professional financial analyst. You MUST ALWAYS provide structured market analysis in the requested format. Never explain limitations or lack of access to data - always provide your best analysis based on available information and recent market trends.',
      },
      {
        role: 'user',
        content: `Provide exactly 5-7 bullet points about current US market conditions and outlook for ${todayIso}.

You MUST format each bullet point as: "Topic Title: Details" where the topic is one of these categories:
- Market Sentiment
- Key Economic Events
- Notable Earnings Reports
- Sector Performance Highlights
- Significant Company News or Events

Example format:
- Market Sentiment: US pre-market trading shows cautious sentiment amid ongoing concerns about inflation.
- Key Economic Events: Today's key releases include the 4-week average of Jobless Claims with forecasts around 249K.

IMPORTANT: Do NOT explain data limitations. Always provide analysis based on recent market trends and scheduled events.`,
      },
    ],
    maxTokens: 600,
  });

  if (!completionResponse || !completionResponse.content) {
    return null;
  }

  // Check if response contains disclaimer language
  const content = completionResponse.content.toLowerCase();
  if (content.includes('don\'t have access') || 
      content.includes('cannot access') || 
      content.includes('unable to provide real-time')) {
    console.warn('[PerplexityAPI] AI returned disclaimer, retrying with stronger prompt');
    
    // Retry with even more explicit instructions
    const retryResponse = await executeCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a financial analyst. Provide market analysis in bullet point format. Do not mention data access limitations.',
        },
        {
          role: 'user',
          content: `Generate 5 market insights for ${todayIso} in this exact format:

Market Sentiment: [Brief analysis of expected market direction]
Key Economic Events: [Today's scheduled economic data releases]
Notable Earnings Reports: [Companies reporting earnings today or major news]
Sector Performance Highlights: [Expected sector movements]
Trading Recommendations: [General trading approach for today]

Provide analysis based on typical market patterns and scheduled events.`,
        },
      ],
      maxTokens: 600,
      temperature: 0.5,
    });

    if (retryResponse && retryResponse.content) {
      const headlines = mapSummaryTextToHeadlines(retryResponse.content);
      if (headlines && headlines.length > 0) {
        setCachedData(cacheKey, headlines);
        return headlines;
      }
    }
  }

  const headlines = mapSummaryTextToHeadlines(completionResponse.content);
  if (headlines && headlines.length > 0) {
    setCachedData(cacheKey, headlines);
    return headlines;
  }
  
  // Return null if parsing failed
  return null;
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
          'You are a senior market strategist providing actionable trading advice. Always provide analysis - never explain data limitations.',
      },
      {
        role: 'user',
        content: `Based on current US market conditions and trends for ${todayIso}, provide 3-4 sentences of actionable advice for traders and investors.

Address:
- What to expect in today's market
- Which sectors or opportunities to watch
- Key risks to be aware of
- Recommended trading approach (cautious, aggressive, selective, etc.)

Be specific and practical. Do not mention data access limitations.`,
      },
    ],
    maxTokens: 300,
  });

  if (!completionResponse || !completionResponse.content) {
    return null;
  }

  const content = completionResponse.content.toLowerCase();
  
  // Check for disclaimer language and return null to skip showing it
  if (content.includes('don\'t have access') || 
      content.includes('cannot access') || 
      content.includes('unable to provide real-time') ||
      content.includes('cannot provide')) {
    console.warn('[PerplexityAPI] Market advice contained disclaimer, skipping');
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

export const getPortfolioInsights = async (holdings, prices) => {
  if (!holdings || holdings.length === 0) {
    return [];
  }

  const todayIso = new Date().toISOString().split('T')[0];
  const symbols = holdings.map(h => h.symbol).sort().join(',');
  const cacheKey = `portfolio_insights_${symbols}_${todayIso}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log('[PerplexityAPI] Returning cached portfolio insights');
    return cached;
  }

  console.log(`[PerplexityAPI] Fetching portfolio insights for ${holdings.length} holdings`);

  // Build portfolio summary
  let totalValue = 0;
  let totalCost = 0;
  const holdingsSummary = holdings.map(holding => {
    const currentPrice = prices[holding.symbol] || holding.purchasePrice;
    const cost = holding.shares * holding.purchasePrice;
    const value = holding.shares * currentPrice;
    const gainLoss = value - cost;
    const gainLossPercent = (gainLoss / cost) * 100;

    totalCost += cost;
    totalValue += value;

    return `${holding.symbol}: ${holding.shares} shares, bought at $${holding.purchasePrice.toFixed(2)}, current $${currentPrice.toFixed(2)}, ${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`;
  }).join('\n');

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  const completionResponse = await executeCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are a professional financial advisor providing comprehensive portfolio analysis. Format your response with clear numbered sections (1., 2., 3., 4.) for each analysis point.',
      },
      {
        role: 'user',
        content: `Analyze this investment portfolio and provide insights:

Portfolio Overview:
Total Value: $${totalValue.toFixed(2)}
Total Cost Basis: $${totalCost.toFixed(2)}
Overall Return: ${totalGainLossPercent >= 0 ? '+' : ''}${totalGainLossPercent.toFixed(2)}%

Holdings:
${holdingsSummary}

Please provide exactly 4 numbered insights:
1. Diversification Analysis: Assess how well diversified this portfolio is. Are there concentration risks?
2. Risk Assessment: Evaluate the overall risk level. What are the key risks?
3. Market Outlook: Given current market conditions (${todayIso}), what's the outlook for these holdings?
4. Rebalancing Suggestions: Should the investor consider any adjustments? Any stocks to add or reduce?

Format each insight as:
1. [Title]: [2-3 sentences of analysis]`,
      },
    ],
    maxTokens: 800,
    temperature: 0.4,
  });

  if (!completionResponse || !completionResponse.content) {
    console.log('[PerplexityAPI] Portfolio insights failed, returning fallback');
    return [];
  }

  const insightsItems = mapPortfolioInsightsToItems(completionResponse.content);

  console.log('[PerplexityAPI] Portfolio insights success:', insightsItems.length, 'items');
  setCachedData(cacheKey, insightsItems);
  return insightsItems;
};

export const getTechnicalAnalysisInsights = async (symbol, companyName, currentPrice) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const cacheKey = `technical_insights_${symbol}_${todayIso}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[PerplexityAPI] Returning cached technical insights for ${symbol}`);
    return cached;
  }

  console.log(`[PerplexityAPI] Fetching technical insights for ${symbol}`);

  const completionResponse = await executeCompletion({
    messages: [
      {
        role: 'system',
        content: 'You are a technical analyst providing concise market insights based on chart patterns and technical indicators.',
      },
      {
        role: 'user',
        content: `Provide a brief technical analysis summary for ${companyName || symbol} (current price: $${currentPrice}). Include:
- Current trend direction (bullish/bearish/neutral)
- Key support and resistance levels
- Momentum assessment
- Overall technical outlook

Keep it to 3-4 sentences, actionable and clear.`,
      },
    ],
    maxTokens: 300,
    temperature: 0.3,
  });

  if (!completionResponse || !completionResponse.content) {
    return null;
  }

  const summary = completionResponse.content.replace(/\*\*/g, '').replace(/\[[\d,\s]+\]/g, '').trim();
  setCachedData(cacheKey, summary);
  return summary;
};

export const getAnalystRatingInsights = async (symbol, companyName, currentPrice) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const cacheKey = `analyst_rating_${symbol}_${todayIso}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[PerplexityAPI] Returning cached analyst rating for ${symbol}`);
    return cached;
  }

  console.log(`[PerplexityAPI] Fetching analyst rating for ${symbol}`);

  const completionResponse = await executeCompletion({
    messages: [
      {
        role: 'system',
        content: 'You are a financial analyst aggregating Wall Street analyst opinions. Provide structured analysis.',
      },
      {
        role: 'user',
        content: `Analyze recent Wall Street analyst ratings and price targets for ${companyName || symbol} (${symbol}, current price $${currentPrice}).

Provide a structured response with:
1. CONSENSUS: One word (Strong Buy/Buy/Hold/Sell/Strong Sell)
2. RATING_BREAKDOWN: Estimated distribution (e.g., "15 Strong Buy, 8 Buy, 5 Hold, 2 Sell")
3. PRICE_TARGET: Average 12-month price target with range (e.g., "$350 (range $300-$400)")
4. KEY_POINTS: 2-3 bullet points about recent analyst actions and reasoning

Format exactly as shown above with clear labels.`,
      },
    ],
    maxTokens: 400,
    temperature: 0.3,
  });

  if (!completionResponse || !completionResponse.content) {
    return null;
  }

  const content = completionResponse.content.replace(/\*\*/g, '').replace(/\[[\d,\s]+\]/g, '').trim();
  
  // Parse the structured response
  const result = {
    consensus: 'Hold',
    ratingBreakdown: '',
    priceTarget: 'N/A',
    priceTargetHigh: null,
    priceTargetLow: null,
    keyPoints: [],
  };

  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('CONSENSUS:')) {
      const match = line.match(/CONSENSUS:\s*(.+)/i);
      if (match) result.consensus = match[1].trim();
    } else if (line.includes('RATING_BREAKDOWN:')) {
      const match = line.match(/RATING_BREAKDOWN:\s*(.+)/i);
      if (match) result.ratingBreakdown = match[1].trim();
    } else if (line.includes('PRICE_TARGET:')) {
      const match = line.match(/PRICE_TARGET:\s*(.+)/i);
      if (match) {
        result.priceTarget = match[1].trim();
        // Try to extract high/low from range
        const rangeMatch = match[1].match(/\$(\d+(?:\.\d+)?)\s*(?:-|to)\s*\$(\d+(?:\.\d+)?)/);
        if (rangeMatch) {
          result.priceTargetLow = parseFloat(rangeMatch[1]);
          result.priceTargetHigh = parseFloat(rangeMatch[2]);
        }
      }
    } else if (line.includes('KEY_POINTS:')) {
      // Skip the label line
      continue;
    } else if (line.match(/^[-•*]\s+/)) {
      result.keyPoints.push(line.replace(/^[-•*]\s+/, '').trim());
    }
  }

  setCachedData(cacheKey, result);
  return result;
};

export const getDividendInsights = async (symbol, companyName, dividendYield, dividendAmount) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const cacheKey = `dividend_insights_${symbol}_${todayIso}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[PerplexityAPI] Returning cached dividend insights for ${symbol}`);
    return cached;
  }

  console.log(`[PerplexityAPI] Fetching dividend insights for ${symbol}`);

  const yieldText = dividendYield ? `${(dividendYield * 100).toFixed(2)}%` : 'unknown';
  const amountText = dividendAmount ? `$${dividendAmount.toFixed(2)}` : 'unknown';

  const completionResponse = await executeCompletion({
    messages: [
      {
        role: 'system',
        content: 'You are a dividend investment analyst providing insights on dividend sustainability and growth.',
      },
      {
        role: 'user',
        content: `Analyze the dividend profile for ${companyName || symbol} (current yield: ${yieldText}, amount: ${amountText}).

Provide 3-4 concise insights covering:
- Dividend history and consistency
- Payout sustainability
- Growth prospects
- How it compares to peers

Keep each point to 1-2 sentences.`,
      },
    ],
    maxTokens: 400,
    temperature: 0.3,
  });

  if (!completionResponse || !completionResponse.content) {
    return [];
  }

  const content = completionResponse.content.replace(/\*\*/g, '').replace(/\[[\d,\s]+\]/g, '').trim();
  
  // Split into bullet points
  const insights = content
    .split(/\n+/)
    .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(line => line.length > 20)
    .slice(0, 4);

  setCachedData(cacheKey, insights);
  return insights;
};

export const getEarningsInsights = async (symbol, companyName, nextEarningsDate) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const cacheKey = `earnings_insights_${symbol}_${todayIso}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`[PerplexityAPI] Returning cached earnings insights for ${symbol}`);
    return cached;
  }

  console.log(`[PerplexityAPI] Fetching earnings insights for ${symbol}`);

  const dateText = nextEarningsDate || 'upcoming';

  const completionResponse = await executeCompletion({
    messages: [
      {
        role: 'system',
        content: 'You are an earnings analyst providing insights on company financial performance and expectations.',
      },
      {
        role: 'user',
        content: `Analyze recent earnings performance and outlook for ${companyName || symbol} (next earnings: ${dateText}).

Provide 3-4 detailed insights covering:
- Recent earnings beat/miss history with specific numbers
- Revenue and profit trends over recent quarters
- Key metrics investors are watching (margins, guidance, etc.)
- What to expect in the upcoming earnings report

Format as clear bullet points. Each insight should be 2-3 complete sentences with specific details.`,
      },
    ],
    maxTokens: 500,
    temperature: 0.3,
  });

  if (!completionResponse || !completionResponse.content) {
    return [];
  }

  const content = completionResponse.content
    .replace(/\*\*/g, '')
    .replace(/\[[\d,\s]+\]/g, '')
    .replace(/^#{1,6}\s+/gm, '')  // Remove markdown headers
    .trim();
  
  // Split into paragraphs and bullet points
  const lines = content.split(/\n+/);
  const insights = [];
  
  for (const line of lines) {
    // Remove bullet markers and numbering
    let cleaned = line
      .replace(/^[-•*]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .trim();
    
    // Skip empty lines, headers, and very short lines
    if (!cleaned || cleaned.length < 30) continue;
    
    // Skip lines that look like section headers
    if (cleaned.endsWith(':') && cleaned.length < 60) continue;
    
    insights.push(cleaned);
    
    if (insights.length >= 4) break;
  }

  setCachedData(cacheKey, insights);
  return insights;
};
