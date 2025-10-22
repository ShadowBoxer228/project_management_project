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
import { getQuote } from '../services/finnhubAPI';
import sp100Data from '../data/sp100.json';

const StockListItem = ({ item, onPress }) => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuote();
  }, []);

  const fetchQuote = async () => {
    try {
      const data = await getQuote(item.symbol);
      setQuote(data);
    } catch (error) {
      console.error(`Error fetching quote for ${item.symbol}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = quote?.c || 0;
  const change = quote?.d || 0;
  const changePercent = quote?.dp || 0;
  const isPositive = change >= 0;

  return (
    <TouchableOpacity style={styles.stockItem} onPress={() => onPress(item)}>
      <View style={styles.stockInfo}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.companyName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      ) : (
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatCurrency(currentPrice)}</Text>
          <View
            style={[
              styles.changeContainer,
              { backgroundColor: isPositive ? theme.colors.success + '15' : theme.colors.error + '15' },
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
              {formatPercentage(changePercent)}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function StockListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredStocks, setFilteredStocks] = useState(sp100Data);

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
    // Force re-render by updating state
    setFilteredStocks([...filteredStocks]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStockPress = (stock) => {
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
      <FlatList
        data={filteredStocks}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => (
          <StockListItem item={item} onPress={handleStockPress} />
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
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md,
  },
});
