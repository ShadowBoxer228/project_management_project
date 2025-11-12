import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import PortfolioStockItem from '../components/PortfolioStockItem';
import { theme } from '../utils/theme';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getPortfolioInsights } from '../services/perplexityAPI';

const FINNHUB_API_KEY = 'd3scib9r01qs1aps7j90d3scib9r01qs1aps7j9g';

/**
 * PortfolioHoldingsScreen Component
 * Shows portfolio holdings list and summary
 */
const PortfolioHoldingsScreen = ({ navigation }) => {
  const { holdings, refreshPortfolio, deleteHolding, quotes, quotesLoading, getCurrentPrice } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (holdings.length > 0 && Object.keys(quotes).length > 0) {
      fetchAIInsights();
    }
  }, [holdings, quotes]);

  /**
   * Fetch AI insights for portfolio
   */
  const fetchAIInsights = async () => {
    if (holdings.length === 0) return;

    try {
      setLoadingInsights(true);
      // Convert quotes object to prices object (symbol -> price mapping)
      const pricesMap = {};
      Object.keys(quotes).forEach(symbol => {
        const quote = quotes[symbol];
        if (quote && quote.c) {
          pricesMap[symbol] = quote.c;
        }
      });
      const insights = await getPortfolioInsights(holdings, pricesMap);
      setAiInsights(insights);
    } catch (error) {
      console.error('[PortfolioHoldings] Error fetching AI insights:', error);
      setAiInsights({ error: 'Failed to load insights' });
    } finally {
      setLoadingInsights(false);
    }
  };

  /**
   * Handle refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPortfolio();
    setRefreshing(false);
  };

  /**
   * Handle delete holding
   */
  const handleDelete = async (id) => {
    const success = await deleteHolding(id);
    if (!success) {
      Alert.alert('Error', 'Failed to delete holding');
    }
  };

  /**
   * Handle edit holding
   */
  const handleEdit = (holding) => {
    navigation.navigate('AddEditStock', { holding });
  };

  /**
   * Navigate to stock detail
   */
  const handleStockPress = (holding) => {
    navigation.navigate('StockDetail', { symbol: holding.symbol });
  };

  /**
   * Calculate portfolio summary
   */
  const calculateSummary = () => {
    if (holdings.length === 0) {
      return { totalValue: 0, totalCost: 0, gainLoss: 0, gainLossPercent: 0 };
    }

    let totalValue = 0;
    let totalCost = 0;

    holdings.forEach(holding => {
      const currentPrice = getCurrentPrice(holding.symbol) || holding.purchasePrice;
      totalCost += holding.shares * holding.purchasePrice;
      totalValue += holding.shares * currentPrice;
    });

    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    return { totalValue, totalCost, gainLoss, gainLossPercent };
  };

  const summary = calculateSummary();
  const isPositive = summary.gainLoss >= 0;

  // Convert quotes to simple prices map for child components
  const prices = {};
  Object.keys(quotes).forEach(symbol => {
    const quote = quotes[symbol];
    if (quote && quote.c) {
      prices[symbol] = quote.c;
    }
  });

  // Empty state
  if (holdings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={80} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Your Portfolio is Empty</Text>
          <Text style={styles.emptyText}>
            Start building your portfolio by adding stocks
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AddEditStock')}
          >
            <Text style={styles.emptyButtonText}>Add Your First Stock</Text>
          </TouchableOpacity>
        </View>
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
        {/* Portfolio Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>
            {quotesLoading ? '...' : formatCurrency(summary.totalValue)}
          </Text>
          <View style={styles.gainLossRow}>
            <Text
              style={[
                styles.gainLoss,
                { color: isPositive ? theme.colors.success : theme.colors.error }
              ]}
            >
              {isPositive ? '+' : ''}{formatCurrency(summary.gainLoss)}
            </Text>
            <Text
              style={[
                styles.gainLossPercent,
                { color: isPositive ? theme.colors.success : theme.colors.error }
              ]}
            >
              ({isPositive ? '+' : ''}{formatPercentage(summary.gainLossPercent)})
            </Text>
          </View>
        </View>

        {/* AI Insights Section */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            <Text style={styles.insightsTitle}>AI Portfolio Insights</Text>
          </View>
          {loadingInsights ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : aiInsights?.error ? (
            <Text style={styles.insightsError}>{aiInsights.error}</Text>
          ) : aiInsights ? (
            <Text style={styles.insightsText}>{aiInsights}</Text>
          ) : (
            <Text style={styles.insightsPlaceholder}>Loading insights...</Text>
          )}
        </View>

        {/* Holdings List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings ({holdings.length})</Text>
          {holdings.map(holding => (
            <PortfolioStockItem
              key={holding.id}
              holding={holding}
              currentPrice={prices[holding.symbol]}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPress={() => handleStockPress(holding)}
            />
          ))}
        </View>

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
  summaryCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  gainLossRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gainLoss: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: theme.spacing.xs,
  },
  gainLossPercent: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  insightsCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  insightsText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
  },
  insightsError: {
    fontSize: 14,
    color: theme.colors.error,
    fontStyle: 'italic',
  },
  insightsPlaceholder: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default PortfolioHoldingsScreen;
