import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import theme from '../utils/theme';
import { formatCurrency } from '../utils/formatters';
import sp100Data from '../data/sp100.json';

const POLYGON_API_KEY = 'CC6_g1v7dJp1tgDkOzkYMX36p4vH6YYX';

/**
 * AddEditStockScreen Component
 * Modal screen for adding or editing portfolio holdings
 */
const AddEditStockScreen = ({ navigation, route }) => {
  const { addHolding, updateHolding } = usePortfolio();
  const isEditMode = !!route.params?.holding;
  const existingHolding = route.params?.holding;

  // Form state
  const [mode, setMode] = useState('quick'); // 'quick' or 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [shares, setShares] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Filtered stocks for search
  const [filteredStocks, setFilteredStocks] = useState([]);

  // Initialize form if editing
  useEffect(() => {
    if (isEditMode && existingHolding) {
      const stock = sp100Data.find(s => s.symbol === existingHolding.symbol);
      setSelectedStock(stock || { symbol: existingHolding.symbol, name: existingHolding.symbol });
      setShares(existingHolding.shares.toString());
      setPurchasePrice(existingHolding.purchasePrice.toString());
      setPurchaseDate(existingHolding.purchaseDate || new Date().toISOString().split('T')[0]);
      setNotes(existingHolding.notes || '');
      setMode('manual');
    }
  }, [isEditMode, existingHolding]);

  // Filter stocks based on search
  useEffect(() => {
    if (searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      const filtered = sp100Data.filter(
        stock =>
          stock.symbol.toLowerCase().includes(query) ||
          stock.name.toLowerCase().includes(query)
      );
      setFilteredStocks(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredStocks([]);
    }
  }, [searchQuery]);

  // Fetch current price when stock is selected
  useEffect(() => {
    if (selectedStock && !isEditMode) {
      fetchCurrentPrice(selectedStock.symbol);
    }
  }, [selectedStock]);

  /**
   * Fetch current price for a stock
   */
  const fetchCurrentPrice = async (symbol) => {
    try {
      setFetchingPrice(true);
      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${POLYGON_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.ticker) {
        const price = data.ticker.lastTrade?.p || data.ticker.day?.c;
        if (price) {
          setCurrentPrice(price);
          if (mode === 'quick') {
            setPurchasePrice(price.toString());
          }
        }
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    } finally {
      setFetchingPrice(false);
    }
  };

  /**
   * Select a stock from search results
   */
  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setFilteredStocks([]);
  };

  /**
   * Toggle between quick add and manual entry
   */
  const handleToggleMode = () => {
    const newMode = mode === 'quick' ? 'manual' : 'quick';
    setMode(newMode);
    if (newMode === 'quick' && currentPrice) {
      setPurchasePrice(currentPrice.toString());
    }
  };

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    if (!selectedStock) {
      Alert.alert('Error', 'Please select a stock');
      return false;
    }

    const sharesNum = parseFloat(shares);
    if (!shares || isNaN(sharesNum) || sharesNum <= 0) {
      Alert.alert('Error', 'Please enter a valid number of shares');
      return false;
    }

    const priceNum = parseFloat(purchasePrice);
    if (!purchasePrice || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid purchase price');
      return false;
    }

    return true;
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const holdingData = {
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        shares: parseFloat(shares),
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate,
        notes: notes.trim(),
      };

      let success;
      if (isEditMode) {
        success = await updateHolding(existingHolding.id, holdingData);
      } else {
        success = await addHolding(holdingData);
      }

      if (success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} holding`);
      }
    } catch (error) {
      console.error('Error saving holding:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditMode ? 'Edit' : 'Add'} Stock</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Stock Search */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={styles.label}>Search Stock</Text>
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color={theme.colors.text.secondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by symbol or name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="characters"
                placeholderTextColor={theme.colors.text.secondary}
              />
            </View>
            {filteredStocks.length > 0 && (
              <View style={styles.searchResults}>
                {filteredStocks.map(stock => (
                  <TouchableOpacity
                    key={stock.symbol}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectStock(stock)}
                  >
                    <Text style={styles.searchResultSymbol}>{stock.symbol}</Text>
                    <Text style={styles.searchResultName}>{stock.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Selected Stock */}
        {selectedStock && (
          <View style={styles.selectedStockCard}>
            <View style={styles.selectedStockInfo}>
              <Text style={styles.selectedSymbol}>{selectedStock.symbol}</Text>
              <Text style={styles.selectedName}>{selectedStock.name}</Text>
            </View>
            {currentPrice && (
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>Current Price</Text>
                <Text style={styles.priceValue}>{formatCurrency(currentPrice)}</Text>
              </View>
            )}
            {fetchingPrice && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>
        )}

        {/* Mode Toggle */}
        {!isEditMode && selectedStock && (
          <View style={styles.section}>
            <Text style={styles.label}>Entry Mode</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'quick' && styles.modeButtonActive]}
                onPress={() => handleToggleMode()}
              >
                <Text style={[styles.modeButtonText, mode === 'quick' && styles.modeButtonTextActive]}>
                  Quick Add
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
                onPress={() => handleToggleMode()}
              >
                <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
                  Manual Entry
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modeDescription}>
              {mode === 'quick'
                ? 'Uses current market price as purchase price'
                : 'Enter your actual purchase price'}
            </Text>
          </View>
        )}

        {/* Shares Input */}
        {selectedStock && (
          <View style={styles.section}>
            <Text style={styles.label}>Number of Shares</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={shares}
              onChangeText={setShares}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.text.secondary}
            />
          </View>
        )}

        {/* Purchase Price Input */}
        {selectedStock && mode === 'manual' && (
          <View style={styles.section}>
            <Text style={styles.label}>Purchase Price</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={[styles.input, styles.inputWithPrefix]}
                placeholder="0.00"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.text.secondary}
              />
            </View>
          </View>
        )}

        {/* Purchase Date */}
        {selectedStock && mode === 'manual' && (
          <View style={styles.section}>
            <Text style={styles.label}>Purchase Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholderTextColor={theme.colors.text.secondary}
            />
          </View>
        )}

        {/* Notes */}
        {selectedStock && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes about this holding..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={theme.colors.text.secondary}
            />
          </View>
        )}

        {/* Cost Summary */}
        {selectedStock && shares && purchasePrice && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Cost</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(parseFloat(shares) * parseFloat(purchasePrice))}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Save Button */}
      {selectedStock && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update' : 'Add to Portfolio'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.small,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing.md,
  },
  searchResults: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  searchResultItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchResultSymbol: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  searchResultName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  selectedStockCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  selectedStockInfo: {
    marginBottom: theme.spacing.sm,
  },
  selectedSymbol: {
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  selectedName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  priceInfo: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    ...theme.shadows.small,
  },
  modeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.secondary,
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  modeDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
    ...theme.shadows.small,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.secondary,
    paddingLeft: theme.spacing.md,
  },
  inputWithPrefix: {
    flex: 1,
    backgroundColor: 'transparent',
    ...theme.shadows.none,
  },
  textArea: {
    height: 100,
    paddingTop: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
});

export default AddEditStockScreen;
