import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { getTechnicalAnalysisInsights } from '../../services/perplexityAPI';
import { getRSI, getSMA } from '../../services/alphaVantageAPI';
import StockChart from '../StockChart';
import { getAvailableIndicators } from '../../utils/technicalIndicators';

const TIME_RANGES = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

const TechnicalsTab = ({ symbol, name, currentPrice, chartType, timeRange, selectedIndicators, onChartTypeChange, onTimeRangeChange, setSelectedIndicators, showIndicators, setShowIndicators }) => {
  const [loading, setLoading] = useState(true);
  const [technicalData, setTechnicalData] = useState({
    rsi: null,
    sma20: null,
    sma50: null,
    aiInsights: null,
  });

  useEffect(() => {
    const fetchTechnicals = async () => {
      setLoading(true);
      try {
        const [rsiData, sma20Data, sma50Data, aiInsights] = await Promise.all([
          getRSI(symbol, 'daily', 14),
          getSMA(symbol, 'daily', 20),
          getSMA(symbol, 'daily', 50),
          getTechnicalAnalysisInsights(symbol, name, currentPrice),
        ]);

        setTechnicalData({
          rsi: rsiData,
          sma20: sma20Data,
          sma50: sma50Data,
          aiInsights: aiInsights,
        });
      } catch (error) {
        console.error('Error fetching technicals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicals();
  }, [symbol, name, currentPrice]);

  // Parse RSI value from Alpha Vantage data
  const getRSIValue = () => {
    if (!technicalData.rsi || !technicalData.rsi['Technical Analysis: RSI']) {
      return null;
    }
    const dates = Object.keys(technicalData.rsi['Technical Analysis: RSI']);
    if (dates.length === 0) return null;
    const latestDate = dates[0];
    const rsiValue = parseFloat(technicalData.rsi['Technical Analysis: RSI'][latestDate]['RSI']);
    return Number.isFinite(rsiValue) ? rsiValue : null;
  };

  // Parse SMA value from Alpha Vantage data
  const getSMAValue = (smaData) => {
    if (!smaData || !smaData['Technical Analysis: SMA']) {
      return null;
    }
    const dates = Object.keys(smaData['Technical Analysis: SMA']);
    if (dates.length === 0) return null;
    const latestDate = dates[0];
    const smaValue = parseFloat(smaData['Technical Analysis: SMA'][latestDate]['SMA']);
    return Number.isFinite(smaValue) ? smaValue : null;
  };

  // Determine signal based on RSI
  const getRSISignal = (rsi) => {
    if (rsi === null) return 'Neutral';
    if (rsi > 70) return 'Sell';
    if (rsi < 30) return 'Buy';
    return 'Neutral';
  };

  // Determine signal based on price vs SMA
  const getSMASignal = (sma) => {
    if (sma === null || !currentPrice) return 'Neutral';
    if (currentPrice > sma * 1.02) return 'Buy';
    if (currentPrice < sma * 0.98) return 'Sell';
    return 'Neutral';
  };

  // Calculate overall summary
  const getOverallSummary = () => {
    const rsi = getRSIValue();
    const sma20 = getSMAValue(technicalData.sma20);
    const sma50 = getSMAValue(technicalData.sma50);

    const signals = [
      getRSISignal(rsi),
      getSMASignal(sma20),
      getSMASignal(sma50),
    ];

    const buyCount = signals.filter(s => s === 'Buy').length;
    const sellCount = signals.filter(s => s === 'Sell').length;
    const neutralCount = signals.filter(s => s === 'Neutral').length;

    if (buyCount >= 2) return { signal: 'Strong Buy', color: theme.colors.success };
    if (buyCount > sellCount) return { signal: 'Buy', color: theme.colors.success };
    if (sellCount >= 2) return { signal: 'Strong Sell', color: theme.colors.error };
    if (sellCount > buyCount) return { signal: 'Sell', color: theme.colors.error };
    return { signal: 'Neutral', color: theme.colors.textSecondary };
  };

  const rsiValue = getRSIValue();
  const sma20Value = getSMAValue(technicalData.sma20);
  const sma50Value = getSMAValue(technicalData.sma50);
  const summary = getOverallSummary();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Technical Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technical Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Overall Signal</Text>
          <Text style={[styles.summarySignal, { color: summary.color }]}>
            {summary.signal}
          </Text>
        </View>
      </View>

      {/* Chart Controls */}
      <View style={styles.chartControlsContainer}>
        <View style={styles.chartTypeButtons}>
          <TouchableOpacity
            style={[styles.chartTypeButton, chartType === 'line' && styles.chartTypeButtonActive]}
            onPress={() => onChartTypeChange('line')}
          >
            <Text
              style={[
                styles.chartTypeButtonText,
                chartType === 'line' && styles.chartTypeButtonTextActive,
              ]}
            >
              Line
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              chartType === 'candle' && styles.chartTypeButtonActive,
            ]}
            onPress={() => onChartTypeChange('candle')}
          >
            <Text
              style={[
                styles.chartTypeButtonText,
                chartType === 'candle' && styles.chartTypeButtonTextActive,
              ]}
            >
              Candle
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.indicatorsButton}
          onPress={() => setShowIndicators(!showIndicators)}
        >
          <Ionicons
            name="analytics-outline"
            size={18}
            color={selectedIndicators.length > 0 ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[
            styles.indicatorsButtonText,
            selectedIndicators.length > 0 && styles.indicatorsButtonTextActive
          ]}>
            Indicators{selectedIndicators.length > 0 ? ` (${selectedIndicators.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {showIndicators && (
        <View style={styles.indicatorSelector}>
          <Text style={styles.indicatorSelectorTitle}>Technical Indicators</Text>
          <View style={styles.indicatorGrid}>
            {getAvailableIndicators().map((indicator) => {
              const isSelected = selectedIndicators.includes(indicator.id);
              return (
                <TouchableOpacity
                  key={indicator.id}
                  style={[
                    styles.indicatorChip,
                    isSelected && styles.indicatorChipActive
                  ]}
                  onPress={() => {
                    setSelectedIndicators((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== indicator.id)
                        : [...prev, indicator.id]
                    );
                  }}
                >
                  <View style={[styles.indicatorColorDot, { backgroundColor: indicator.color }]} />
                  <Text style={[
                    styles.indicatorChipText,
                    isSelected && styles.indicatorChipTextActive
                  ]}>
                    {indicator.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartSection}>
        <StockChart
          symbol={symbol}
          chartType={chartType}
          timeRange={timeRange}
          selectedIndicators={selectedIndicators}
        />
      </View>

      {/* Time Range Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.timeRangeContainer}
        contentContainerStyle={styles.timeRangeContent}
      >
        {TIME_RANGES.map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive,
            ]}
            onPress={() => onTimeRangeChange(range)}
          >
            <Text
              style={[
                styles.timeRangeButtonText,
                timeRange === range && styles.timeRangeButtonTextActive,
              ]}
            >
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Oscillators */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Oscillators</Text>
        <View style={styles.indicatorsContainer}>
          <IndicatorRow
            label="RSI (14)"
            value={rsiValue !== null ? rsiValue.toFixed(2) : 'N/A'}
            signal={getRSISignal(rsiValue)}
          />
        </View>
      </View>

      {/* Moving Averages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moving Averages</Text>
        <View style={styles.indicatorsContainer}>
          <IndicatorRow
            label="SMA (20)"
            value={sma20Value !== null ? `$${sma20Value.toFixed(2)}` : 'N/A'}
            signal={getSMASignal(sma20Value)}
          />
          <IndicatorRow
            label="SMA (50)"
            value={sma50Value !== null ? `$${sma50Value.toFixed(2)}` : 'N/A'}
            signal={getSMASignal(sma50Value)}
          />
        </View>
      </View>

      {/* AI Insights */}
      {technicalData.aiInsights && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Technical Analysis</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>{technicalData.aiInsights}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const IndicatorRow = ({ label, value, signal }) => {
  const getSignalColor = (signal) => {
    if (signal === 'Buy') return theme.colors.success;
    if (signal === 'Sell') return theme.colors.error;
    return theme.colors.textSecondary;
  };

  return (
    <View style={styles.indicatorRow}>
      <Text style={styles.indicatorLabel}>{label}</Text>
      <View style={styles.indicatorRight}>
        <Text style={styles.indicatorValue}>{value}</Text>
        <View style={[styles.signalBadge, { backgroundColor: getSignalColor(signal) + '20' }]}>
          <Text style={[styles.signalText, { color: getSignalColor(signal) }]}>
            {signal}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  section: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  chartSection: {
    marginBottom: theme.spacing.sm,
  },
  chartControlsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.md,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    flex: 1,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  chartTypeButtonActive: {
    backgroundColor: theme.colors.background,
  },
  chartTypeButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chartTypeButtonTextActive: {
    color: theme.colors.text,
  },
  indicatorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  indicatorsButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  indicatorsButtonTextActive: {
    color: theme.colors.primary,
  },
  indicatorSelector: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  indicatorSelectorTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  indicatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  indicatorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  indicatorChipActive: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  indicatorColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  indicatorChipTextActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  timeRangeContainer: {
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeRangeContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  timeRangeButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  timeRangeButtonTextActive: {
    color: theme.colors.background,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  summaryLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  summarySignal: {
    ...theme.typography.h2,
    fontWeight: '700',
  },
  indicatorsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  indicatorLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  indicatorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  indicatorValue: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  signalBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  signalText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  insightText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
});

export default TechnicalsTab;

