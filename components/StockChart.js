import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-wagmi-charts';
import { theme } from '../utils/theme';
import { getDailyData, getIntradayData } from '../services/alphaVantageAPI';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

const generateMockData = (range) => {
  const points = range === '1D' ? 78 : range === '1W' ? 7 : range === '1M' ? 30 : 90;
  const basePrice = 150;
  const now = Date.now();
  const interval = range === '1D' ? 300000 : 86400000; // 5min or 1day

  return Array.from({ length: points }, (_, i) => {
    const volatility = Math.random() * 10 - 5;
    const price = basePrice + volatility + i * 0.5;
    return {
      timestamp: now - (points - i) * interval,
      value: price,
      open: price + Math.random() * 2 - 1,
      high: price + Math.random() * 3,
      low: price - Math.random() * 3,
      close: price,
    };
  });
};

export default function StockChart({ symbol, chartType = 'line', timeRange = '1D' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchChartData = async () => {
      if (!isActive) return;
      setLoading(true);

      try {
        let chartData = [];

        if (timeRange === '1D') {
          const response = await getIntradayData(symbol, '5min');
          if (!isActive) return;
          if (response && response['Time Series (5min)']) {
            const timeSeries = response['Time Series (5min)'];
            chartData = Object.entries(timeSeries)
              .slice(0, 78) // Last 6.5 hours of trading
              .reverse()
              .map(([timestamp, values]) => ({
                timestamp: new Date(timestamp).getTime(),
                value: parseFloat(values['4. close']),
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
              }));
          }
        } else {
          const response = await getDailyData(symbol);
          if (!isActive) return;
          if (response && response['Time Series (Daily)']) {
            const timeSeries = response['Time Series (Daily)'];
            let limit = 7; // 1W
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
          }
        }

        if (isActive) {
          setData(chartData);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        if (isActive) {
          // Generate mock data for demo purposes
          setData(generateMockData(timeRange));
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
  emptyContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
