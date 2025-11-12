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
  ScrollView,
  Modal,
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

// Get unique sectors from data
const SECTORS = ['All', ...new Set(sp100Data.map((stock) => stock.sector))].sort();

// Sort options
const SORT_OPTIONS = [
  { id: 'symbol-asc', label: 'Symbol (A-Z)', icon: 'text-outline' },
  { id: 'symbol-desc', label: 'Symbol (Z-A)', icon: 'text-outline' },
  { id: 'name-asc', label: 'Name (A-Z)', icon: 'list-outline' },
  { id: 'name-desc', label: 'Name (Z-A)', icon: 'list-outline' },
  { id: 'marketcap-desc', label: 'Market Cap (High to Low)', icon: 'trending-up' },
  { id: 'marketcap-asc', label: 'Market Cap (Low to High)', icon: 'trending-down' },
  { id: 'change-desc', label: 'Change % (High to Low)', icon: 'arrow-up' },
  { id: 'change-asc', label: 'Change % (Low to High)', icon: 'arrow-down' },
];

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
  const [selectedSector, setSelectedSector] = useState('All');
  const [sortBy, setSortBy] = useState('symbol-asc');
  const [showSortModal, setShowSortModal] = useState(false);

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

  // Filter and sort stocks based on search query, sector, and sort option
  useEffect(() => {
    let result = [...sp100Data];

    // Filter by search query
    if (searchQuery.trim() !== '') {
      result = result.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by sector
    if (selectedSector !== 'All') {
      result = result.filter((stock) => stock.sector === selectedSector);
    }

    // Sort stocks
    result.sort((a, b) => {
      switch (sortBy) {
        case 'symbol-asc':
          return a.symbol.localeCompare(b.symbol);
        case 'symbol-desc':
          return b.symbol.localeCompare(a.symbol);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'marketcap-desc':
          return (b.marketCap || 0) - (a.marketCap || 0);
        case 'marketcap-asc':
          return (a.marketCap || 0) - (b.marketCap || 0);
        case 'change-desc': {
          const aChange = quotes[a.symbol]?.dp ?? -Infinity;
          const bChange = quotes[b.symbol]?.dp ?? -Infinity;
          return bChange - aChange;
        }
        case 'change-asc': {
          const aChange = quotes[a.symbol]?.dp ?? Infinity;
          const bChange = quotes[b.symbol]?.dp ?? Infinity;
          return aChange - bChange;
        }
        default:
          return 0;
      }
    });

    setFilteredStocks(result);
  }, [searchQuery, selectedSector, sortBy, quotes]);

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

      {/* Filter and Sort Controls */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectorChipsContainer}
        >
          {SECTORS.map((sector) => (
            <TouchableOpacity
              key={sector}
              style={[
                styles.sectorChip,
                selectedSector === sector && styles.sectorChipSelected,
              ]}
              onPress={() => setSelectedSector(sector)}
            >
              <Text
                style={[
                  styles.sectorChipText,
                  selectedSector === sector && styles.sectorChipTextSelected,
                ]}
              >
                {sector}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={18} color={theme.colors.primary} />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredStocks.length} {filteredStocks.length === 1 ? 'stock' : 'stocks'}
        </Text>
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

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.sortOption}
                  onPress={() => {
                    setSortBy(option.id);
                    setShowSortModal(false);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={sortBy === option.id ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.id && styles.sortOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.id && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectorChipsContainer: {
    paddingRight: theme.spacing.sm,
  },
  sectorChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectorChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sectorChipText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '500',
  },
  sectorChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  sortButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  resultsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  resultsText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.cardBackground,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  sortOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
