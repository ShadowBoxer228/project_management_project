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
- Dual interaction modes:
  - Inspect mode: Tap and hold to view prices
  - Navigate mode: 1 finger to pan, 2 fingers to pinch zoom
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

- **Framework**: React Native with Expo (~51.0.0)
- **Navigation**: React Navigation (Bottom tabs + Stack)
- **Charts**: react-native-wagmi-charts (built on Reanimated 2)
- **Gestures**: react-native-gesture-handler (simultaneous pan/pinch)
- **Animation**: React Native Reanimated (v2)
- **UI Components**: React Native Paper
- **APIs**:
  - Finnhub (Stock quotes, company data, economic calendar)
  - Alpha Vantage (Historical data, technical indicators)
  - Marketaux (Financial news)
  - Perplexity AI (Market analysis)

### Key Technical Features

**Interactive Charts**:
- Provider-based architecture (`LineChart.Provider`, `CandlestickChart.Provider`)
- Native-driven animations via Reanimated worklets
- Simultaneous gesture recognition (pan + pinch)
- Real-time tooltip updates
- Customizable crosshair and price labels

**Gesture Handling**:
- 1-finger pan for horizontal scrolling
- 2-finger pinch for zoom with focal point
- All calculations on UI thread for 60fps
- Constrained zoom bounds (10%-100% visible data)

## Prerequisites

Before starting, ensure you have:
- Node.js (v16 or later) installed
- npm or yarn package manager
- Expo Go app installed on your mobile device (for quick testing)
- OR Android Studio / Xcode for local development builds

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

### 3. Run the Application

#### Option A: Expo Go (Quickest - Recommended for Testing)
1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Start the Expo development server:
   ```bash
   npx expo start
   ```

3. Scan the QR code with:
   - **iOS**: Camera app (will open in Expo Go)
   - **Android**: Expo Go app

#### Option B: Local Development Build
For testing native features or custom configurations:

1. Install expo-dev-client:
   ```bash
   npx expo install expo-dev-client
   ```

2. Build and run locally:
   ```bash
   # For Android
   npx expo run:android

   # For iOS (macOS only)
   npx expo run:ios
   ```

#### Option C: Expo Snack (Browser-based)
1. Visit [https://snack.expo.dev/](https://snack.expo.dev/)
2. Create a new Snack project
3. Upload all project files maintaining the folder structure
4. Preview on your phone using the Expo Go app or in the browser

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

### Chart Interactions

The stock charts offer two interaction modes:

**Inspect Mode** (Default):
- Tap and hold anywhere on the chart to view exact prices
- Ideal for checking specific price points
- Clean, simple interaction

**Navigate Mode**:
- Use 1 finger to pan left/right through historical data
- Use 2 fingers to pinch zoom in/out
- Tap "Reset" to return to full view
- Perfect for detailed technical analysis

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
- **No Emojis**: Professional interface without visual clutter
- **Elegant Typography**: Clear hierarchy and readability
- **Smooth Interactions**: Intuitive gestures and animations
- **Data-First**: Focus on actionable information

## Recent Updates

### Chart Enhancements
- Added dual interaction modes (Inspect and Navigate)
- Navigate mode: 1-finger pan for scrolling, 2-finger pinch for zoom
- Inspect mode: Tap and hold to view exact prices
- Added reset zoom button for quick return to full view
- Improved gesture handling for smoother interactions

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

## Development Best Practices

### Working with Expo

**Start Development Server**:
```bash
npx expo start
```
This command:
- Starts Metro bundler on the default port
- Generates QR code for Expo Go
- Provides options to open on iOS/Android simulators

**Development Builds vs Expo Go**:
- **Expo Go**: Quick testing, limited native modules
- **Dev Builds**: Full native access, requires `expo-dev-client`

**Restart Server with Cache Clear**:
```bash
npx expo start --clear
```

### Chart Component Usage

**Basic Line Chart**:
```jsx
<LineChart.Provider data={data}>
  <LineChart>
    <LineChart.Path />
    <LineChart.CursorCrosshair>
      <LineChart.Tooltip />
    </LineChart.CursorCrosshair>
  </LineChart>
  <LineChart.PriceText />
  <LineChart.DatetimeText />
</LineChart.Provider>
```

**Candlestick with Custom Colors**:
```jsx
<CandlestickChart.Provider data={data}>
  <CandlestickChart>
    <CandlestickChart.Candles
      positiveColor="#34C759"
      negativeColor="#FF3B30"
    />
    <CandlestickChart.Crosshair color="#007AFF" />
  </CandlestickChart>
</CandlestickChart.Provider>
```

### Gesture Handler Tips

**Simultaneous Pan and Pinch**:
```jsx
const panGesture = Gesture.Pan()...
const pinchGesture = Gesture.Pinch()...
const composed = Gesture.Simultaneous(panGesture, pinchGesture);

<GestureDetector gesture={composed}>
  <Animated.View>{/* Chart content */}</Animated.View>
</GestureDetector>
```

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
3. Check Expo dev tools console for error messages
4. Review the troubleshooting sections in documentation

## Useful Resources

### Official Documentation
- **Expo**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **React Native Wagmi Charts**: [https://github.com/coinjar/react-native-wagmi-charts](https://github.com/coinjar/react-native-wagmi-charts)
- **React Native Gesture Handler**: [https://docs.swmansion.com/react-native-gesture-handler/](https://docs.swmansion.com/react-native-gesture-handler/)
- **React Native Reanimated**: [https://docs.swmansion.com/react-native-reanimated/](https://docs.swmansion.com/react-native-reanimated/)
- **React Navigation**: [https://reactnavigation.org/](https://reactnavigation.org/)

### API Documentation
- **Finnhub**: [https://finnhub.io/docs/api](https://finnhub.io/docs/api)
- **Alpha Vantage**: [https://www.alphavantage.co/documentation/](https://www.alphavantage.co/documentation/)
- **Marketaux**: [https://www.marketaux.com/documentation](https://www.marketaux.com/documentation)
- **Perplexity AI**: [https://docs.perplexity.ai/](https://docs.perplexity.ai/)

## Acknowledgments

- Stock data powered by Finnhub and Alpha Vantage
- News powered by Marketaux
- AI analysis powered by Perplexity AI
- Charts by react-native-wagmi-charts
- Gesture handling by Software Mansion
- Built with React Native and Expo
