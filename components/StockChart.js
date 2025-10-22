import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-wagmi-charts';
import { theme } from '../utils/theme';
import { getDailyData, getIntradayData } from '../services/alphaVantageAPI';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

const generateMockData = (range, symbol) => {
  const points = range === '1D' ? 78 : range === '1W' ? 7 : range === '1M' ? 30 : range === '3M' ? 90 : range === '1Y' ? 365 : 500;

  // Use symbol to generate consistent but different base prices
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 50 + (symbolHash % 200); // Price between 50-250

  const now = Date.now();
  const interval = range === '1D' ? 300000 : 86400000; // 5min or 1day

  return Array.from({ length: points }, (_, i) => {
    const trend = i * 0.1; // Slight upward trend
    const volatility = (Math.random() - 0.5) * 5;
    const price = basePrice + trend + volatility;
    const dailyVolatility = Math.random() * 4;

    return {
      timestamp: now - (points - i) * interval,
      value: price,
      open: price - dailyVolatility / 2,
      high: price + dailyVolatility,
      low: price - dailyVolatility,
      close: price + (Math.random() - 0.5) * 2,
    };
  });
};

export default function StockChart({ symbol, chartType = 'line', timeRange = '1D' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchChartData = async () => {
      if (!isActive) return;
      setLoading(true);
      setUseMockData(false);

      try {
        let chartData = [];
        let apiSuccess = false;

        // Try to fetch real data
        if (timeRange === '1D') {
          const response = await getIntradayData(symbol, '5min');
          if (isActive && response && response['Time Series (5min)']) {
            const timeSeries = response['Time Series (5min)'];
            chartData = Object.entries(timeSeries)
              .slice(0, 78)
              .reverse()
              .map(([timestamp, values]) => ({
                timestamp: new Date(timestamp).getTime(),
                value: parseFloat(values['4. close']),
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
              }));
            apiSuccess = true;
          }
        } else {
          const response = await getDailyData(symbol);
          if (isActive && response && response['Time Series (Daily)']) {
            const timeSeries = response['Time Series (Daily)'];
            let limit = 7;
            if (timeRange === '1M') limit = 30;
            else if (timeRange === '3M') limit = 90;
            else if (timeRange === '1Y') limit = 365;
            else if (timeRange === 'ALL') limit = 1000;

            chartData = Object.entries(timeSeries)
              .slice(0, limit)
              .reverse()
              .map(([timestamp, values]) => ({
                timestamp: new Date(timestamp).getTime(),
                value: parseFloat(values['4. close']),
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
              }));
            apiSuccess = true;
          }
        }

        // If API failed or returned no data, use mock data
        if (!apiSuccess || chartData.length === 0) {
          console.log(`Using mock data for ${symbol} chart (${timeRange})`);
          chartData = generateMockData(timeRange, symbol);
          setUseMockData(true);
        }

        if (isActive) {
          setData(chartData);
        }
      } catch (error) {
        console.error(`Error fetching chart data for ${symbol}:`, error.message);
        // Use mock data on error
        if (isActive) {
          console.log(`Using mock data for ${symbol} due to error`);
          setData(generateMockData(timeRange, symbol));
          setUseMockData(true);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchChartData();

    return () => {
      isActive = false;
    };
  }, [symbol, timeRange]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading chart...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No chart data available</Text>
      </View>
    );
  }

  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const isPositive = lastValue >= firstValue;

  return (
    <View style={styles.container}>
      {useMockData && (
        <View style={styles.mockBanner}>
          <Text style={styles.mockBannerText}>Demo Data (API unavailable)</Text>
        </View>
      )}
      {chartType === 'line' ? (
        <LineChart.Provider data={data}>
          <LineChart width={CHART_WIDTH} height={220}>
            <LineChart.Path color={isPositive ? theme.colors.success : theme.colors.error} />
            <LineChart.CursorCrosshair>
              <LineChart.Tooltip
                textStyle={styles.tooltipText}
                style={styles.tooltip}
              />
            </LineChart.CursorCrosshair>
          </LineChart>
          <LineChart.PriceText
            style={styles.priceText}
            format={({ value }) => `$${value.toFixed(2)}`}
          />
          <LineChart.DatetimeText style={styles.dateText} />
        </LineChart.Provider>
      ) : (
        <CandlestickChart.Provider data={data}>
          <CandlestickChart width={CHART_WIDTH} height={220}>
            <CandlestickChart.Candles
              positiveColor={theme.colors.success}
              negativeColor={theme.colors.error}
            />
            <CandlestickChart.Crosshair>
              <CandlestickChart.Tooltip
                textStyle={styles.tooltipText}
                style={styles.tooltip}
              />
            </CandlestickChart.Crosshair>
          </CandlestickChart>
          <CandlestickChart.PriceText
            style={styles.priceText}
            format={({ value }) => `$${value.toFixed(2)}`}
          />
          <CandlestickChart.DatetimeText style={styles.dateText} />
        </CandlestickChart.Provider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 250,
    paddingVertical: theme.spacing.md,
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  mockBanner: {
    backgroundColor: theme.colors.warning + '20',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: 8,
  },
  mockBannerText: {
    ...theme.typography.small,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  priceText: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  tooltip: {
    backgroundColor: theme.colors.text,
    padding: 8,
    borderRadius: 6,
  },
  tooltipText: {
    ...theme.typography.caption,
    color: theme.colors.background,
    fontWeight: '600',
  },
});
