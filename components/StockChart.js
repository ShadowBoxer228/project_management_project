import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { theme } from '../utils/theme';
import { generateEnhancedChartData } from '../services/mockChartData';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;
const CHART_HEIGHT = 220;
const debugLog = (...args) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[StockChart]', ...args);
  }
};

const formatPriceValue = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '$0.00';
  }
  return `$${numericValue.toFixed(2)}`;
};

const formatTimestampValue = (timestamp, range) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  if (range === '1D') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

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
      debugLog('Loading chart data', { symbol, timeRange });

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
          debugLog('Trimmed long dataset', { original: chartData.length, trimmed: validatedData.length });
        }

        if (isActive) {
          setData(validatedData);
          debugLog('Chart data ready', { symbol, timeRange, points: validatedData.length });
        }
      } catch (err) {
        console.error(`Error generating chart for ${symbol}:`, err);
        if (isActive) {
          setError('Unable to load chart data');
          setData([]);
          debugLog('Chart data failed', { symbol, timeRange, error: err?.message });
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

  const { linePath, areaPath, candlesticks, yDomain, latestValue } = React.useMemo(() => {
    if (!data.length) {
      return {
        linePath: '',
        areaPath: '',
        candlesticks: [],
        yDomain: { min: 0, max: 1 },
        latestValue: null,
      };
    }

    const values = data.map((point) => point.value);
    const highValues = data.map((point) => point.high);
    const lowValues = data.map((point) => point.low);

    const minValue = Math.min(...lowValues, ...values);
    const maxValue = Math.max(...highValues, ...values);
    const valueRange = maxValue - minValue || 1;

    const points = data.map((point, index) => {
      const x = data.length === 1 ? CHART_WIDTH / 2 : (index / (data.length - 1)) * CHART_WIDTH;
      const valueY =
        CHART_HEIGHT - ((point.value - minValue) / valueRange) * CHART_HEIGHT;
      const openY = CHART_HEIGHT - ((point.open - minValue) / valueRange) * CHART_HEIGHT;
      const closeY = CHART_HEIGHT - ((point.close - minValue) / valueRange) * CHART_HEIGHT;
      const highY = CHART_HEIGHT - ((point.high - minValue) / valueRange) * CHART_HEIGHT;
      const lowY = CHART_HEIGHT - ((point.low - minValue) / valueRange) * CHART_HEIGHT;

      return {
        x,
        valueY,
        openY,
        closeY,
        highY,
        lowY,
        point,
      };
    });

    const path = points.reduce((acc, current, index) => {
      if (index === 0) {
        return `M ${current.x.toFixed(2)} ${current.valueY.toFixed(2)}`;
      }
      return `${acc} L ${current.x.toFixed(2)} ${current.valueY.toFixed(2)}`;
    }, '');

    const area = `${path} L ${CHART_WIDTH.toFixed(2)} ${CHART_HEIGHT.toFixed(
      2
    )} L 0 ${CHART_HEIGHT.toFixed(2)} Z`;

    const candleWidth = Math.max(3, CHART_WIDTH / Math.max(data.length, 12) * 0.6);
    const candleData = points.map((p) => ({
      x: p.x,
      openY: p.openY,
      closeY: p.closeY,
      highY: p.highY,
      lowY: p.lowY,
      point: p.point,
      isPositive: p.point.close >= p.point.open,
      candleWidth,
    }));

    return {
      linePath: path,
      areaPath: area,
      candlesticks: candleData,
      yDomain: { min: minValue, max: maxValue },
      latestValue: data[data.length - 1],
    };
  }, [data]);

  const { changePercent, isPositive } = getChangeMeta(data);
  debugLog('Render with stats', { symbol, timeRange, points: data.length, changePercent });

  const latestPriceLabel = React.useMemo(() => {
    if (!latestValue) return '';
    const price = formatPriceValue(latestValue.value);
    const formattedTime = formatTimestampValue(latestValue.timestamp, timeRange);
    return `${price} • ${formattedTime}`;
  }, [latestValue, timeRange]);

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

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <Text style={[styles.changeText, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}% {timeRange}
        </Text>
        {latestPriceLabel ? <Text style={styles.priceLabel}>{latestPriceLabel}</Text> : null}
      </View>

      {chartType === 'candle' ? (
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {candlesticks.map((candle, index) => (
            <React.Fragment key={`${candle.point.timestamp}-${index}`}>
              <Line
                x1={candle.x.toFixed(2)}
                y1={candle.highY.toFixed(2)}
                x2={candle.x.toFixed(2)}
                y2={candle.lowY.toFixed(2)}
                stroke={candle.isPositive ? theme.colors.success : theme.colors.error}
                strokeWidth={2}
              />
              <Rect
                x={(candle.x - candle.candleWidth / 2).toFixed(2)}
                y={Math.min(candle.openY, candle.closeY).toFixed(2)}
                width={candle.candleWidth.toFixed(2)}
                height={Math.max(Math.abs(candle.closeY - candle.openY), 2).toFixed(2)}
                fill={candle.isPositive ? theme.colors.success : theme.colors.error}
                opacity={0.8}
                rx={candle.candleWidth * 0.15}
              />
            </React.Fragment>
          ))}
        </Svg>
      ) : (
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Path
            d={areaPath}
            fill={isPositive ? theme.colors.success + '22' : theme.colors.error + '22'}
          />
          <Path
            d={linePath}
            stroke={isPositive ? theme.colors.success : theme.colors.error}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}

      <View style={styles.domainContainer}>
        <Text style={styles.domainText}>{formatPriceValue(yDomain.max)}</Text>
        <Text style={styles.domainText}>{formatPriceValue(yDomain.min)}</Text>
      </View>
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
  priceLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  domainContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  domainText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
