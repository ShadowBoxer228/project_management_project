import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { getTimeUntilMarketOpen, isMarketOpen } from '../utils/formatters';
import { getDailyMarketSummary, getMarketAdvice } from '../services/perplexityAPI';
import { getEconomicCalendar } from '../services/finnhubAPI';
import sp100Data from '../data/sp100.json';
import { useNavigation } from '@react-navigation/native';

export default function NewsSummaryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [marketHeadlines, setMarketHeadlines] = useState([]);
  const [marketHeadlinesMessage, setMarketHeadlinesMessage] = useState('');
  const [marketAdvice, setMarketAdvice] = useState('');
  const [expandedHeadlines, setExpandedHeadlines] = useState(new Set());
  const [economicEvents, setEconomicEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeUntilOpen, setTimeUntilOpen] = useState('');
  const [marketIsOpen, setMarketIsOpen] = useState(false);

  useEffect(() => {
    fetchData();
    updateMarketTime();

    const interval = setInterval(updateMarketTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateMarketTime = () => {
    setTimeUntilOpen(getTimeUntilMarketOpen());
    setMarketIsOpen(isMarketOpen());
  };

  const fetchData = async () => {
    try {
      const [headlines, advice, economicData] = await Promise.all([
        getDailyMarketSummary(),
        getMarketAdvice(),
        getEconomicCalendar(),
      ]);

      if (Array.isArray(headlines) && headlines.length > 0) {
        setMarketHeadlines(headlines);
        setMarketHeadlinesMessage('');
      } else {
        setMarketHeadlines([]);
        setMarketHeadlinesMessage(
          'Market headlines unavailable. Please verify your Perplexity API configuration.'
        );
      }

      setMarketAdvice(advice || '');

      const economicItems = economicData?.economicCalendar || [];
      setEconomicEvents(economicItems);
    } catch (error) {
      console.error('Error fetching news data:', error);
      setMarketHeadlines([]);
      setMarketHeadlinesMessage(
        'Failed to load market headlines. Please check your API configuration.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatEventTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHeadlineDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getSourceFromUrl = (url) => {
    if (!url) return '';
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      return hostname;
    } catch {
      return url;
    }
  };

  const handleOpenLink = (url) => {
    if (!url) return;
    Linking.openURL(url).catch((error) => console.error('Failed to open article:', error));
  };

  const handleNavigateToStock = (symbol) => {
    if (!symbol) return;
    const stockMeta = sp100Data.find((stock) => stock.symbol === symbol);
    navigation.navigate('StockDetail', {
      symbol,
      name: stockMeta?.name || symbol,
    });
  };

  const toggleHeadlineExpanded = (index) => {
    const newExpanded = new Set(expandedHeadlines);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedHeadlines(newExpanded);
  };

  const renderTextWithStockLinks = (text, numberOfLines = null) => {
    if (!text) return null;

    // Match stock symbols (1-5 uppercase letters, possibly with . for class shares)
    const symbolRegex = /\b([A-Z]{1,5}(?:\.[A-Z])?)\b/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = symbolRegex.exec(text)) !== null) {
      const symbol = match[1];
      // Check if this is a valid stock symbol in our data
      const isValidSymbol = sp100Data.some((stock) => stock.symbol === symbol);

      if (isValidSymbol) {
        // Add text before the symbol
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            content: text.substring(lastIndex, match.index),
          });
        }
        // Add the symbol as a link
        parts.push({
          type: 'link',
          content: symbol,
          symbol: symbol,
        });
        lastIndex = match.index + symbol.length;
      }
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    if (parts.length === 0) {
      return (
        <Text style={styles.headlineSnippet} numberOfLines={numberOfLines}>
          {text}
        </Text>
      );
    }

    return (
      <Text style={styles.headlineSnippet} numberOfLines={numberOfLines}>
        {parts.map((part, idx) => {
          if (part.type === 'link') {
            return (
              <Text
                key={idx}
                style={styles.stockSymbolLink}
                onPress={() => handleNavigateToStock(part.symbol)}
              >
                {part.content}
              </Text>
            );
          }
          return <Text key={idx}>{part.content}</Text>;
        })}
      </Text>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const today = new Date();
  const headlinesFallbackMessage =
    marketHeadlinesMessage || 'No market headlines available at the moment.';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <View>
          <Text style={styles.headerTitle}>Market Overview</Text>
          <Text style={styles.headerDate}>
            {today.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.marketStatusContainer}>
          <View
            style={[
              styles.marketStatusDot,
              { backgroundColor: marketIsOpen ? theme.colors.success : theme.colors.error },
            ]}
          />
          <View>
            <Text style={styles.marketStatusLabel}>
              {marketIsOpen ? 'Market Open' : 'Market Closed'}
            </Text>
            {!marketIsOpen && <Text style={styles.marketOpenTime}>Opens in {timeUntilOpen}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="globe" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Market Headlines</Text>
        </View>
        {marketHeadlines.length > 0 ? (
          <View style={styles.headlineList}>
            {marketHeadlines.map((item, index) => {
              const isExpanded = expandedHeadlines.has(index);
              const hasSnippet = item.snippet && item.snippet.length > 0;

              return (
                <View key={`${item.url || item.title}-${index}`} style={styles.headlineCard}>
                  <TouchableOpacity
                    onPress={() => hasSnippet && toggleHeadlineExpanded(index)}
                    activeOpacity={hasSnippet ? 0.7 : 1}
                  >
                    <View style={styles.headlineTitleRow}>
                      <Text style={styles.headlineTitle}>{item.title}</Text>
                      {hasSnippet && (
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={theme.colors.textSecondary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {hasSnippet && (
                    <View style={styles.snippetContainer}>
                      {renderTextWithStockLinks(item.snippet, isExpanded ? null : 2)}
                    </View>
                  )}

                  {item.url && (
                    <TouchableOpacity onPress={() => handleOpenLink(item.url)}>
                      <View style={styles.headlineMeta}>
                        <Ionicons name="link-outline" size={14} color={theme.colors.primary} />
                        <Text style={styles.headlineSource}>{getSourceFromUrl(item.url)}</Text>
                        {item.date && (
                          <>
                            <Text style={styles.headlineSeparator}>•</Text>
                            <Text style={styles.headlineDate}>{formatHeadlineDate(item.date)}</Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.placeholderText}>{headlinesFallbackMessage}</Text>
        )}
      </View>


      {economicEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Economic Calendar</Text>
          </View>
          <View style={styles.calendarContainer}>
            {economicEvents.slice(0, 10).map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <View style={styles.eventDot} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventName}>{event.event}</Text>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventCountry}>{event.country}</Text>
                    {event.time ? (
                      <>
                        <Text style={styles.eventDivider}>•</Text>
                        <Text style={styles.eventTime}>{formatEventTime(event.time)}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                {event.impact ? (
                  <View
                    style={[
                      styles.impactBadge,
                      {
                        backgroundColor:
                          event.impact === 'high'
                            ? theme.colors.error + '20'
                            : event.impact === 'medium'
                            ? theme.colors.warning + '20'
                            : theme.colors.textSecondary + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.impactText,
                        {
                          color:
                            event.impact === 'high'
                              ? theme.colors.error
                              : event.impact === 'medium'
                              ? theme.colors.warning
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {event.impact}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      )}

      {marketAdvice && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={theme.colors.success} />
            <Text style={styles.sectionTitle}>Decision Advice</Text>
          </View>
          <View style={styles.adviceContainer}>
            {renderTextWithStockLinks(marketAdvice)}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Refreshed {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: 4,
  },
  headerDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  marketStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  marketStatusLabel: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  marketOpenTime: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
  },
  section: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  headlineList: {
    gap: theme.spacing.md,
  },
  headlineCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headlineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headlineTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  snippetContainer: {
    marginBottom: theme.spacing.sm,
  },
  headlineSnippet: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  stockSymbolLink: {
    ...theme.typography.small,
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  headlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  headlineSource: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headlineSeparator: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginHorizontal: 6,
  },
  headlineDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  placeholderText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  adviceContainer: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.success + '10',
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  calendarContainer: {
    gap: theme.spacing.sm,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: 2,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCountry: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  eventTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  eventDivider: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginHorizontal: 6,
  },
  impactBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  impactText: {
    ...theme.typography.caption,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  footer: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
