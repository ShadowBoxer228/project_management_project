import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { usePortfolio } from '../context/PortfolioContext';
import PortfolioStats from '../components/PortfolioStats';
import { theme } from '../utils/theme';
import { PieChart } from 'react-native-gifted-charts';

const FINNHUB_API_KEY = 'd3scib9r01qs1aps7j90d3scib9r01qs1aps7j9g';

/**
 * PortfolioStatisticsScreen Component
 * Shows portfolio statistics, pie charts, and analytics
 */
const PortfolioStatisticsScreen = ({ navigation }) => {
  const { holdings, refreshPortfolio, quotes, quotesLoading, getCurrentPrice } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [companyProfiles, setCompanyProfiles] = useState({});

  useEffect(() => {
    if (holdings.length > 0) {
      fetchCompanyProfiles();
    }
  }, [holdings]);

  /**
   * Fetch company profiles for sector allocation
   */
  const fetchCompanyProfiles = async () => {
    if (holdings.length === 0) return;

    try {
      const profiles = {};

      await Promise.all(
        holdings.map(async (holding) => {
          try {
            const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${holding.symbol}&token=${FINNHUB_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.finnhubIndustry) {
              profiles[holding.symbol] = data;
            }
          } catch (error) {
            if (__DEV__) {
              console.log(`Failed to fetch profile for ${holding.symbol}`);
            }
          }
        })
      );

      setCompanyProfiles(profiles);
    } catch (error) {
      console.error('Error fetching company profiles:', error);
    }
  };

  /**
   * Handle refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshPortfolio(),
      fetchCompanyProfiles(),
    ]);
    setRefreshing(false);
  };

  /**
   * Calculate sector allocation for pie chart
   */
  const calculateSectorAllocation = () => {
    if (holdings.length === 0) return [];

    const sectorMap = {};
    let totalValue = 0;

    holdings.forEach(holding => {
      const currentPrice = getCurrentPrice(holding.symbol) || holding.purchasePrice;
      const value = holding.shares * currentPrice;
      totalValue += value;

      const profile = companyProfiles[holding.symbol];
      const sector = profile?.finnhubIndustry || 'Other';

      if (sectorMap[sector]) {
        sectorMap[sector] += value;
      } else {
        sectorMap[sector] = value;
      }
    });

    // Define colors for different sectors
    const colors = ['#4A90E2', '#50C878', '#FF6B6B', '#FFD700', '#9B59B6', '#FF8C42', '#3ABFF8', '#F472B6'];

    return Object.entries(sectorMap)
      .sort((a, b) => b[1] - a[1])
      .map(([sector, value], index) => ({
        value: Math.round((value / totalValue) * 100),
        label: sector,
        color: colors[index % colors.length],
        text: `${Math.round((value / totalValue) * 100)}%`,
      }));
  };

  /**
   * Calculate stock distribution for pie chart
   */
  const calculateStockDistribution = () => {
    if (holdings.length === 0) return [];

    let totalValue = 0;
    const stockValues = holdings.map(holding => {
      const currentPrice = getCurrentPrice(holding.symbol) || holding.purchasePrice;
      const value = holding.shares * currentPrice;
      totalValue += value;
      return { symbol: holding.symbol, value };
    });

    // Define colors for different stocks
    const colors = ['#4A90E2', '#50C878', '#FF6B6B', '#FFD700', '#9B59B6', '#FF8C42', '#3ABFF8', '#F472B6', '#A78BFA', '#FB923C'];

    return stockValues
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 holdings
      .map((stock, index) => ({
        value: Math.round((stock.value / totalValue) * 100),
        label: stock.symbol,
        color: colors[index % colors.length],
        text: `${Math.round((stock.value / totalValue) * 100)}%`,
      }));
  };

  // Convert quotes to simple prices map
  const prices = {};
  Object.keys(quotes).forEach(symbol => {
    const quote = quotes[symbol];
    if (quote && quote.c) {
      prices[symbol] = quote.c;
    }
  });

  const sectorData = calculateSectorAllocation();
  const stockData = calculateStockDistribution();

  // Empty state
  if (holdings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Add stocks to see statistics</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Sector Allocation Pie Chart */}
        {sectorData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Sector Allocation</Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={sectorData}
                donut
                radius={100}
                innerRadius={60}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelText}>Sectors</Text>
                    <Text style={styles.centerLabelValue}>{sectorData.length}</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legend}>
              {sectorData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={styles.legendValue}>{item.value}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stock Distribution Pie Chart */}
        {stockData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Stock Distribution</Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={stockData}
                donut
                radius={100}
                innerRadius={60}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelText}>Stocks</Text>
                    <Text style={styles.centerLabelValue}>{holdings.length}</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legend}>
              {stockData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={styles.legendValue}>{item.value}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Detailed Statistics */}
        <PortfolioStats
          holdings={holdings}
          prices={prices}
          companyProfiles={companyProfiles}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  centerLabelValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  legend: {
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: theme.spacing.sm,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});

export default PortfolioStatisticsScreen;
