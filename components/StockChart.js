import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-wagmi-charts';
import { theme } from '../utils/theme';
import { generateEnhancedChartData } from '../services/mockChartData';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

const sanitizePoint = (point) => {
  if (!point) return null;

  const timestamp = Number(point.timestamp);
  const value = Number(point.value);
  const open = Number(point.open);
  const high = Number(point.high);
  const low = Number(point.low);
  const close = Number(point.close);

  if (
    !Number.isFinite(timestamp) ||
    !Number.isFinite(value) ||
    !Number.isFinite(open) ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(close)
  ) {
    return null;
  }

  const adjustedHigh = Math.max(high, open, close, low);
  const adjustedLow = Math.min(low, open, close, high);

  if (!Number.isFinite(adjustedHigh) || !Number.isFinite(adjustedLow)) {
    return null;
  }

  return {
    timestamp,
    value,
    open,
    high: adjustedHigh,
    low: adjustedLow,
    close,
  };
};

const getChangeMeta = (series) => {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      changePercent: 0,
      isPositive: true,
    };
  }

  const startValue = series[0]?.value;
  const endValue = series[series.length - 1]?.value ?? startValue;

  const safeStart = Number.isFinite(startValue) && startValue !== 0 ? startValue : null;
  const safeEnd = Number.isFinite(endValue) ? endValue : safeStart ?? 0;

  const percent = safeStart !== null ? ((safeEnd - safeStart) / safeStart) * 100 : 0;

  return {
    changePercent: Number.isFinite(percent) ? percent : 0,
    isPositive: safeEnd >= (safeStart ?? safeEnd),
  };
};

export default function StockChart({ symbol, chartType = 'line', timeRange = '1D' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const loadChartData = () => {
      if (!isActive) return;

      setLoading(true);
      setError(null);

      try {
        const chartData = generateEnhancedChartData(symbol, timeRange);

        if (!chartData || chartData.length === 0) {
          throw new Error('No chart data generated');
        }

        let validatedData = chartData
          .map(sanitizePoint)
          .filter(Boolean)
          .sort((a, b) => a.timestamp - b.timestamp);

        if (!validatedData.length) {
          throw new Error('Invalid chart data after sanitization');
        }

        if (validatedData.length > 600) {
          validatedData = validatedData.slice(validatedData.length - 600);
        }

        if (isActive) {
          setData(validatedData);
        }
      } catch (err) {
        console.error(`Error generating chart for ${symbol}:`, err);
        if (isActive) {
          setError('Unable to load chart data');
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

  const { changePercent, isPositive } = getChangeMeta(data);

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
        <Text style={styles.emptyText}>{error || 'No chart data available'}</Text>
      </View>
    );
  }

  const formatPrice = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return '$0.00';
    }
    return `$${numericValue.toFixed(2)}`;
  };

  const formatTimestamp = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    if (timeRange === '1D') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
          <LineChart.PriceText style={styles.priceText} format={({ value }) => formatPrice(value)} />
          <LineChart.DatetimeText style={styles.dateText} format={({ value }) => formatTimestamp(value)} />
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
            format={({ value }) => formatPrice(value)}
          />
          <CandlestickChart.DatetimeText
            style={styles.dateText}
            format={({ value }) => formatTimestamp(value)}
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
