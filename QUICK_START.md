# Quick Start Guide

Get your Stock Market Analysis App running in 5 minutes!

## Prerequisites
- Expo Go app installed on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- API keys (see below)

## Step 1: Get API Keys (2 minutes)

### Required (Free):

**Finnhub** (Stock data)
- Visit: https://finnhub.io/register
- Sign up → Get API key
- Copy your key

**Alpha Vantage** (Charts)
- Visit: https://www.alphavantage.co/support/#api-key
- Enter email → Get API key
- Copy your key

### Optional:

**Perplexity AI** (Daily summary - $20/month)
- Visit: https://www.perplexity.ai/
- Subscribe to Pro
- Get API key from settings

## Step 2: Configure API Keys (1 minute)

Open these files and paste your API keys:

1. `services/finnhubAPI.js` - Line 1
   ```javascript
   const FINNHUB_API_KEY = 'paste-your-key-here';
   ```

2. `services/alphaVantageAPI.js` - Line 1
   ```javascript
   const ALPHA_VANTAGE_API_KEY = 'paste-your-key-here';
   ```

3. `services/perplexityAPI.js` - Line 1 (optional)
   ```javascript
   const PERPLEXITY_API_KEY = 'paste-your-key-here';
   ```

## Step 3: Deploy to Expo Snack (2 minutes)

### Method A: Upload to Snack (Easiest)

1. Go to https://snack.expo.dev/
2. Click folder icon → Delete default `App.js`
3. Upload ALL project files maintaining folder structure:
   ```
   Root: App.js, package.json
   screens/: All 3 screen files
   components/: StockChart.js
   services/: All 4 API files
   utils/: theme.js, formatters.js
   data/: sp100.json
   ```
4. Wait for "Installing dependencies..." to complete

### Method B: Run Locally

```bash
cd Portfolio_mgmt_project
npm install
npm start
```

Scan QR code with Expo Go app.

## Step 4: Test the App

1. **Stocks Tab**: Should show list of 100 stocks with prices
2. **Tap a stock**: View charts and details
3. **News Tab**: See daily market summary
4. **Pull down**: Refresh data

## Troubleshooting

### "Invalid API Key"
- Check you copied the entire key (no spaces)
- Verify key is in quotes: `'your-key-here'`

### "No data loading"
- Check internet connection
- Verify API keys are correct
- Wait 30 seconds for initial load

### "Charts not showing"
- Mock data will show automatically
- Real data requires Alpha Vantage key
- Check you haven't hit rate limit (500/day)

### "App very slow"
- Reduce stock list in `data/sp100.json` to 20 stocks
- Use on phone instead of web preview
- Wait for cache to build up (faster after first use)

## File Locations

```
Portfolio_mgmt_project/
├── API_SETUP_GUIDE.md      ← Detailed API setup
├── EXPO_SNACK_GUIDE.md     ← Snack deployment
├── PROJECT_OVERVIEW.md     ← Full documentation
├── README.md               ← Main readme
└── QUICK_START.md          ← You are here
```

## What Each Tab Does

### Stocks Tab
- Lists top 100 S&P stocks
- Shows real-time prices
- Search stocks
- Tap for detailed view

### News Tab
- AI market summary (requires Perplexity)
- Economic calendar
- Earnings announcements
- Trading strategy

## Need More Help?

1. **API Setup**: Read `API_SETUP_GUIDE.md`
2. **Snack Issues**: Read `EXPO_SNACK_GUIDE.md`
3. **Full Details**: Read `PROJECT_OVERVIEW.md`

## Demo Credentials

Don't want to set up APIs yet? Use these demo keys for testing:

**Note**: Demo keys are rate-limited and shared. Get your own for better performance.

```javascript
// Demo Finnhub key (limited)
const FINNHUB_API_KEY = 'demo';

// Get your own Alpha Vantage key - it's free!
// Visit: https://www.alphavantage.co/support/#api-key
```

## Next Steps

Once running:
1. ✅ Verify stock list loads
2. ✅ Test stock detail view
3. ✅ Check charts work
4. ✅ Browse news tab
5. ✅ Customize theme in `utils/theme.js`
6. ✅ Add your favorite stocks to `data/sp100.json`

## Share Your Snack

After uploading to Expo Snack:
1. Click "Save" in top right
2. Click "Share"
3. Copy URL
4. Share with friends!

They can scan QR code and run on their phone instantly.

---

**Estimated Setup Time**: 5 minutes
**Cost**: $0-20/month depending on Perplexity usage
**Difficulty**: Beginner-friendly

Happy trading! 📈
