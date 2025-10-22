import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-wagmi-charts';
import { theme } from '../utils/theme';
import { generateEnhancedChartData } from '../services/mockChartData';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

export default function StockChart({ symbol, chartType = 'line', timeRange = '1D' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadChartData = () => {
      if (!isActive) return;

      setLoading(true);

      // Generate realistic mock data immediately
      // This ensures charts always work, even without API access
      try {
        const chartData = generateEnhancedChartData(symbol, timeRange);

        // Validate data structure
        if (!chartData || chartData.length === 0) {
          throw new Error('No chart data generated');
        }

        // Ensure all values are valid numbers
        const validatedData = chartData.map(point => ({
          timestamp: point.timestamp,
          value: Number(point.value) || 0,
          open: Number(point.open) || 0,
          high: Number(point.high) || 0,
          low: Number(point.low) || 0,
          close: Number(point.close) || 0,
        }));

        if (isActive) {
          setData(validatedData);
          console.log(`Chart loaded for ${symbol} (${timeRange}): ${validatedData.length} points`);
        }
      } catch (error) {
        console.error(`Error generating chart for ${symbol}:`, error);
        // Set empty data to show error message
        if (isActive) {
          setData([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    // Small delay to simulate loading (makes it feel more real)
    const timer = setTimeout(loadChartData, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
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
  const changePercent = ((lastValue - firstValue) / firstValue) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <Text style={[styles.changeText, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}% {timeRange}
        </Text>
      </View>

      {chartType === 'line' ? (
        <LineChart.Provider data={data}>
          <LineChart width={CHART_WIDTH} height={220}>
            <LineChart.Path
              color={isPositive ? theme.colors.success : theme.colors.error}
              width={2}
            />
            <LineChart.CursorCrosshair>
              <LineChart.Tooltip
                textStyle={styles.tooltipText}
                style={styles.tooltip}
              />
            </LineChart.CursorCrosshair>
          </LineChart>
          <LineChart.PriceText
            style={styles.priceText}
            format={({ value }) => {
              const price = typeof value === 'number' ? value : parseFloat(value) || 0;
              return `$${price.toFixed(2)}`;
            }}
          />
          <LineChart.DatetimeText
            style={styles.dateText}
            format={({ value }) => {
              const date = new Date(value);
              if (timeRange === '1D') {
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              }
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />
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
            format={({ value }) => {
              const price = typeof value === 'number' ? value : parseFloat(value) || 0;
              return `$${price.toFixed(2)}`;
            }}
          />
          <CandlestickChart.DatetimeText
            style={styles.dateText}
            format={({ value }) => {
              const date = new Date(value);
              if (timeRange === '1D') {
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              }
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />
        </CandlestickChart.Provider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    paddingVertical: theme.spacing.md,
  },
  loadingContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  changeText: {
    ...theme.typography.body,
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
