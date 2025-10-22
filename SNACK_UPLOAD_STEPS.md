# 📱 Expo Snack Upload - Step by Step

Follow these exact steps to deploy your app in 5 minutes.

## Step 1: Open Expo Snack

1. Go to: **https://snack.expo.dev/**
2. You'll see a default project with sample code

## Step 2: Prepare the File Tree

You need to create this exact structure in Snack:

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

## Step 3: Upload Root Files First

1. **Delete default App.js**:
   - In Snack's left sidebar, hover over `App.js`
   - Click the trash icon

2. **Upload App.js**:
   - Click the folder icon at top of left sidebar
   - Click "Upload files"
   - Select: `/Users/selim/Desktop/Portfolio_mgmt_project/App.js`

3. **Upload package.json**:
   - Click folder icon again
   - Click "Upload files"
   - Select: `/Users/selim/Desktop/Portfolio_mgmt_project/package.json`

**Wait**: Snack will show "Installing dependencies..." - this may take 30-60 seconds.

## Step 4: Create `screens/` Folder

1. **Create folder**:
   - Click folder icon (top left)
   - Click "Create folder"
   - Name it: `screens`

2. **Upload screen files**:
   - Click on the `screens` folder
   - Click "Upload files"
   - Select ALL THREE files from `/Users/selim/Desktop/Portfolio_mgmt_project/screens/`:
     - StockListScreen.js
     - StockDetailScreen.js
     - NewsSummaryScreen.js
   - Upload them all at once (hold Cmd/Ctrl to select multiple)

## Step 5: Create `components/` Folder

1. **Create folder**:
   - Click folder icon
   - Click "Create folder"
   - Name it: `components`

2. **Upload StockChart.js**:
   - Click on `components` folder
   - Click "Upload files"
   - Select: `/Users/selim/Desktop/Portfolio_mgmt_project/components/StockChart.js`

## Step 6: Create `services/` Folder

1. **Create folder**:
   - Click folder icon
   - Click "Create folder"
   - Name it: `services`

2. **Upload ALL service files**:
   - Click on `services` folder
   - Click "Upload files"
   - Select ALL FOUR files from `/Users/selim/Desktop/Portfolio_mgmt_project/services/`:
     - finnhubAPI.js ✅ (API key already in file)
     - alphaVantageAPI.js ✅ (API key already in file)
     - marketauxAPI.js ✅ (API key already in file)
     - perplexityAPI.js ✅ (API key already in file)

**Important**: Your API keys are already configured in these files!

## Step 7: Create `utils/` Folder

1. **Create folder**:
   - Click folder icon
   - Click "Create folder"
   - Name it: `utils`

2. **Upload util files**:
   - Click on `utils` folder
   - Click "Upload files"
   - Select BOTH files from `/Users/selim/Desktop/Portfolio_mgmt_project/utils/`:
     - theme.js
     - formatters.js

## Step 8: Create `data/` Folder

1. **Create folder**:
   - Click folder icon
   - Click "Create folder"
   - Name it: `data`

2. **Upload sp100.json**:
   - Click on `data` folder
   - Click "Upload files"
   - Select: `/Users/selim/Desktop/Portfolio_mgmt_project/data/sp100.json`

## Step 9: Wait for Build

1. Look at the bottom of the screen for build status
2. You should see: "Installing dependencies..."
3. Wait for green checkmark: "✓ Dependencies installed"
4. This might take 1-2 minutes

If you see errors, check:
- All files uploaded correctly
- Folder structure matches exactly
- package.json is in root

## Step 10: Test on Web (Limited)

⚠️ **IMPORTANT**: Web preview has CORS issues - stock prices will show "N/A"

1. Click the **"Web"** button on the right side
2. Wait for web preview to load
3. You should see your app with two tabs: "Stocks" and "News"

**Expected on web preview**:
- Stocks tab: List of 100 stocks - **prices will show "N/A"** (CORS blocking)
- News tab: May not load (CORS blocking)
- UI and navigation work fine

**This is NORMAL on web!** Continue to Step 11 to test on mobile.

## Step 11: Test on Mobile (Recommended)

1. **Install Expo Go** on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Scan QR Code**:
   - In Expo Snack, look for QR code on right side
   - Open Expo Go app
   - Tap "Scan QR Code"
   - Point camera at QR code
   - App will load on your phone!

**Better performance on mobile than web preview.**

## Step 12: Save Your Snack

1. Click **"Save"** button (top right corner)
2. If not logged in, you'll be prompted to sign in
3. Give your snack a name: "Stock Market Analysis"
4. Click Save

## Step 13: Share Your App

1. Click **"Share"** button
2. Copy the URL (looks like: `https://snack.expo.dev/@username/stock-market-analysis`)
3. Share with friends, colleagues, anyone!

They can:
- Run on their phone instantly
- View the code
- Fork and modify

## Troubleshooting Upload Issues

### "Cannot find module '@react-navigation/native'"

**Solution**: package.json not uploaded or dependencies still installing
- Wait 30 more seconds
- Check package.json is in root folder
- Click refresh

### "Unable to resolve module 'theme'"

**Solution**: Folder structure is wrong
- Check utils/theme.js exists
- Make sure folders are named exactly: `utils` not `Utils`
- Case-sensitive!

### "Expected a component class, got [object Object]"

**Solution**: Files didn't upload completely
- Re-upload the screen files
- Make sure they're in screens/ folder

### Charts showing "No data available"

**Solution**: This is normal on first load
- Charts generate mock data initially
- Real data loads after API calls complete
- Try pulling down to refresh

### Snack keeps crashing

**Solution**: Too much data for web preview
- Edit `data/sp100.json`
- Remove all stocks except first 20
- Upload edited version
- Or test on mobile instead of web

## Upload Time Estimate

- Root files: 30 seconds
- Create folders: 1 minute
- Upload all files: 2 minutes
- Dependency install: 1 minute
- Testing: 1 minute

**Total: ~5 minutes**

## What You Should See

### Stocks Tab (Initial State):
```
Markets

[Search bar]

AAPL                    $XXX.XX
Apple Inc.              +X.XX%

MSFT                    $XXX.XX
Microsoft Corp.         +X.XX%

... (98 more)
```

### News Tab (Initial State):
```
Market Analysis
[Today's date]

Market Closed
Opens in Xh Xm

Today's Earnings
[Company symbols...]

Economic Calendar
[Events list...]

AI Market Summary
[Loading...]
[After ~5 seconds: Full summary appears]
```

### Stock Detail (After tapping a stock):
```
Apple Inc.
AAPL

[Chart with line/candle toggle]
[1D 1W 1M 3M 1Y ALL buttons]

Key Statistics
[Financial metrics grid]

Recent News
[News articles list]

Company Info
[Company details]
```

## Success Indicators

✅ **App loads without red error screens**
✅ **Can navigate between Stocks and News tabs**
✅ **Stock list shows 100 companies**
✅ **Can search stocks**
✅ **Tapping a stock shows detail screen**
✅ **Charts render (even if mock data)**
✅ **News tab shows today's date**
✅ **Can pull to refresh**

## Final Checklist

Before calling it done:

- [ ] All files uploaded
- [ ] Dependencies installed (green checkmark)
- [ ] Web preview loads without errors
- [ ] Mobile preview works (scanned QR code)
- [ ] Can navigate all screens
- [ ] Stock prices loading
- [ ] Charts rendering
- [ ] News tab loading
- [ ] Saved the Snack
- [ ] Got shareable URL

## Next Steps After Upload

1. **Test all features** (15 minutes)
2. **Share with friends** (send Snack URL)
3. **Customize** (change theme colors in utils/theme.js)
4. **Monitor API usage** (check Finnhub/Alpha Vantage dashboards)

---

## Need Help?

If stuck at any step:

1. Check the error message in Snack console (bottom panel)
2. Verify folder structure matches exactly
3. Make sure all files uploaded
4. Try refreshing Expo Snack page
5. Clear browser cache and try again

## Visual Reference

Your Snack sidebar should look like this:

```
📁 My Snack
  📄 App.js
  📄 package.json
  📁 screens
    📄 StockListScreen.js
    📄 StockDetailScreen.js
    📄 NewsSummaryScreen.js
  📁 components
    📄 StockChart.js
  📁 services
    📄 finnhubAPI.js
    📄 alphaVantageAPI.js
    📄 marketauxAPI.js
    📄 perplexityAPI.js
  📁 utils
    📄 theme.js
    📄 formatters.js
  📁 data
    📄 sp100.json
```

---

**Ready to upload? Go to https://snack.expo.dev/ and follow these steps!**

Your app will be live in 5 minutes! 🚀
