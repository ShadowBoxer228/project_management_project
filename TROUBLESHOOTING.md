# Troubleshooting Guide

## Problem: Prices Showing "N/A"

If you see "N/A" instead of stock prices, follow these steps:

### Step 1: Check Where You're Running

**Are you testing on Web Preview in Expo Snack?**

❌ **WEB PREVIEW HAS CORS ISSUES**

Finnhub API blocks requests from browser origins for security. This is a **browser limitation**, not an app issue.

✅ **SOLUTION: Test on Mobile Device**

The app works perfectly on actual phones!

1. Install **Expo Go** app:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. In Expo Snack, find the **QR code** on the right side

3. Open Expo Go → Tap "Scan QR Code"

4. Scan the code → App loads on your phone

5. Prices will load correctly! ✅

### Step 2: Check Console for Errors

Open browser console (F12) and look for:

**CORS Error:**
```
Access to fetch at 'https://finnhub.io/api/v1/quote'
from origin 'https://snack.expo.dev' has been blocked by CORS policy
```

**Solution:** This confirms CORS issue. Use mobile device instead.

**429 Too Many Requests:**
```
HTTP error for AAPL: 429
```

**Solution:** You hit rate limit. Wait 1 minute and try pull-to-refresh.

**401 Unauthorized:**
```
HTTP error for AAPL: 401
```

**Solution:** API key is invalid. Check `services/finnhubAPI.js` line 1.

### Step 3: Verify API Key

Test your Finnhub API key directly in browser:

```
https://finnhub.io/api/v1/quote?symbol=AAPL&token=d3scib9r01qs1aps7j90d3scib9r01qs1aps7j9g
```

**Expected Response:**
```json
{
  "c": 262.77,
  "d": 0.53,
  "dp": 0.2021,
  "h": 265.29,
  "l": 261.83,
  "o": 261.88,
  "pc": 262.24,
  "t": 1761076800
}
```

If you see this JSON, your API key works! ✅

If you see `{"error":"..."}`, your API key is invalid.

### Step 4: Quick Fixes

#### Fix 1: Reduce Stock Count

Loading 100 stocks at once can trigger rate limits.

Edit `data/sp100.json` - keep only first 10 stocks:

```json
[
  { "symbol": "AAPL", "name": "Apple Inc." },
  { "symbol": "MSFT", "name": "Microsoft Corporation" },
  { "symbol": "GOOGL", "name": "Alphabet Inc. Class A" },
  { "symbol": "AMZN", "name": "Amazon.com Inc." },
  { "symbol": "NVDA", "name": "NVIDIA Corporation" },
  { "symbol": "META", "name": "Meta Platforms Inc." },
  { "symbol": "TSLA", "name": "Tesla Inc." },
  { "symbol": "JPM", "name": "JPMorgan Chase & Co." },
  { "symbol": "V", "name": "Visa Inc." },
  { "symbol": "UNH", "name": "UnitedHealth Group Inc." }
]
```

Upload new version to Snack.

#### Fix 2: Add Delay Between Requests

The app already adds random delays (0-500ms) between requests to prevent rate limiting.

If still having issues, edit `screens/StockListScreen.js` line 43:

```javascript
// Change from:
const delay = Math.floor(Math.random() * 500);

// To (longer delay):
const delay = Math.floor(Math.random() * 2000);
```

#### Fix 3: Use Mock Data for Testing

Create `services/mockData.js`:

```javascript
export const getMockQuote = (symbol) => {
  const basePrice = Math.random() * 200 + 50;
  const change = (Math.random() - 0.5) * 10;

  return {
    c: basePrice,
    d: change,
    dp: (change / basePrice) * 100,
    h: basePrice + 5,
    l: basePrice - 5,
    o: basePrice + (Math.random() - 0.5) * 2,
    pc: basePrice - change,
    t: Date.now() / 1000
  };
};
```

Then in `screens/StockListScreen.js`:

```javascript
// At top:
import { getMockQuote } from '../services/mockData';

// In fetchQuote function:
const data = await getQuote(item.symbol);
// If no data, use mock:
if (!data) {
  console.log(`Using mock data for ${item.symbol}`);
  const mockData = getMockQuote(item.symbol);
  if (isMounted) {
    setQuote(mockData);
  }
  return;
}
```

### Step 5: Check Network Tab

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Refresh app
4. Filter by "quote"
5. Click on a request
6. Check:
   - Status code (should be 200)
   - Response (should have `{"c":...}`)

### Step 6: Enable Debug Logging

Console logs are already enabled in the code.

Check Expo Snack console (bottom panel) for messages like:

```
Fetching quote for AAPL...
AAPL response: {c: 262.77, d: 0.53, ...}
```

If you see `AAPL response: null`, the API call failed.

## Common Issues & Solutions

### Issue: All Stocks Show "N/A"

**Cause:** CORS blocking web requests

**Solution:** Test on mobile device with Expo Go app

### Issue: Some Stocks Show "N/A"

**Cause:** Invalid symbol or API doesn't have data

**Solution:** Normal - some symbols might not be available

### Issue: Spinning loader forever

**Cause:** Network request timeout or API down

**Solution:**
- Check internet connection
- Try pull-to-refresh
- Restart app

### Issue: "429 Too Many Requests"

**Cause:** Hit Finnhub rate limit (60 calls/min)

**Solution:**
- Wait 1 minute
- Reduce stock list to 20-30 stocks
- The random delay helps, but 100 stocks is still a lot

### Issue: Prices load then disappear

**Cause:** Component re-rendering or cache issue

**Solution:** Already fixed with `isMounted` check in code

## Testing Checklist

- [ ] Test on **mobile device** (not web)
- [ ] Check console for CORS errors
- [ ] Verify API key works (test URL in browser)
- [ ] Reduce to 10 stocks for testing
- [ ] Wait 30 seconds for first load
- [ ] Try pull-to-refresh
- [ ] Check Network tab in DevTools

## Why Web Preview Doesn't Work

### CORS Policy

Finnhub (and most financial APIs) block browser requests because:

1. **Security**: Prevent unauthorized sites from using your API key
2. **Abuse Prevention**: Bots can't scrape data from browsers
3. **API Key Protection**: Keys could be stolen from browser source

### Mobile Apps Don't Have CORS

React Native apps run natively, not in a browser, so:

✅ No CORS restrictions
✅ Direct HTTP requests work
✅ All APIs work normally

### Solution

**Always test stock market APIs on mobile devices.**

Web preview is only for testing UI/layout, not API calls.

## Final Recommendation

### For Development:
1. Use Expo Go on your phone
2. Reduce stock list to 10-20 stocks
3. Test all features on mobile

### For Production:
1. Build standalone app with EAS
2. Full 100 stock list works fine
3. Deploy to App Store / Play Store

## Still Having Issues?

1. **Verify API key** - Test in browser URL
2. **Check rate limits** - Wait 1 minute between tests
3. **Use mobile device** - Web preview won't work for APIs
4. **Check console logs** - See what errors appear
5. **Try mock data** - Test UI while debugging API

## Quick Test Script

Run this in your browser console while on Expo Snack:

```javascript
fetch('https://finnhub.io/api/v1/quote?symbol=AAPL&token=d3scib9r01qs1aps7j90d3scib9r01qs1aps7j9g')
  .then(r => r.json())
  .then(d => console.log('API works!', d))
  .catch(e => console.error('API failed:', e));
```

If you see "API works!" → API key is fine, CORS is the issue
If you see "API failed:" → API key or network issue

---

## Summary

**Problem:** Prices showing "N/A"

**Root Cause:** CORS blocking web requests from Expo Snack

**Solution:** ✅ Test on mobile device with Expo Go app

**Result:** Prices will load perfectly on your phone!

The app code is correct. This is a browser security limitation, not a bug.
