# Expo Snack Deployment Guide

This guide shows you how to deploy the Stock Market Analysis App to Expo Snack for instant mobile preview.

## Quick Start (5 minutes)

### Step 1: Create Expo Snack Project

1. Go to [https://snack.expo.dev/](https://snack.expo.dev/)
2. Click "Sign in" (optional but recommended to save your work)
3. You'll see a default Expo project

### Step 2: Upload Project Files

You have two options:

#### Option A: Manual Upload (Recommended for Snack)

1. In Expo Snack, click the folder icon in the left sidebar
2. Delete the default `App.js`
3. Upload files in this order:

**Root Level**:
- Upload `App.js`
- Upload `package.json`

**Create folders and upload files**:
- Create `screens/` folder:
  - Upload `StockListScreen.js`
  - Upload `StockDetailScreen.js`
  - Upload `NewsSummaryScreen.js`

- Create `components/` folder:
  - Upload `StockChart.js`

- Create `services/` folder:
  - Upload `finnhubAPI.js`
  - Upload `alphaVantageAPI.js`
  - Upload `marketauxAPI.js`
  - Upload `perplexityAPI.js`

- Create `utils/` folder:
  - Upload `theme.js`
  - Upload `formatters.js`

- Create `data/` folder:
  - Upload `sp100.json`

#### Option B: Import from GitHub (If you have a repo)

1. Click "Import git repository" in Expo Snack
2. Enter your GitHub repository URL
3. Snack will automatically import all files

### Step 3: Configure API Keys

Before running, you MUST configure your API keys:

1. In Expo Snack, click on `services/finnhubAPI.js`
2. Find line 1: `const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY';`
3. Replace `YOUR_FINNHUB_API_KEY` with your actual Finnhub API key
4. Repeat for other API files:
   - `services/alphaVantageAPI.js`
   - `services/marketauxAPI.js` (optional)
   - `services/perplexityAPI.js` (optional)

See [API_SETUP_GUIDE.md](./API_SETUP_GUIDE.md) for detailed instructions on getting API keys.

### Step 4: Install Dependencies

Expo Snack should automatically detect dependencies from `package.json`. If not:

1. Click on `package.json`
2. Snack will show "Installing dependencies..."
3. Wait for the green checkmark

### Step 5: Run the App

1. **Web Preview**: Click the "Web" button to preview in browser
2. **Mobile Preview**:
   - Install "Expo Go" app on your iPhone or Android
   - Scan the QR code shown in Expo Snack
   - App will load on your phone

## Expo Snack Limitations

Be aware of these limitations when using Snack:

### What Works:
- All UI components
- Navigation
- API calls (if you have internet)
- Charts and graphs
- Search and filtering
- Pull-to-refresh

### What May Have Issues:
- Very large chart datasets (Snack has memory limits)
- Simultaneous API calls to all 100 stocks (may be slow)
- Complex chart interactions on web preview (better on mobile)

### Optimization for Snack:

If the app is slow on Snack, try these optimizations:

1. **Reduce Stock List**:
   - Edit `data/sp100.json`
   - Keep only top 20-30 stocks for testing

2. **Increase Cache Duration**:
   - Edit API service files
   - Increase `CACHE_DURATION` values

3. **Disable Auto-Load**:
   - Comment out `useEffect` calls in `StockListScreen.js` that fetch all quotes
   - Implement lazy loading per stock

## File Structure in Snack

Your Expo Snack should look like this:

```
My Snack/
├── App.js
├── package.json
├── screens/
│   ├── StockListScreen.js
│   ├── StockDetailScreen.js
│   └── NewsSummaryScreen.js
├── components/
│   └── StockChart.js
├── services/
│   ├── finnhubAPI.js
│   ├── alphaVantageAPI.js
│   ├── marketauxAPI.js
│   └── perplexityAPI.js
├── utils/
│   ├── theme.js
│   └── formatters.js
└── data/
    └── sp100.json
```

## Testing Checklist

Once uploaded to Snack, test these features:

- [ ] App loads without errors
- [ ] Bottom navigation works (Stocks & News tabs)
- [ ] Stock list displays with search functionality
- [ ] Can tap a stock to view details
- [ ] Charts render (line and candlestick)
- [ ] Time range buttons work (1D, 1W, 1M, etc.)
- [ ] Financial metrics display
- [ ] News tab shows market summary
- [ ] Economic calendar shows events
- [ ] Pull-to-refresh works

## Common Issues & Solutions

### Issue: "Cannot find module"
**Solution**: Make sure all files are in the correct folders as shown in file structure above

### Issue: Charts not rendering
**Solution**:
- Verify `react-native-wagmi-charts` is installed
- Check package.json has correct version
- Try using mock data first (charts generate mock data on API failure)

### Issue: API calls failing
**Solution**:
- Check API keys are configured
- Verify you have internet connection
- Check browser console for CORS errors
- Test API keys using curl commands in API_SETUP_GUIDE.md

### Issue: "Too many requests"
**Solution**:
- You've hit API rate limit
- Wait a few minutes
- Reduce number of stocks in sp100.json
- Increase cache duration in API files

### Issue: App very slow on Snack
**Solution**:
- Reduce stock list to 20-30 stocks
- Test on actual phone instead of web preview
- Increase cache durations
- Comment out auto-refresh logic

## Sharing Your Snack

Once everything works:

1. Click "Save" in top right
2. Click "Share" button
3. Copy the Snack URL (looks like: `https://snack.expo.dev/@username/project-name`)
4. Share with others!

Others can:
- View and run your app
- Fork it to make their own copy
- Scan QR code to run on their phone

## Converting to Standalone App

When ready to deploy as a real app:

### Option 1: Expo Go (Quick)
- Just share your Snack URL
- Users install Expo Go and scan QR code
- No app store needed

### Option 2: Build APK/IPA (Production)

1. **Export from Snack**:
   - Download project as ZIP
   - Extract locally

2. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

3. **Build for Android**:
   ```bash
   eas build --platform android
   ```

4. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

5. **Submit to Stores**:
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

See [Expo documentation](https://docs.expo.dev/build/setup/) for detailed build instructions.

## Performance Tips for Snack

1. **Lazy Load Stock Quotes**:
   - Don't fetch all 100 stock quotes on load
   - Fetch only visible stocks
   - Fetch more as user scrolls

2. **Reduce Chart Data Points**:
   - Limit intraday data to last 2-3 hours
   - Reduce daily data to last 30 days max

3. **Optimize Images**:
   - Use compressed images for any icons
   - Avoid loading company logos (if you add them)

4. **Minimize Re-renders**:
   - Use `React.memo` for list items
   - Implement `useMemo` for expensive calculations

## Next Steps

After getting it working on Snack:

1. **Add API Keys**: Follow API_SETUP_GUIDE.md
2. **Test All Features**: Use the testing checklist above
3. **Customize**: Modify colors in `utils/theme.js`
4. **Optimize**: Reduce stock list if slow
5. **Share**: Send Snack URL to others

## Support Resources

- **Expo Snack Docs**: [https://docs.expo.dev/workflow/snack/](https://docs.expo.dev/workflow/snack/)
- **Expo Forums**: [https://forums.expo.dev/](https://forums.expo.dev/)
- **React Native Docs**: [https://reactnative.dev/](https://reactnative.dev/)

## Video Tutorial (Recommended)

For visual learners, search YouTube for:
- "How to use Expo Snack"
- "Deploy React Native app to Expo Snack"
- "Expo Go tutorial"

Enjoy building your stock analysis app!
