import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

const formatPrice = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '$0.00';
  }
  return `$${numericValue.toFixed(2)}`;
};

const formatVolume = (volume) => {
  if (!volume) return 'N/A';
  const num = Number(volume);
  if (!Number.isFinite(num)) return 'N/A';

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toFixed(0);
};

const formatDateTime = (timestamp, range) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  if (range === '1D') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function ChartTooltip({ data, chartType = 'line', timeRange = '1D' }) {
  if (!data) return null;

  const { timestamp, value, open, high, low, close, volume } = data;
  const isCandle = chartType === 'candle';

  return (
    <View style={styles.container}>
      <Text style={styles.dateText}>{formatDateTime(timestamp, timeRange)}</Text>

      {isCandle ? (
        <View style={styles.dataContainer}>
          <View style={styles.row}>
            <Text style={styles.label}>O:</Text>
            <Text style={styles.value}>{formatPrice(open)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>H:</Text>
            <Text style={[styles.value, { color: theme.colors.success }]}>{formatPrice(high)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>L:</Text>
            <Text style={[styles.value, { color: theme.colors.error }]}>{formatPrice(low)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>C:</Text>
            <Text style={styles.value}>{formatPrice(close)}</Text>
          </View>
          {volume && (
            <View style={styles.row}>
              <Text style={styles.label}>Vol:</Text>
              <Text style={styles.volumeValue}>{formatVolume(volume)}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.dataContainer}>
          <View style={styles.row}>
            <Text style={styles.label}>Price:</Text>
            <Text style={styles.value}>{formatPrice(value)}</Text>
          </View>
          {volume && (
            <View style={styles.row}>
              <Text style={styles.label}>Volume:</Text>
              <Text style={styles.volumeValue}>{formatVolume(volume)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  dataContainer: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 120,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginRight: theme.spacing.sm,
  },
  value: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  volumeValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
