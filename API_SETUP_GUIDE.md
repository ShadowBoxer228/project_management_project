# API Setup Guide

This guide will walk you through obtaining all the necessary API keys for the Stock Market Analysis App.

## Required APIs (Free)

### 1. Finnhub API

**Purpose**: Real-time stock quotes, company profiles, news, economic calendar, earnings calendar

**Free Tier**: 60 API calls per minute

**Setup Steps**:
1. Go to [https://finnhub.io/register](https://finnhub.io/register)
2. Sign up with your email
3. Verify your email address
4. Login to your dashboard at [https://finnhub.io/dashboard](https://finnhub.io/dashboard)
5. Copy your API key
6. Open `services/finnhubAPI.js`
7. Replace `YOUR_FINNHUB_API_KEY` with your actual key

**Example**:
```javascript
const FINNHUB_API_KEY = 'c1234abcd5678efgh9012ijkl'; // Your actual key
```

---

### 2. Alpha Vantage API

**Purpose**: Historical stock data, technical indicators, company fundamentals

**Free Tier**: 500 API calls per day, 5 calls per minute

**Setup Steps**:
1. Go to [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
2. Enter your email and organization (can use "Personal")
3. Click "GET FREE API KEY"
4. Your API key will be displayed and emailed to you
5. Open `services/alphaVantageAPI.js`
6. Replace `YOUR_ALPHA_VANTAGE_API_KEY` with your actual key

**Example**:
```javascript
const ALPHA_VANTAGE_API_KEY = 'ABCD1234EFGH5678'; // Your actual key
```

---

## Optional APIs (Recommended)

### 3. Marketaux API

**Purpose**: Financial news articles for stocks

**Free Tier**: 100 API calls per day

**Setup Steps**:
1. Go to [https://www.marketaux.com/](https://www.marketaux.com/)
2. Click "Get Started Free"
3. Sign up with your email
4. Verify your email
5. Login to your dashboard
6. Navigate to API section and copy your API token
7. Open `services/marketauxAPI.js`
8. Replace `YOUR_MARKETAUX_API_KEY` with your actual token

**Example**:
```javascript
const MARKETAUX_API_KEY = 'abcdef123456'; // Your actual token
```

**Note**: If you skip this, stock news will still work using Finnhub's news API.

---

### 4. Perplexity AI API

**Purpose**: AI-powered daily market summary and analysis

**Cost**: $20/month Pro subscription + pay-per-use (includes $5 free credit/month)

**Setup Steps**:
1. Go to [https://www.perplexity.ai/](https://www.perplexity.ai/)
2. Sign up for an account
3. Subscribe to Perplexity Pro ($20/month)
   - Visit [https://www.perplexity.ai/settings/account](https://www.perplexity.ai/settings/account)
   - Click "Upgrade to Pro"
4. Go to API settings: [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
5. Click "Generate API Key"
6. Copy your API key
7. Open `services/perplexityAPI.js`
8. Replace `YOUR_PERPLEXITY_API_KEY` with your actual key

**Example**:
```javascript
const PERPLEXITY_API_KEY = 'pplx-1234567890abcdef'; // Your actual key
```

**Cost Breakdown**:
- Pro subscription: $20/month (required to access API)
- API usage: ~$0.001-0.005 per request
- Free credits: $5/month included
- Daily summary uses 1 request/day = ~$0.15/month

**Note**: If you skip this, the News tab will show "Market summary unavailable" but economic calendar and earnings will still work.

---

## Quick Configuration Checklist

Once you have all your API keys, update these files:

- [ ] `services/finnhubAPI.js` - Line 1
- [ ] `services/alphaVantageAPI.js` - Line 1
- [ ] `services/marketauxAPI.js` - Line 1 (optional)
- [ ] `services/perplexityAPI.js` - Line 1 (optional)

## Testing Your API Keys

### Test Finnhub:
```bash
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_API_KEY"
```

Expected response:
```json
{"c":150.5,"d":2.5,"dp":1.69,"h":151.2,"l":149.8,"o":150.0,"pc":148.0}
```

### Test Alpha Vantage:
```bash
curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=YOUR_API_KEY"
```

Expected response: JSON with Global Quote data

### Test Marketaux:
```bash
curl "https://api.marketaux.com/v1/news/all?symbols=AAPL&limit=1&api_token=YOUR_API_KEY"
```

Expected response: JSON with news articles

### Test Perplexity:
```bash
curl -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-sonar-small-128k-online","messages":[{"role":"user","content":"Hello"}]}'
```

Expected response: JSON with AI response

## Rate Limit Management

The app automatically manages rate limits with:

### Smart Caching:
- Finnhub quotes: 1 minute cache
- Alpha Vantage data: 5 minute cache
- Marketaux news: 10 minute cache
- Perplexity summary: 24 hour cache

### Tips to Avoid Hitting Limits:
1. Don't refresh too frequently
2. Perplexity summary only fetches once per day
3. Historical chart data is cached
4. Browse multiple stocks slowly to let cache work

## Estimated Daily Usage

With normal use (checking 20-30 stocks, viewing a few charts):

- **Finnhub**: ~100-200 calls/day (well under 86,400/day limit at 60/min)
- **Alpha Vantage**: ~50-100 calls/day (under 500/day limit)
- **Marketaux**: ~10-20 calls/day (under 100/day limit)
- **Perplexity**: 1 call/day (~$0.005/day)

## Troubleshooting

### "Invalid API Key" Error
- Double-check you copied the entire key
- Make sure there are no spaces before/after the key
- Verify the key is inside quotes: `'your-key-here'`

### "Rate Limit Exceeded"
- Wait a few minutes before trying again
- Alpha Vantage: 5 calls per minute max
- Finnhub: 60 calls per minute max
- Use the app's caching by waiting between actions

### "Network Error"
- Check your internet connection
- Verify the API service is not down
- Try testing the API with curl command above

## Cost Summary

### Minimum Setup (Free):
- Finnhub: $0/month
- Alpha Vantage: $0/month
- **Total: $0/month**

### Recommended Setup:
- Finnhub: $0/month
- Alpha Vantage: $0/month
- Marketaux: $0/month
- Perplexity Pro: $20/month (includes $5 API credit)
- **Total: ~$20/month**

## Support

If you encounter issues:
1. Verify each API key individually using the test commands above
2. Check the Expo Snack console for specific error messages
3. Ensure you're not hitting rate limits
4. Try clearing the app cache (restart the app)
