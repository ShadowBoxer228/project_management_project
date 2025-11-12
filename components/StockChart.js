import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-wagmi-charts';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
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
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (range === '1W' || range === '1M') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  // For longer ranges, show month and year
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
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

  // Chart interaction mode: 'inspect' for price viewing, 'navigate' for zoom/pan
  const [chartMode, setChartMode] = useState('inspect');

  // Data-level zoom: track visible range as percentages (0-100)
  const [visibleRangePercent, setVisibleRangePercent] = useState({ from: 0, to: 100 });

  // Shared values for gesture handling
  const visibleFrom = useSharedValue(0);
  const visibleTo = useSharedValue(100);
  const baseVisibleFrom = useSharedValue(0);
  const baseVisibleTo = useSharedValue(100);
  const panOffset = useSharedValue(0);
  const basePanOffset = useSharedValue(0);

  // Reset zoom when symbol or time range changes
  useEffect(() => {
    visibleFrom.value = 0;
    visibleTo.value = 100;
    baseVisibleFrom.value = 0;
    baseVisibleTo.value = 100;
    panOffset.value = 0;
    basePanOffset.value = 0;
    setVisibleRangePercent({ from: 0, to: 100 });
  }, [symbol, timeRange, visibleFrom, visibleTo, baseVisibleFrom, baseVisibleTo, panOffset, basePanOffset]);

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

  // Calculate visible data slice based on zoom range
  const visibleData = React.useMemo(() => {
    if (!data || !data.length) return [];

    try {
      const fromIndex = Math.floor((visibleRangePercent.from / 100) * data.length);
      const toIndex = Math.ceil((visibleRangePercent.to / 100) * data.length);

      // Ensure we show at least 10 data points for readability
      const minPoints = Math.min(10, data.length);
      const actualFrom = Math.max(0, Math.min(fromIndex, data.length - minPoints));
      const actualTo = Math.min(data.length, Math.max(toIndex, actualFrom + minPoints));

      const slicedData = data.slice(actualFrom, actualTo);

      // Ensure we return valid data
      return slicedData && slicedData.length > 0 ? slicedData : data;
    } catch (err) {
      console.error('Error slicing visible data:', err);
      return data;
    }
  }, [data, visibleRangePercent]);

  const { yDomain, latestValue } = React.useMemo(() => {
    if (!visibleData.length) {
      return {
        yDomain: { min: 0, max: 1 },
        latestValue: null,
      };
    }

    const values = visibleData.map((point) => point.value);
    const highValues = visibleData.map((point) => point.high);
    const lowValues = visibleData.map((point) => point.low);

    const minValue = Math.min(...lowValues, ...values);
    const maxValue = Math.max(...highValues, ...values);

    return {
      yDomain: { min: minValue, max: maxValue },
      latestValue: data[data.length - 1], // Always show the latest value from full data
    };
  }, [visibleData, data]);

  // Calculate technical indicators on visible data
  const indicators = React.useMemo(() => {
    if (!visibleData || !visibleData.length || !selectedIndicators || !selectedIndicators.length) {
      return [];
    }

    if (!data || !data.length) {
      return [];
    }

    try {
      const availableIndicators = getAvailableIndicators();
      return selectedIndicators
        .map((indicatorId) => {
          const indicator = availableIndicators.find((ind) => ind.id === indicatorId);
          if (!indicator) return null;

          try {
            // Calculate indicators on full data but filter to visible range
            const calculatedData = indicator.calculate(data);
            if (!calculatedData || !calculatedData.length) return null;

            const visibleTimestamps = new Set(visibleData.map(d => d.timestamp));
            const visibleIndicatorData = calculatedData.filter(d => visibleTimestamps.has(d.timestamp));

            return {
              ...indicator,
              data: visibleIndicatorData,
            };
          } catch (err) {
            console.error(`Error calculating ${indicator.name}:`, err);
            return null;
          }
        })
        .filter(Boolean);
    } catch (err) {
      console.error('Error calculating indicators:', err);
      return [];
    }
  }, [data, visibleData, selectedIndicators]);

  const { changePercent, isPositive } = getChangeMeta(data);
  debugLog('Render with stats', { symbol, timeRange, points: data.length, changePercent });

  const latestPriceLabel = React.useMemo(() => {
    if (!latestValue) return '';
    const price = formatPriceValue(latestValue.value);
    const formattedTime = formatTimestampValue(latestValue.timestamp, timeRange);
    return `${price} • ${formattedTime}`;
  }, [latestValue, timeRange]);

  // Helper to update visible range (called from worklet via runOnJS)
  const updateVisibleRange = React.useCallback((from, to) => {
    setVisibleRangePercent({ from, to });
  }, []);

  // Pinch gesture for data-level zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      baseVisibleFrom.value = visibleFrom.value;
      baseVisibleTo.value = visibleTo.value;
    })
    .onUpdate((event) => {
      'worklet';
      // Calculate the current visible range
      const currentRange = baseVisibleTo.value - baseVisibleFrom.value;

      // Zoom in = smaller range (fewer data points), zoom out = larger range (more data points)
      const zoomFactor = 1 / event.scale;
      const newRange = Math.max(5, Math.min(100, currentRange * zoomFactor)); // Min 5%, max 100%

      // Keep the center point fixed while zooming
      const center = (baseVisibleFrom.value + baseVisibleTo.value) / 2;
      const newFrom = Math.max(0, center - newRange / 2);
      const newTo = Math.min(100, center + newRange / 2);

      // Adjust if we hit boundaries
      if (newTo - newFrom < newRange) {
        if (newFrom === 0) {
          visibleFrom.value = 0;
          visibleTo.value = Math.min(100, newRange);
        } else {
          visibleFrom.value = Math.max(0, 100 - newRange);
          visibleTo.value = 100;
        }
      } else {
        visibleFrom.value = newFrom;
        visibleTo.value = newTo;
      }

      // Update React state in real-time for smooth updates
      const from = visibleFrom.value;
      const to = visibleTo.value;
      runOnJS(updateVisibleRange)(from, to);
    })
    .onEnd(() => {
      'worklet';
      baseVisibleFrom.value = visibleFrom.value;
      baseVisibleTo.value = visibleTo.value;
    });

  // Pan gesture for scrolling through data (requires 2 fingers to avoid conflict with crosshair)
  const panGesture = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onStart(() => {
      'worklet';
      basePanOffset.value = panOffset.value;
      baseVisibleFrom.value = visibleFrom.value;
      baseVisibleTo.value = visibleTo.value;
    })
    .onUpdate((event) => {
      'worklet';
      const currentRange = baseVisibleTo.value - baseVisibleFrom.value;

      // Convert pan distance to percentage of data
      const panPercent = (event.translationX / CHART_WIDTH) * currentRange;
      panOffset.value = basePanOffset.value + panPercent;

      // Calculate new visible range
      let newFrom = baseVisibleFrom.value - panPercent;
      let newTo = baseVisibleTo.value - panPercent;

      // Constrain within bounds
      if (newFrom < 0) {
        newFrom = 0;
        newTo = currentRange;
      } else if (newTo > 100) {
        newTo = 100;
        newFrom = 100 - currentRange;
      }

      visibleFrom.value = newFrom;
      visibleTo.value = newTo;

      // Update React state in real-time for smooth updates
      const from = visibleFrom.value;
      const to = visibleTo.value;
      runOnJS(updateVisibleRange)(from, to);
    })
    .onEnd(() => {
      'worklet';
      basePanOffset.value = panOffset.value;
      baseVisibleFrom.value = visibleFrom.value;
      baseVisibleTo.value = visibleTo.value;
    });

  // Compose gestures - allow simultaneous pan and pinch (only in navigate mode)
  const composedGestures = React.useMemo(() => {
    return Gesture.Simultaneous(pinchGesture, panGesture);
  }, [pinchGesture, panGesture]);

  // Reset zoom function
  const resetZoom = () => {
    visibleFrom.value = 0;
    visibleTo.value = 100;
    baseVisibleFrom.value = 0;
    baseVisibleTo.value = 100;
    panOffset.value = 0;
    basePanOffset.value = 0;
    setVisibleRangePercent({ from: 0, to: 100 });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading chart...</Text>
      </View>
    );
  }

  if (!data || data.length === 0 || !visibleData || visibleData.length === 0) {
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
        {chartMode === 'navigate' ? (
          <GestureDetector gesture={composedGestures}>
            <View style={styles.chartWrapper}>
              {chartType === 'candle' ? (
              <CandlestickChart.Provider data={visibleData}>
                <CandlestickChart
                  height={CHART_HEIGHT}
                  width={CHART_WIDTH}
                >
                  <CandlestickChart.Candles
                    positiveColor={theme.colors.success}
                    negativeColor={theme.colors.error}
                  />
                </CandlestickChart>
              </CandlestickChart.Provider>
            ) : (
              <LineChart.Provider data={visibleData}>
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
                </LineChart>
              </LineChart.Provider>
            )}
              <IndicatorOverlays
                indicators={indicators}
                data={visibleData}
                yDomain={yDomain}
              />
            </View>
          </GestureDetector>
        ) : (
          <View style={styles.chartWrapper}>
            {chartType === 'candle' ? (
              <CandlestickChart.Provider data={visibleData}>
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
              <LineChart.Provider data={visibleData}>
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
              data={visibleData}
              yDomain={yDomain}
            />
          </View>
        )}

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

      <View style={styles.timeAxisContainer}>
        {visibleData.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((position, index) => {
          const dataIndex = Math.floor(position * (visibleData.length - 1));
          return (
            <Text key={index} style={styles.timeAxisText}>
              {formatTimestampValue(visibleData[dataIndex].timestamp, timeRange)}
            </Text>
          );
        })}
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.domainContainer}>
          <Text style={styles.domainText}>{formatPriceValue(yDomain.max)}</Text>
          <Text style={styles.domainText}>{formatPriceValue(yDomain.min)}</Text>
        </View>
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeToggleButton, chartMode === 'inspect' && styles.modeToggleButtonActive]}
            onPress={() => setChartMode('inspect')}
          >
            <Text style={[styles.modeToggleText, chartMode === 'inspect' && styles.modeToggleTextActive]}>
              Inspect
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleButton, chartMode === 'navigate' && styles.modeToggleButtonActive]}
            onPress={() => setChartMode('navigate')}
          >
            <Text style={[styles.modeToggleText, chartMode === 'navigate' && styles.modeToggleTextActive]}>
              Navigate
            </Text>
          </TouchableOpacity>
        </View>
        {chartMode === 'navigate' && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetZoom}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {chartMode === 'inspect'
            ? 'Tap & hold to view prices at any point'
            : 'Use 2 fingers to zoom and pan the chart'}
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
  timeAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  timeAxisText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  domainContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  domainText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  modeToggleButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'transparent',
  },
  modeToggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeToggleText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  modeToggleTextActive: {
    color: '#FFFFFF',
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
