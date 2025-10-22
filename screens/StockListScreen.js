import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getBulkSnapshots } from '../services/polygonAPI';
import sp100Data from '../data/sp100.json';

const debugLog = (...args) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[StockList]', ...args);
  }
};

const StockListItem = ({ item, quote, onPress }) => {
  const currentPrice = Number.isFinite(quote?.c) ? quote.c : null;
  const change = Number.isFinite(quote?.d) ? quote.d : null;
  const changePercent = Number.isFinite(quote?.dp) ? quote.dp : null;
  const isPositive =
    changePercent !== null ? changePercent >= 0 : change !== null ? change >= 0 : null;
  const formattedChange = changePercent !== null ? formatPercentage(changePercent) : 'N/A';

  return (
    <TouchableOpacity
      style={styles.stockItem}
      onPress={() => {
        if (__DEV__) {
          debugLog('Press stock', { symbol: item.symbol });
        }
        onPress(item);
      }}
    >
      <View style={styles.stockInfo}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.companyName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      {!quote ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      ) : (
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatCurrency(currentPrice)}</Text>
          {changePercent !== null ? (
            <View
              style={[
                styles.changeContainer,
                {
                  backgroundColor:
                    isPositive ? theme.colors.success + '15' : theme.colors.error + '15',
                },
              ]}
            >
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={isPositive ? theme.colors.success : theme.colors.error}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.change,
                  { color: isPositive ? theme.colors.success : theme.colors.error },
                ]}
              >
                {formattedChange}
              </Text>
            </View>
          ) : (
            <Text style={styles.noQuoteText}>Quote unavailable</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function StockListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredStocks, setFilteredStocks] = useState(sp100Data);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch all quotes in bulk
  const fetchAllQuotes = async () => {
    try {
      debugLog('Fetching bulk snapshots for all stocks');
      const symbols = sp100Data.map((stock) => stock.symbol);
      const quotesData = await getBulkSnapshots(symbols);
      debugLog('Bulk snapshots received', { count: Object.keys(quotesData).length });
      setQuotes(quotesData);
    } catch (error) {
      console.error('Error fetching bulk quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch quotes on mount
  useEffect(() => {
    fetchAllQuotes();
  }, []);

  // Filter stocks based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStocks(sp100Data);
    } else {
      const filtered = sp100Data.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStocks(filtered);
    }
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllQuotes();
    setRefreshing(false);
  };

  const handleStockPress = (stock) => {
    if (__DEV__) {
      debugLog('Navigate to StockDetail', { symbol: stock.symbol, name: stock.name });
    }
    navigation.navigate('StockDetail', {
      symbol: stock.symbol,
      name: stock.name,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stocks..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading stock prices...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStocks}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <StockListItem item={item} quote={quotes[item.symbol]} onPress={handleStockPress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.cardBackground,
  },
  stockInfo: {
    flex: 1,
  },
  symbol: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 2,
  },
  companyName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  change: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  noQuoteText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});
