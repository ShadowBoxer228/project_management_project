import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../utils/theme';
import { getAnalystRatingInsights } from '../../services/perplexityAPI';

const AnalystRatingTab = ({ symbol, name, currentPrice }) => {
  const [loading, setLoading] = useState(true);
  const [analystData, setAnalystData] = useState(null);

  useEffect(() => {
    const fetchAnalystData = async () => {
      setLoading(true);
      try {
        const data = await getAnalystRatingInsights(symbol, name, currentPrice);
        setAnalystData(data);
      } catch (error) {
        console.error('Error fetching analyst data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalystData();
  }, [symbol, name, currentPrice]);

  const getConsensusColor = (consensus) => {
    const lower = consensus?.toLowerCase() || '';
    if (lower.includes('strong buy')) return theme.colors.success;
    if (lower.includes('buy')) return theme.colors.success;
    if (lower.includes('sell')) return theme.colors.error;
    return theme.colors.textSecondary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!analystData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Unable to load analyst ratings</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Consensus Rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyst Consensus</Text>
        <View style={styles.consensusCard}>
          <Text style={styles.consensusLabel}>Overall Rating</Text>
          <Text style={[styles.consensusValue, { color: getConsensusColor(analystData.consensus) }]}>
            {analystData.consensus}
          </Text>
        </View>
      </View>

      {/* Rating Breakdown */}
      {analystData.ratingBreakdown && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating Distribution</Text>
          <View style={styles.card}>
            <Text style={styles.breakdownText}>{analystData.ratingBreakdown}</Text>
          </View>
        </View>
      )}

      {/* Price Target */}
      {analystData.priceTarget && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12-Month Price Target</Text>
          <View style={styles.priceTargetCard}>
            <View style={styles.priceTargetRow}>
              <Text style={styles.priceTargetLabel}>Average Target</Text>
              <Text style={styles.priceTargetValue}>{analystData.priceTarget}</Text>
            </View>
            {currentPrice && (
              <View style={styles.priceTargetRow}>
                <Text style={styles.priceTargetLabel}>Current Price</Text>
                <Text style={styles.priceTargetValue}>${currentPrice.toFixed(2)}</Text>
              </View>
            )}
            {analystData.priceTargetHigh && analystData.priceTargetLow && currentPrice && (
              <View style={styles.priceTargetRow}>
                <Text style={styles.priceTargetLabel}>Upside Potential</Text>
                <Text style={[
                  styles.priceTargetValue,
                  { color: ((analystData.priceTargetHigh + analystData.priceTargetLow) / 2) > currentPrice ? theme.colors.success : theme.colors.error }
                ]}>
                  {(((((analystData.priceTargetHigh + analystData.priceTargetLow) / 2) - currentPrice) / currentPrice) * 100).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Key Points */}
      {analystData.keyPoints && analystData.keyPoints.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Analyst Views</Text>
          <View style={styles.keyPointsContainer}>
            {analystData.keyPoints.map((point, index) => (
              <View key={index} style={styles.keyPointCard}>
                <View style={styles.bulletPoint} />
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
  consensusCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  consensusLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  consensusValue: {
    ...theme.typography.h2,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  breakdownText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  priceTargetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  priceTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  priceTargetLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  priceTargetValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  keyPointsContainer: {
    gap: theme.spacing.sm,
  },
  keyPointCard: {
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
  keyPointText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
});

export default AnalystRatingTab;

