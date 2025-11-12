import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../utils/theme';
import { getEarningsInsights } from '../../services/perplexityAPI';

const EarningsTab = ({ symbol, name, financials, overview }) => {
  const [loading, setLoading] = useState(true);
  const [earningsInsights, setEarningsInsights] = useState([]);

  const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (normalized === '') return null;
      const numeric = Number(normalized);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  };

  const metrics = financials?.metric || {};
  const eps = parseNumber(overview?.EPS ?? metrics['epsBasicExclExtraItemsTTM']);
  const peRatio = parseNumber(overview?.PERatio ?? metrics['peBasicExclExtraTTM']);
  const revenuePerShare = parseNumber(metrics['revenuePerShareTTM']);
  const quarterlyEarningsGrowth = parseNumber(overview?.QuarterlyEarningsGrowthYOY);
  const quarterlyRevenueGrowth = parseNumber(overview?.QuarterlyRevenueGrowthYOY ?? metrics['revenueGrowthTTMYoy']);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const insights = await getEarningsInsights(symbol, name, 'upcoming');
        setEarningsInsights(insights);
      } catch (error) {
        console.error('Error fetching earnings insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [symbol, name]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Earnings Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings Metrics</Text>
        <View style={styles.metricsCard}>
          {eps !== null && (
            <MetricRow label="EPS (TTM)" value={`$${eps.toFixed(2)}`} />
          )}
          {peRatio !== null && (
            <MetricRow label="P/E Ratio (TTM)" value={peRatio.toFixed(2)} />
          )}
          {revenuePerShare !== null && (
            <MetricRow label="Revenue Per Share" value={`$${revenuePerShare.toFixed(2)}`} />
          )}
        </View>
      </View>

      {/* Growth Metrics */}
      {(quarterlyEarningsGrowth !== null || quarterlyRevenueGrowth !== null) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth (Year-over-Year)</Text>
          <View style={styles.metricsCard}>
            {quarterlyEarningsGrowth !== null && (
              <MetricRow
                label="Quarterly Earnings Growth"
                value={`${(quarterlyEarningsGrowth * 100).toFixed(2)}%`}
                isGrowth
                growthValue={quarterlyEarningsGrowth}
              />
            )}
            {quarterlyRevenueGrowth !== null && (
              <MetricRow
                label="Quarterly Revenue Growth"
                value={`${(quarterlyRevenueGrowth * 100).toFixed(2)}%`}
                isGrowth
                growthValue={quarterlyRevenueGrowth}
              />
            )}
          </View>
        </View>
      )}

      {/* AI Insights */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading earnings insights...</Text>
        </View>
      ) : earningsInsights.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Analysis</Text>
          <View style={styles.insightsContainer}>
            {earningsInsights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <View style={styles.bulletPoint} />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
};

const MetricRow = ({ label, value, isGrowth, growthValue }) => {
  const getGrowthColor = () => {
    if (!isGrowth || growthValue === null) return theme.colors.text;
    return growthValue >= 0 ? theme.colors.success : theme.colors.error;
  };

  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: getGrowthColor() }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metricsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metricLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  metricValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  insightsContainer: {
    gap: theme.spacing.sm,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    marginRight: theme.spacing.sm,
  },
  insightText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
});

export default EarningsTab;

