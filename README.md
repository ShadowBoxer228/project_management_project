# Stock Market Analysis App

A professional mobile application for iOS and Android built with React Native (Expo) that provides real-time stock market data, AI-powered market analysis, and pre-market trading insights.

## Features

### Stock List Screen
- Top 100 S&P stocks by market capitalization
- Real-time price updates
- Price change indicators
- Search and filter functionality
- Pull-to-refresh

### Stock Detail Screen
- Interactive charts (Line and Candlestick views)
- Multiple time ranges (1D, 1W, 1M, 3M, 1Y, ALL)
- Comprehensive financial metrics
  - Market Cap
  - P/E Ratio
  - EPS
  - Dividend Yield
  - 52-week High/Low
  - Beta
  - Volume
- Recent company news
- Company information

### News & Analysis Screen
- Market open/close countdown
- AI-powered daily market summary (Perplexity AI)
- Economic calendar with major events
- Earnings announcements
- FOMC meetings and economic releases
- Geopolitical analysis
- Sector highlights
- Final trading strategy recommendations

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **Charts**: react-native-wagmi-charts
- **UI Components**: React Native Paper
- **APIs**:
  - Finnhub (Stock quotes, company data, economic calendar)
  - Alpha Vantage (Historical data, technical indicators)
  - Marketaux (Financial news)
  - Perplexity AI (Market analysis)

## Setup Instructions

### 1. Get API Keys

You'll need free API keys from the following services:

#### Finnhub (Required)
1. Visit [https://finnhub.io/](https://finnhub.io/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier: 60 API calls/minute

#### Alpha Vantage (Required)
1. Visit [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
2. Get your free API key
3. Free tier: 500 API calls/day

#### Marketaux (Optional but recommended)
1. Visit [https://www.marketaux.com/](https://www.marketaux.com/)
2. Sign up for a free account
3. Get your API token
4. Free tier: Financial news API

#### Perplexity AI (Optional but recommended for daily summary)
1. Visit [https://www.perplexity.ai/](https://www.perplexity.ai/)
2. Subscribe to Pro plan ($20/month)
3. Get API key from [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
4. Includes $5/month free credits

### 2. Configure API Keys

Open the following files and replace the placeholder API keys with your actual keys:

**services/finnhubAPI.js**
```javascript
const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY';
```

**services/alphaVantageAPI.js**
```javascript
const ALPHA_VANTAGE_API_KEY = 'YOUR_ALPHA_VANTAGE_API_KEY';
```

**services/marketauxAPI.js**
```javascript
const MARKETAUX_API_KEY = 'YOUR_MARKETAUX_API_KEY';
```

**services/perplexityAPI.js**
```javascript
const PERPLEXITY_API_KEY = 'YOUR_PERPLEXITY_API_KEY';
```

### 3. Run on Expo Snack

#### Option A: Upload to Expo Snack (Recommended)
1. Visit [https://snack.expo.dev/](https://snack.expo.dev/)
2. Create a new Snack project
3. Upload all project files maintaining the folder structure
4. The app will automatically build and you can preview it on your phone using the Expo Go app

#### Option B: Local Development
```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Scan QR code with Expo Go app (iOS/Android)
```

## Folder Structure

```
/
├── App.js                      # Main app entry point with navigation
├── package.json                # Dependencies configuration
├── screens/
│   ├── StockListScreen.js     # Top 100 stocks list
│   ├── StockDetailScreen.js   # Individual stock details
│   └── NewsSummaryScreen.js   # Daily market analysis
├── components/
│   └── StockChart.js          # Reusable chart component
├── services/
│   ├── finnhubAPI.js          # Finnhub API integration
│   ├── alphaVantageAPI.js     # Alpha Vantage API integration
│   ├── marketauxAPI.js        # Marketaux API integration
│   └── perplexityAPI.js       # Perplexity AI integration
├── utils/
│   ├── theme.js               # App theme and styling
│   └── formatters.js          # Utility formatting functions
└── data/
    └── sp100.json             # S&P 100 stocks list
```

## Usage Tips

### Minimizing API Costs

The app implements smart caching to minimize API calls:

- **Finnhub**: 1-minute cache for real-time quotes
- **Alpha Vantage**: 5-minute cache for historical data
- **Marketaux**: 10-minute cache for news
- **Perplexity**: 24-hour cache for daily summary (only 1 call per day)

### Pre-Market Analysis Workflow

1. **Before Market Opens** (6:00 AM - 9:30 AM EST):
   - Check the News tab for AI-powered market summary
   - Review economic calendar for major announcements
   - Check earnings calendar for companies reporting today
   - Read the final trading strategy

2. **Stock Research**:
   - Browse top 100 stocks in the Stocks tab
   - Click on individual stocks for detailed analysis
   - View charts with different time ranges
   - Check recent news and financial metrics

3. **Decision Making**:
   - Use AI insights for market sentiment
   - Monitor technical indicators
   - Consider economic events and earnings
   - Plan your trading strategy

## Design Philosophy

- **Modern iOS Aesthetic**: Clean, minimalist design inspired by native iOS apps
- **No Emojis**: Professional interface without emoji clutter
- **Elegant Typography**: Clear hierarchy and readability
- **Smooth Interactions**: Intuitive gestures and animations
- **Data-First**: Focus on actionable information

## API Rate Limits

### Free Tier Limits:
- **Finnhub**: 60 calls/minute (sufficient for browsing)
- **Alpha Vantage**: 500 calls/day (use sparingly for charts)
- **Marketaux**: 100 calls/day (free tier)
- **Perplexity**: $5 credit/month (Pro subscribers)

### Optimization Tips:
- App uses aggressive caching
- Pull-to-refresh updates data
- Historical data is cached longer
- Perplexity summary cached for 24 hours

## Troubleshooting

### Charts Not Loading
- Verify Alpha Vantage API key is correct
- Check you haven't exceeded daily rate limit (500 calls)
- Charts fall back to mock data if API fails

### Stock Prices Not Updating
- Verify Finnhub API key is correct
- Check your internet connection
- Try pull-to-refresh

### Market Summary Not Loading
- Verify Perplexity API key is correct
- Check you have Pro subscription with available credits
- Summary caches for 24 hours after first load

### News Not Showing
- Verify Marketaux API key is correct
- Some stocks may not have recent news
- Try checking a different stock

## Future Enhancements

Potential features to add:
- Watchlist functionality with local storage
- Push notifications for price alerts
- Technical indicator overlays (RSI, MACD)
- Portfolio tracking
- Dark mode
- Comparison charts for multiple stocks

## License

This project is for educational and personal use. Please review the terms of service for each API provider before commercial use.

## Support

For issues or questions:
1. Check API keys are configured correctly
2. Verify API rate limits haven't been exceeded
3. Check Expo Snack console for error messages

## Acknowledgments

- Stock data powered by Finnhub and Alpha Vantage
- News powered by Marketaux
- AI analysis powered by Perplexity AI
- Built with React Native and Expo
