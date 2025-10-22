# Debugging Notes – Stock Detail Crash

## Symptom
- Expo Go would close immediately (SIGABRT) when opening a stock detail screen.
- No JavaScript error appeared in Metro; native crash logs showed the top frames inside Reanimated’s UI worklet (`worklets::scheduleOnUI`).
- Metro eventually showed *“Rendered more hooks than during the previous render”* when hooks were rearranged incorrectly.

## Root Cause
- `react-native-wagmi-charts` (with crosshair/cursor tooltips) spins up Reanimated UI worklets that are incompatible with the Expo SDK 54 / Hermes combo used here.
- When the worklet threw, Reanimated aborted the app natively, so React never had a chance to log an error.
- Later, when reworking the chart, hooks (`useMemo`) were declared after early returns, which triggered the *“rendered more hooks”* error.

## Fix Applied
1. **Instrumented Debug Logging**
   - Added `__DEV__` console logs in `App.js`, `StockListScreen.js`, `StockDetailScreen.js`, and `components/StockChart.js`.
   - Installed a global error handler (`ErrorUtils`) and reconfigured the Reanimated logger so any future JS exceptions surface in Metro.

2. **Removed Reanimated-Dependent Features**
   - Stripped out wagmi’s cursor/crosshair tooltips to eliminate the crashing UI worklets.
   - Replaced wagmi’s chart rendering with a lightweight `react-native-svg` implementation (custom path + candlestick drawing).

3. **Hook Order Correction**
   - Moved the chart geometry `useMemo` above the loading/empty-state early returns so React hooks are invoked in the same order every render.

## How to Reproduce / Verify
1. `npx expo start --clear`
2. Launch the project in Expo Go or the simulator.
3. Open any stock detail screen and observe:
   - Chart renders using the new SVG implementation.
   - Metro logs show `[StockChart]` debug entries but no crashes.

## If the Issue Returns
1. **Check for Native Crashes**
   - Use `npx react-native log-ios` (or Console.app) to capture the stack trace.
   - Look for `worklets::scheduleOnUI` or other Reanimated frames.

2. **Confirm the Custom Chart Code Is Present**
   - Ensure `components/StockChart.js` uses `react-native-svg` only.
   - Make sure no wagmi tooltip/crosshair components were reintroduced.

3. **Verify Hook Order**
   - Hooks (`useState`, `useEffect`, `useMemo`) must be declared before any conditional returns.

4. **Future Improvements**
   - If tooltips are required, consider upgrading to a charting library that advertises Expo SDK 54 compatibility or implement a custom touch handler outside Reanimated.

Keeping these notes handy should make it straightforward to diagnose and resolve similar crashes in the future. 👍

