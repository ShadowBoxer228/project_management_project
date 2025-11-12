import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import theme from '../utils/theme';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import StockChart from './StockChart';

/**
 * PortfolioStats Component
 * Displays portfolio statistics, sector allocation, and performance chart
 */
const PortfolioStats = ({ holdings, prices, companyProfiles }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStats();
  }, [holdings, prices, companyProfiles]);

  const calculateStats = () => {
    try {
      setLoading(true);

      if (!holdings || holdings.length === 0) {
        setStats({
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          sectorAllocation: [],
          topGainer: null,
          topLoser: null,
        });
        setLoading(false);
        return;
      }

      let totalValue = 0;
      let totalCost = 0;
      const sectorMap = {};
      let topGainer = null;
      let topLoser = null;

      holdings.forEach(holding => {
        const currentPrice = prices[holding.symbol] || holding.purchasePrice;
        const cost = holding.shares * holding.purchasePrice;
        const value = holding.shares * currentPrice;
        const gainLoss = value - cost;
        const gainLossPercent = (gainLoss / cost) * 100;

        totalCost += cost;
        totalValue += value;

        // Track top gainer/loser
        if (!topGainer || gainLossPercent > topGainer.gainLossPercent) {
          topGainer = { symbol: holding.symbol, gainLossPercent, gainLoss };
        }
        if (!topLoser || gainLossPercent < topLoser.gainLossPercent) {
          topLoser = { symbol: holding.symbol, gainLossPercent, gainLoss };
        }

        // Calculate sector allocation
        const profile = companyProfiles[holding.symbol];
        const sector = profile?.finnhubIndustry || 'Other';
        const percentage = (value / totalValue) * 100;

        if (sectorMap[sector]) {
          sectorMap[sector].value += value;
          sectorMap[sector].percentage += percentage;
        } else {
          sectorMap[sector] = {
            sector,
            value,
            percentage,
          };
        }
      });

      // Convert sector map to array and sort by value
      const sectorAllocation = Object.values(sectorMap)
        .sort((a, b) => b.value - a.value)
        .map(sector => ({
          ...sector,
          percentage: (sector.value / totalValue) * 100, // Recalculate for accuracy
        }));

      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      setStats({
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        sectorAllocation,
        topGainer,
        topLoser,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!stats || holdings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Add stocks to see portfolio statistics</Text>
      </View>
    );
  }

  const isPositive = stats.totalGainLoss >= 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Total Value Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Portfolio Value</Text>
        <Text style={styles.totalValue}>{formatCurrency(stats.totalValue)}</Text>
        <View style={styles.gainLossRow}>
          <Text
            style={[
              styles.gainLoss,
              { color: isPositive ? theme.colors.success : theme.colors.danger }
            ]}
          >
            {isPositive ? '+' : ''}{formatCurrency(stats.totalGainLoss)}
          </Text>
          <Text
            style={[
              styles.gainLossPercent,
              { color: isPositive ? theme.colors.success : theme.colors.danger }
            ]}
          >
            ({isPositive ? '+' : ''}{formatPercentage(stats.totalGainLossPercent)})
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Total Cost Basis:</Text>
          <Text style={styles.value}>{formatCurrency(stats.totalCost)}</Text>
        </View>
      </View>

      {/* Top Performers Card */}
      {stats.topGainer && stats.topLoser && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Performers</Text>
          <View style={styles.performerRow}>
            <View style={styles.performerItem}>
              <Text style={styles.performerLabel}>Best</Text>
              <Text style={styles.performerSymbol}>{stats.topGainer.symbol}</Text>
              <Text style={[styles.performerValue, { color: theme.colors.success }]}>
                +{formatPercentage(stats.topGainer.gainLossPercent)}
              </Text>
            </View>
            <View style={styles.performerDivider} />
            <View style={styles.performerItem}>
              <Text style={styles.performerLabel}>Worst</Text>
              <Text style={styles.performerSymbol}>{stats.topLoser.symbol}</Text>
              <Text style={[styles.performerValue, { color: theme.colors.danger }]}>
                {formatPercentage(stats.topLoser.gainLossPercent)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Sector Allocation Card */}
      {stats.sectorAllocation.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sector Allocation</Text>
          {stats.sectorAllocation.map((sector, index) => (
            <View key={index} style={styles.sectorRow}>
              <View style={styles.sectorInfo}>
                <Text style={styles.sectorName}>{sector.sector}</Text>
                <Text style={styles.sectorValue}>{formatCurrency(sector.value)}</Text>
              </View>
              <View style={styles.sectorBarContainer}>
                <View
                  style={[
                    styles.sectorBar,
                    { width: `${sector.percentage}%` }
                  ]}
                />
                <Text style={styles.sectorPercent}>
                  {formatPercentage(sector.percentage)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Diversification Score Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Diversification</Text>
        <View style={styles.diversificationRow}>
          <Text style={styles.label}>Number of Holdings:</Text>
          <Text style={styles.value}>{holdings.length}</Text>
        </View>
        <View style={styles.diversificationRow}>
          <Text style={styles.label}>Sectors:</Text>
          <Text style={styles.value}>{stats.sectorAllocation.length}</Text>
        </View>
        <Text style={styles.diversificationHint}>
          {holdings.length < 5
            ? 'Consider adding more stocks for better diversification'
            : holdings.length < 10
            ? 'Good diversification. Consider expanding to more sectors.'
            : 'Well diversified portfolio!'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  gainLossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  gainLoss: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold,
    marginRight: theme.spacing.xs,
  },
  gainLossPercent: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.medium,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  value: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
  },
  performerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performerItem: {
    flex: 1,
    alignItems: 'center',
  },
  performerDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  performerLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  performerSymbol: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  performerValue: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold,
  },
  sectorRow: {
    marginBottom: theme.spacing.md,
  },
  sectorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  sectorName: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
  },
  sectorValue: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  sectorBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  sectorBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    opacity: 0.7,
  },
  sectorPercent: {
    position: 'absolute',
    right: theme.spacing.sm,
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
  },
  diversificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  diversificationHint: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
});

export default PortfolioStats;
