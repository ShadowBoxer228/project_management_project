import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import {
  formatCurrency,
  formatLargeNumber,
  formatPercentage,
  formatVolume,
  formatDateTime,
} from '../utils/formatters';
import {
  getQuote,
  getBasicFinancials,
  getCompanyNews,
  getCompanyProfile,
} from '../services/finnhubAPI';
import { getCompanyOverview } from '../services/alphaVantageAPI';
import { getStockAnalysis } from '../services/perplexityAPI';
import StockChart from '../components/StockChart';

const TIME_RANGES = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];
const debugLog = (...args) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[StockDetailScreen]', ...args);
  }
};

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

export default function StockDetailScreen({ route }) {
  const { symbol, name } = route.params;
  const [quote, setQuote] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [news, setNews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiInsightsMessage, setAiInsightsMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('1D');

  useEffect(() => {
    let isMounted = true;

    const getDateString = (daysOffset) => {
      const date = new Date();
      date.setDate(date.getDate() + daysOffset);
      return date.toISOString().split('T')[0];
    };

    const fetchStockData = async () => {
      debugLog('Fetching stock data', { symbol, name });
      setLoading(true);
      try {
        const [
          quoteData,
          financialsData,
          profileData,
          overviewData,
          newsData,
          aiData,
        ] = await Promise.all([
          getQuote(symbol),
          getBasicFinancials(symbol),
          getCompanyProfile(symbol),
          getCompanyOverview(symbol),
          getCompanyNews(symbol, getDateString(-7), getDateString(0)),
          getStockAnalysis(symbol, name),
        ]);

        if (!isMounted) return;

        setQuote(quoteData);
        setFinancials(financialsData);
        setProfile(profileData);
        setOverview(overviewData);
        setNews(newsData.slice(0, 10));
        if (Array.isArray(aiData) && aiData.length > 0) {
          setAiInsights(aiData);
          setAiInsightsMessage('');
        } else {
          setAiInsights([]);
          setAiInsightsMessage('No AI insights available for this ticker right now.');
        }
        debugLog('Fetch success', {
          symbol,
          quoteLoaded: Boolean(quoteData),
          financialLoaded: Boolean(financialsData),
          newsCount: newsData?.length || 0,
          insightsCount: aiData?.length || 0,
        });
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching stock data:', error);
          setAiInsights([]);
          setAiInsightsMessage('Failed to load AI insights. Please try again later.');
          debugLog('Fetch failed', { symbol, error: error?.message });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          debugLog('Fetch finished', { symbol });
        }
      }
    };

    fetchStockData();

    return () => {
      isMounted = false;
      debugLog('Cleanup', { symbol });
    };
  }, [symbol, name]);

  const currentPrice = Number.isFinite(quote?.c) ? quote.c : null;
  const change = Number.isFinite(quote?.d) ? quote.d : null;
  const changePercent = Number.isFinite(quote?.dp) ? quote.dp : null;
  const isPositive =
    changePercent !== null ? changePercent >= 0 : change !== null ? change >= 0 : null;

  const metrics = financials?.metric || {};
  const marketCap = parseNumber(overview?.MarketCapitalization ?? metrics['marketCapitalization']);
  const peRatio = parseNumber(overview?.PERatio ?? metrics['peBasicExclExtraTTM']);
  const eps = parseNumber(overview?.EPS ?? metrics['epsBasicExclExtraItemsTTM']);
  const dividendYield = parseNumber(
    overview?.DividendYield ?? metrics['dividendYieldIndicatedAnnual']
  );
  const week52High = parseNumber(overview?.['52WeekHigh'] ?? metrics['52WeekHigh']);
  const week52Low = parseNumber(overview?.['52WeekLow'] ?? metrics['52WeekLow']);
  const beta = parseNumber(overview?.Beta ?? metrics['beta']);

  const formatInsightDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSourceFromUrl = (url) => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const handleOpenLink = (url) => {
    if (!url) return;
    Linking.openURL(url).catch((error) => console.error('Failed to open insight link:', error));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.companyName}>{name}</Text>
          <Text style={styles.symbol}>{symbol}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatCurrency(currentPrice)}</Text>
          {changePercent !== null ? (
            <View
              style={[
                styles.changeContainer,
                {
                  backgroundColor: isPositive
                    ? theme.colors.success + '15'
                    : theme.colors.error + '15',
                },
              ]}
            >
              <Text
                style={[
                  styles.change,
                  { color: isPositive ? theme.colors.success : theme.colors.error },
                ]}
              >
                {formatPercentage(changePercent)}
              </Text>
            </View>
          ) : (
            <Text style={styles.changeUnavailable}>Change unavailable</Text>
          )}
        </View>
      </View>

      <View style={styles.chartTypeContainer}>
        <View style={styles.chartTypeButtons}>
          <TouchableOpacity
            style={[styles.chartTypeButton, chartType === 'line' && styles.chartTypeButtonActive]}
            onPress={() => {
              if (__DEV__) {
                debugLog('Change chart type', { symbol, type: 'line' });
              }
              setChartType('line');
            }}
          >
            <Text
              style={[
                styles.chartTypeButtonText,
                chartType === 'line' && styles.chartTypeButtonTextActive,
              ]}
            >
              Line
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              chartType === 'candle' && styles.chartTypeButtonActive,
            ]}
            onPress={() => {
              if (__DEV__) {
                debugLog('Change chart type', { symbol, type: 'candle' });
              }
              setChartType('candle');
            }}
          >
            <Text
              style={[
                styles.chartTypeButtonText,
                chartType === 'candle' && styles.chartTypeButtonTextActive,
              ]}
            >
              Candle
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <StockChart symbol={symbol} chartType={chartType} timeRange={timeRange} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.timeRangeContainer}
        contentContainerStyle={styles.timeRangeContent}
      >
        {TIME_RANGES.map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
              onPress={() => {
                if (__DEV__) {
                  debugLog('Change time range', { symbol, range });
                }
                setTimeRange(range);
              }}
            >
            <Text
              style={[
                styles.timeRangeButtonText,
                timeRange === range && styles.timeRangeButtonTextActive,
              ]}
            >
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Statistics</Text>
        <View style={styles.metricsGrid}>
          <MetricItem label="Market Cap" value={formatLargeNumber(marketCap)} />
          <MetricItem label="P/E Ratio" value={peRatio !== null ? peRatio.toFixed(2) : 'N/A'} />
          <MetricItem label="EPS" value={eps !== null ? formatCurrency(eps) : 'N/A'} />
          <MetricItem
            label="Dividend Yield"
            value={dividendYield !== null ? `${(dividendYield * 100).toFixed(2)}%` : 'N/A'}
          />
          <MetricItem
            label="52W High"
            value={week52High !== null ? formatCurrency(week52High) : 'N/A'}
          />
          <MetricItem
            label="52W Low"
            value={week52Low !== null ? formatCurrency(week52Low) : 'N/A'}
          />
          <MetricItem label="Beta" value={beta !== null ? beta.toFixed(2) : 'N/A'} />
          <MetricItem label="Volume" value={formatVolume(quote?.v)} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent News</Text>
        {news.length > 0 ? (
          news.map((article, index) => (
            <View key={index} style={styles.newsItem}>
              <Text style={styles.newsHeadline} numberOfLines={2}>
                {article.headline}
              </Text>
              <View style={styles.newsMetadata}>
                <Text style={styles.newsSource}>{article.source}</Text>
                <Text style={styles.newsDivider}>•</Text>
                <Text style={styles.newsDate}>{formatDateTime(article.datetime)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No recent news available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Market Insights</Text>
        {aiInsights.length > 0 ? (
          aiInsights.map((insight, index) => (
            <TouchableOpacity
              key={`${insight.url || insight.title}-${index}`}
              style={styles.insightCard}
              onPress={() => handleOpenLink(insight.url)}
              activeOpacity={0.85}
            >
              <Text style={styles.insightTitle}>{insight.title}</Text>
              {insight.snippet ? (
                <Text style={styles.insightSnippet} numberOfLines={3}>
                  {insight.snippet}
                </Text>
              ) : null}
              <View style={styles.insightMeta}>
                {insight.url ? (
                  <Text style={styles.insightSource}>{getSourceFromUrl(insight.url)}</Text>
                ) : null}
                {insight.date ? (
                  <>
                    {insight.url ? <Text style={styles.insightDivider}>•</Text> : null}
                    <Text style={styles.insightDate}>{formatInsightDate(insight.date)}</Text>
                  </>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>{aiInsightsMessage}</Text>
        )}
      </View>

      {profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Industry</Text>
            <Text style={styles.infoValue}>{profile.finnhubIndustry || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Country</Text>
            <Text style={styles.infoValue}>{profile.country || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Exchange</Text>
            <Text style={styles.infoValue}>{profile.exchange || 'N/A'}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const MetricItem = ({ label, value }) => (
  <View style={styles.metricItem}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  companyName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 4,
  },
  symbol: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  changeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  change: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  changeUnavailable: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  chartTypeContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  chartTypeButtonActive: {
    backgroundColor: theme.colors.background,
    ...theme.shadows.card,
  },
  chartTypeButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chartTypeButtonTextActive: {
    color: theme.colors.text,
  },
  timeRangeContainer: {
    marginBottom: theme.spacing.md,
  },
  timeRangeContent: {
    paddingHorizontal: theme.spacing.md,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  timeRangeButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  timeRangeButtonTextActive: {
    color: theme.colors.background,
  },
  section: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.sm,
  },
  metricItem: {
    width: '50%',
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  newsItem: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  newsHeadline: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  newsMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsSource: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  newsDivider: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginHorizontal: 6,
  },
  newsDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  insightCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  insightTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  insightSnippet: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  insightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightSource: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightDivider: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginHorizontal: 6,
  },
  insightDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  noDataText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  infoLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
});
