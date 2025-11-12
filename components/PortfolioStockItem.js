import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { formatCurrency, formatPercentage } from '../utils/formatters';

/**
 * PortfolioStockItem Component
 * Displays a single stock holding with current value and gain/loss
 */
const PortfolioStockItem = ({
  holding,
  currentPrice,
  onEdit,
  onDelete,
  onPress
}) => {
  // Calculate metrics
  const totalCost = holding.shares * holding.purchasePrice;
  const currentValue = holding.shares * (currentPrice || holding.purchasePrice);
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = (gainLoss / totalCost) * 100;
  const isPositive = gainLoss >= 0;

  const handleDelete = () => {
    Alert.alert(
      'Delete Holding',
      `Are you sure you want to remove ${holding.symbol} from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(holding.id)
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.symbol}>{holding.symbol}</Text>
          <Text style={styles.shares}>{holding.shares} shares</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onEdit(holding)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginLeft: theme.spacing.md }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Purchase Price:</Text>
          <Text style={styles.value}>{formatCurrency(holding.purchasePrice)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Current Price:</Text>
          <Text style={styles.value}>
            {currentPrice ? formatCurrency(currentPrice) : '-'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Total Cost:</Text>
          <Text style={styles.value}>{formatCurrency(totalCost)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Current Value:</Text>
          <Text style={styles.value}>{formatCurrency(currentValue)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.labelBold}>Gain/Loss:</Text>
          <View style={styles.gainLossContainer}>
            <Text style={[styles.gainLoss, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
              {isPositive ? '+' : ''}{formatCurrency(gainLoss)}
            </Text>
            <Text style={[styles.gainLossPercent, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
              ({isPositive ? '+' : ''}{formatPercentage(gainLossPercent)})
            </Text>
          </View>
        </View>
      </View>

      {holding.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notes}>{holding.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  titleRow: {
    flex: 1,
  },
  symbol: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  shares: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    marginTop: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  labelBold: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gainLoss: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: theme.spacing.xs,
  },
  gainLossPercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
});

export default PortfolioStockItem;
