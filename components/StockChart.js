import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-wagmi-charts';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { theme } from '../utils/theme';
import { getAggregates } from '../services/polygonAPI';
import ChartTooltip from './ChartTooltip';
import { getAvailableIndicators } from '../utils/technicalIndicators';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;
const CHART_HEIGHT = 220;
const debugLog = (...args) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[StockChart]', ...args);
  }
};

// Helper to create SVG path from indicator data
function createIndicatorPath(indicatorData, allData, yDomain) {
  if (!indicatorData || !indicatorData.length || !allData.length) {
    return '';
  }

  const minValue = yDomain.min;
  const maxValue = yDomain.max;
  const valueRange = maxValue - minValue || 1;

  // Create a map of timestamps to X positions from the main data
  const timestampToX = new Map();
  allData.forEach((point, index) => {
    const x = allData.length === 1 ? CHART_WIDTH / 2 : (index / (allData.length - 1)) * CHART_WIDTH;
    timestampToX.set(point.timestamp, x);
  });

  // Convert indicator data to SVG path
  const pathPoints = indicatorData
    .map((point) => {
      const x = timestampToX.get(point.timestamp);
      if (x === undefined) return null;

      const y = CHART_HEIGHT - ((point.value - minValue) / valueRange) * CHART_HEIGHT;
      return { x, y };
    })
    .filter(Boolean);

  if (pathPoints.length === 0) return '';

  return pathPoints.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }
    return `${acc} L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, '');
}

// Component to render indicator overlays as SVG
function IndicatorOverlays({ indicators, data, yDomain }) {
  if (!indicators || !indicators.length || !data.length) {
    return null;
  }

  return (
    <Svg
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      style={StyleSheet.absoluteFill}
    >
      {indicators.map((indicator) => {
        // Handle Bollinger Bands specially
        if (indicator.id === 'bollinger') {
          const { upper, middle, lower } = indicator.data;
          const upperPath = createIndicatorPath(upper, data, yDomain);
          const middlePath = createIndicatorPath(middle, data, yDomain);
          const lowerPath = createIndicatorPath(lower, data, yDomain);

          return (
            <React.Fragment key={indicator.id}>
              <SvgPath
                d={upperPath}
                stroke={indicator.color}
                strokeWidth={1}
                fill="none"
                opacity={0.6}
              />
              <SvgPath
                d={middlePath}
                stroke={indicator.color}
                strokeWidth={1.5}
                fill="none"
                opacity={0.8}
              />
              <SvgPath
                d={lowerPath}
                stroke={indicator.color}
                strokeWidth={1}
                fill="none"
                opacity={0.6}
              />
            </React.Fragment>
          );
        }

        // Regular indicator
        const path = createIndicatorPath(indicator.data, data, yDomain);
        return (
          <SvgPath
            key={indicator.id}
            d={path}
            stroke={indicator.color}
            strokeWidth={1.5}
            fill="none"
            opacity={0.8}
          />
        );
      })}
    </Svg>
  );
}

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

export default function StockChart({
  symbol,
  chartType = 'line',
  timeRange = '1D',
  selectedIndicators = []
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gesture handling for zoom and pan
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(0);

  useEffect(() => {
    let isActive = true;

    const loadChartData = async () => {
      if (!isActive) return;

      setLoading(true);
      setError(null);
      debugLog('Loading chart data from Polygon.io', { symbol, timeRange });

      try {
        // Fetch data from polygon.io API
        const chartData = await getAggregates(symbol, timeRange);

        if (!chartData || chartData.length === 0) {
          throw new Error('No chart data available');
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
        console.error(`Error loading chart for ${symbol}:`, err);
        if (isActive) {
          setError(err.message || 'Unable to load chart data');
          setData([]);
          debugLog('Chart data failed', { symbol, timeRange, error: err?.message });
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    // Load data immediately
    loadChartData();

    return () => {
      isActive = false;
    };
  }, [symbol, timeRange]);

  const { yDomain, latestValue } = React.useMemo(() => {
    if (!data.length) {
      return {
        yDomain: { min: 0, max: 1 },
        latestValue: null,
      };
    }

    const values = data.map((point) => point.value);
    const highValues = data.map((point) => point.high);
    const lowValues = data.map((point) => point.low);

    const minValue = Math.min(...lowValues, ...values);
    const maxValue = Math.max(...highValues, ...values);

    return {
      yDomain: { min: minValue, max: maxValue },
      latestValue: data[data.length - 1],
    };
  }, [data]);

  // Calculate technical indicators
  const indicators = React.useMemo(() => {
    if (!data.length || !selectedIndicators.length) {
      return [];
    }

    const availableIndicators = getAvailableIndicators();
    return selectedIndicators
      .map((indicatorId) => {
        const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
        if (!indicator) return null;

        try {
          const calculatedData = indicator.calculate(data);
          return {
            ...indicator,
            data: calculatedData,
          };
        } catch (err) {
          console.error(`Error calculating ${indicator.name}:`, err);
          return null;
        }
      })
      .filter(Boolean);
  }, [data, selectedIndicators]);

  const { changePercent, isPositive } = getChangeMeta(data);
  debugLog('Render with stats', { symbol, timeRange, points: data.length, changePercent });

  const latestPriceLabel = React.useMemo(() => {
    if (!latestValue) return '';
    const price = formatPriceValue(latestValue.value);
    const formattedTime = formatTimestampValue(latestValue.timestamp, timeRange);
    return `${price} • ${formattedTime}`;
  }, [latestValue, timeRange]);

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      baseScale.value = scale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = baseScale.value * event.scale;
      // Limit zoom between 1x and 5x
      scale.value = Math.min(Math.max(newScale, 1), 5);
    })
    .onEnd(() => {
      'worklet';
      baseScale.value = scale.value;
    });

  // Pan gesture for scrolling (only when zoomed)
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart(() => {
      'worklet';
      baseTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      'worklet';
      if (scale.value > 1) {
        const maxTranslate = (CHART_WIDTH * (scale.value - 1)) / 2;
        const newTranslate = baseTranslateX.value + event.translationX;
        // Constrain panning within bounds
        translateX.value = Math.min(Math.max(newTranslate, -maxTranslate), maxTranslate);
      }
    })
    .onEnd(() => {
      'worklet';
      baseTranslateX.value = translateX.value;
    });

  // Compose gestures - pinch takes precedence
  const composedGestures = Gesture.Race(pinchGesture, panGesture);

  // Animated style for the chart container
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
    };
  });

  // Reset zoom function
  const resetZoom = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    baseScale.value = 1;
    baseTranslateX.value = 0;
  };

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

      <View style={styles.chartContainer}>
        <GestureDetector gesture={composedGestures}>
          <Animated.View style={[styles.chartWrapper, animatedStyle]}>
            {chartType === 'candle' ? (
              <CandlestickChart.Provider data={data}>
                <CandlestickChart
                  height={CHART_HEIGHT}
                  width={CHART_WIDTH}
                >
                  <CandlestickChart.Candles
                    positiveColor={theme.colors.success}
                    negativeColor={theme.colors.error}
                  />
                  <CandlestickChart.Crosshair>
                    <CandlestickChart.Tooltip>
                      {({ data: tooltipData }) => (
                        <ChartTooltip
                          data={tooltipData}
                          chartType="candle"
                          timeRange={timeRange}
                        />
                      )}
                    </CandlestickChart.Tooltip>
                  </CandlestickChart.Crosshair>
                </CandlestickChart>
                <CandlestickChart.PriceText
                  style={styles.priceText}
                  precision={2}
                  variant="formatted"
                />
              </CandlestickChart.Provider>
            ) : (
              <LineChart.Provider data={data}>
                <LineChart
                  height={CHART_HEIGHT}
                  width={CHART_WIDTH}
                >
                  <LineChart.Path
                    color={isPositive ? theme.colors.success : theme.colors.error}
                    width={2}
                  >
                    <LineChart.Gradient
                      color={isPositive ? theme.colors.success : theme.colors.error}
                    />
                  </LineChart.Path>
                  <LineChart.CursorCrosshair>
                    <LineChart.Tooltip>
                      {({ data: tooltipData }) => (
                        <ChartTooltip
                          data={tooltipData}
                          chartType="line"
                          timeRange={timeRange}
                        />
                      )}
                    </LineChart.Tooltip>
                  </LineChart.CursorCrosshair>
                  <LineChart.PriceText
                    style={styles.priceText}
                    precision={2}
                    variant="formatted"
                  />
                </LineChart>
              </LineChart.Provider>
            )}
            <IndicatorOverlays
              indicators={indicators}
              data={data}
              yDomain={yDomain}
            />
          </Animated.View>
        </GestureDetector>

        {indicators.length > 0 && (
          <View style={styles.indicatorLegend}>
            {indicators.map((indicator) => (
              <View key={indicator.id} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: indicator.color }]} />
                <Text style={styles.legendText}>{indicator.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.domainContainer}>
          <Text style={styles.domainText}>{formatPriceValue(yDomain.max)}</Text>
          <Text style={styles.domainText}>{formatPriceValue(yDomain.min)}</Text>
        </View>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetZoom}
        >
          <Text style={styles.resetButtonText}>Reset Zoom</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Pinch to zoom • Drag to pan • Tap & hold for details
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  chartContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  chartWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  priceText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  indicatorLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
  },
  legendText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  domainContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  domainText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  resetButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  instructionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  instructionsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
});
