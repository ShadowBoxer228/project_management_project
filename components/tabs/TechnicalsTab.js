import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../utils/theme';
import { getTechnicalAnalysisInsights } from '../../services/perplexityAPI';
import { getRSI, getSMA } from '../../services/alphaVantageAPI';
import StockChart from '../StockChart';

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

      {/* Chart */}
      <View style={styles.chartSection}>
        <StockChart
          symbol={symbol}
          chartType={chartType}
          timeRange={timeRange}
          selectedIndicators={selectedIndicators}
        />
      </View>

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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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

