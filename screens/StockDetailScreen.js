import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../utils/theme';
import {
  formatCurrency,
  formatPercentage,
} from '../utils/formatters';
import {
  getBasicFinancials,
  getCompanyProfile,
} from '../services/finnhubAPI';
import { getCompanyOverview } from '../services/alphaVantageAPI';
import { getPreviousClose } from '../services/polygonAPI';
import TabBar from '../components/TabBar';
import TechnicalsTab from '../components/tabs/TechnicalsTab';
import FinancialsTab from '../components/tabs/FinancialsTab';
import AnalystRatingTab from '../components/tabs/AnalystRatingTab';
import DividendsTab from '../components/tabs/DividendsTab';
import EarningsTab from '../components/tabs/EarningsTab';

const TABS = [
  { id: 'technicals', label: 'Technicals' },
  { id: 'analyst', label: 'Analyst Rating' },
  { id: 'financials', label: 'Financials' },
  { id: 'dividends', label: 'Dividends' },
  { id: 'earnings', label: 'Earnings' },
];

const debugLog = (...args) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[StockDetailScreen]', ...args);
  }
};

export default function StockDetailScreen({ route }) {
  const { symbol, name } = route.params;
  const [quote, setQuote] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('1D');
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [showIndicators, setShowIndicators] = useState(false);
  const [activeTab, setActiveTab] = useState('technicals');

  useEffect(() => {
    let isMounted = true;

    const fetchStockData = async () => {
      debugLog('Fetching stock data', { symbol, name });
      setLoading(true);
      try {
        const [
          prevCloseData,
          financialsData,
          profileData,
          overviewData,
        ] = await Promise.all([
          getPreviousClose(symbol),
          getBasicFinancials(symbol),
          getCompanyProfile(symbol),
          getCompanyOverview(symbol),
        ]);

        if (!isMounted) return;

        // Transform Polygon.io previous close to Finnhub-compatible format
        const quoteData = prevCloseData ? {
          c: prevCloseData.close,
          d: prevCloseData.close - prevCloseData.open,
          dp: prevCloseData.open !== 0 ? ((prevCloseData.close - prevCloseData.open) / prevCloseData.open) * 100 : 0,
          v: prevCloseData.volume,
          h: prevCloseData.high,
          l: prevCloseData.low,
          o: prevCloseData.open,
        } : null;

        setQuote(quoteData);
        setFinancials(financialsData);
        setProfile(profileData);
        setOverview(overviewData);
        
        debugLog('Fetch success', {
          symbol,
          quoteLoaded: Boolean(quoteData),
          financialLoaded: Boolean(financialsData),
        });
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching stock data:', error);
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
  const changePercent = Number.isFinite(quote?.dp) ? quote.dp : null;
  const isPositive = changePercent !== null ? changePercent >= 0 : null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'technicals':
        return (
          <TechnicalsTab
            symbol={symbol}
            name={name}
            currentPrice={currentPrice}
            chartType={chartType}
            timeRange={timeRange}
            selectedIndicators={selectedIndicators}
            onChartTypeChange={setChartType}
            onTimeRangeChange={setTimeRange}
            setSelectedIndicators={setSelectedIndicators}
            showIndicators={showIndicators}
            setShowIndicators={setShowIndicators}
          />
        );
      case 'analyst':
        return (
          <AnalystRatingTab
            symbol={symbol}
            name={name}
            currentPrice={currentPrice}
          />
        );
      case 'financials':
        return (
          <FinancialsTab
            financials={financials}
            overview={overview}
          />
        );
      case 'dividends':
        return (
          <DividendsTab
            symbol={symbol}
            name={name}
            financials={financials}
            overview={overview}
          />
        );
      case 'earnings':
        return (
          <EarningsTab
            symbol={symbol}
            name={name}
            financials={financials}
            overview={overview}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      
      {renderTabContent()}
    </View>
  );
}

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
});
