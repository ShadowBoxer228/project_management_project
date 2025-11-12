import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../utils/theme';
import { getDividendInsights } from '../../services/perplexityAPI';

const DividendsTab = ({ symbol, name, financials, overview }) => {
  const [loading, setLoading] = useState(true);
  const [dividendInsights, setDividendInsights] = useState([]);

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
  const dividendYield = parseNumber(overview?.DividendYield ?? metrics['dividendYieldIndicatedAnnual']);
  const payoutRatio = parseNumber(overview?.PayoutRatio ?? metrics['payoutRatioTTM']);
  const dividendPerShare = parseNumber(overview?.DividendPerShare ?? metrics['dividendPerShareTTM']);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const insights = await getDividendInsights(symbol, name, dividendYield, dividendPerShare);
        setDividendInsights(insights);
      } catch (error) {
        console.error('Error fetching dividend insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [symbol, name, dividendYield, dividendPerShare]);

  const hasDividendData = dividendYield !== null || dividendPerShare !== null || payoutRatio !== null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Dividend Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dividend Overview</Text>
        {hasDividendData ? (
          <View style={styles.metricsCard}>
            {dividendYield !== null && (
              <MetricRow
                label="Dividend Yield"
                value={`${(dividendYield * 100).toFixed(2)}%`}
              />
            )}
            {dividendPerShare !== null && (
              <MetricRow
                label="Dividend Per Share (Annual)"
                value={`$${dividendPerShare.toFixed(2)}`}
              />
            )}
            {payoutRatio !== null && (
              <MetricRow
                label="Payout Ratio"
                value={`${(payoutRatio * 100).toFixed(2)}%`}
              />
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {symbol} does not currently pay dividends or dividend data is unavailable.
            </Text>
          </View>
        )}
      </View>

      {/* AI Insights */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading dividend insights...</Text>
        </View>
      ) : dividendInsights.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dividend Analysis</Text>
          <View style={styles.insightsContainer}>
            {dividendInsights.map((insight, index) => (
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

const MetricRow = ({ label, value }) => {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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

export default DividendsTab;

