import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { theme } from '../../utils/theme';
import { formatLargeNumber, formatCurrency } from '../../utils/formatters';

const FinancialsTab = ({ financials, overview }) => {
  const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (normalized === '') return null;
      const numeric = Number(normalized);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  };

  const metrics = financials?.metric || {};
  
  // Extract key financial metrics
  const marketCap = parseNumber(overview?.MarketCapitalization ?? metrics['marketCapitalization']);
  const enterpriseValue = parseNumber(metrics['enterpriseValue']);
  const peRatio = parseNumber(overview?.PERatio ?? metrics['peBasicExclExtraTTM']);
  const priceToBook = parseNumber(overview?.PriceToBookRatio ?? metrics['pbQuarterly']);
  const priceToSales = parseNumber(overview?.PriceToSalesRatioTTM ?? metrics['psTTM']);
  const profitMargin = parseNumber(overview?.ProfitMargin ?? metrics['netProfitMarginTTM']);
  const operatingMargin = parseNumber(overview?.OperatingMarginTTM ?? metrics['operatingMarginTTM']);
  const roe = parseNumber(overview?.ReturnOnEquityTTM ?? metrics['roeTTM']);
  const roa = parseNumber(overview?.ReturnOnAssetsTTM ?? metrics['roaTTM']);
  const debtToEquity = parseNumber(overview?.DebtToEquity ?? metrics['totalDebt/totalEquityQuarterly']);
  const currentRatio = parseNumber(overview?.CurrentRatio ?? metrics['currentRatioQuarterly']);
  const revenueGrowth = parseNumber(overview?.QuarterlyRevenueGrowthYOY ?? metrics['revenueGrowthTTMYoy']);
  const earningsGrowth = parseNumber(overview?.QuarterlyEarningsGrowthYOY);
  const dividendYield = parseNumber(overview?.DividendYield ?? metrics['dividendYieldIndicatedAnnual']);
  const payoutRatio = parseNumber(overview?.PayoutRatio ?? metrics['payoutRatioTTM']);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Valuation Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Valuation</Text>
        <View style={styles.metricsCard}>
          <MetricRow label="Market Cap" value={formatLargeNumber(marketCap)} />
          <MetricRow label="Enterprise Value" value={formatLargeNumber(enterpriseValue)} />
          <MetricRow label="P/E Ratio" value={peRatio !== null ? peRatio.toFixed(2) : 'N/A'} />
          <MetricRow label="Price to Book" value={priceToBook !== null ? priceToBook.toFixed(2) : 'N/A'} />
          <MetricRow label="Price to Sales" value={priceToSales !== null ? priceToSales.toFixed(2) : 'N/A'} />
        </View>
      </View>

      {/* Profitability */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profitability</Text>
        <View style={styles.metricsCard}>
          <MetricRow 
            label="Profit Margin" 
            value={profitMargin !== null ? `${(profitMargin * 100).toFixed(2)}%` : 'N/A'} 
          />
          <MetricRow 
            label="Operating Margin" 
            value={operatingMargin !== null ? `${(operatingMargin * 100).toFixed(2)}%` : 'N/A'} 
          />
          <MetricRow 
            label="Return on Equity (ROE)" 
            value={roe !== null ? `${(roe * 100).toFixed(2)}%` : 'N/A'} 
          />
          <MetricRow 
            label="Return on Assets (ROA)" 
            value={roa !== null ? `${(roa * 100).toFixed(2)}%` : 'N/A'} 
          />
        </View>
      </View>

      {/* Financial Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Health</Text>
        <View style={styles.metricsCard}>
          <MetricRow label="Debt to Equity" value={debtToEquity !== null ? debtToEquity.toFixed(2) : 'N/A'} />
          <MetricRow label="Current Ratio" value={currentRatio !== null ? currentRatio.toFixed(2) : 'N/A'} />
        </View>
      </View>

      {/* Growth */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Growth</Text>
        <View style={styles.metricsCard}>
          <MetricRow 
            label="Revenue Growth (YoY)" 
            value={revenueGrowth !== null ? `${(revenueGrowth * 100).toFixed(2)}%` : 'N/A'} 
          />
          <MetricRow 
            label="Earnings Growth (YoY)" 
            value={earningsGrowth !== null ? `${(earningsGrowth * 100).toFixed(2)}%` : 'N/A'} 
          />
        </View>
      </View>

      {/* Dividends */}
      {(dividendYield !== null || payoutRatio !== null) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dividend Metrics</Text>
          <View style={styles.metricsCard}>
            <MetricRow 
              label="Dividend Yield" 
              value={dividendYield !== null ? `${(dividendYield * 100).toFixed(2)}%` : 'N/A'} 
            />
            <MetricRow 
              label="Payout Ratio" 
              value={payoutRatio !== null ? `${(payoutRatio * 100).toFixed(2)}%` : 'N/A'} 
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const MetricRow = ({ label, value }) => {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  metricsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metricLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  metricValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
});

export default FinancialsTab;

