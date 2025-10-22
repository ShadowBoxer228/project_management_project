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
import { theme } from '../utils/theme';
import { getTimeUntilMarketOpen, isMarketOpen } from '../utils/formatters';
import { getDailyMarketSummary } from '../services/perplexityAPI';
import { getEconomicCalendar, getEarningsCalendar } from '../services/finnhubAPI';

export default function NewsSummaryScreen() {
  const [marketHeadlines, setMarketHeadlines] = useState([]);
  const [marketHeadlinesMessage, setMarketHeadlinesMessage] = useState('');
  const [economicEvents, setEconomicEvents] = useState([]);
  const [earningsEvents, setEarningsEvents] = useState([]);
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
      const [headlines, economicData, earningsData] = await Promise.all([
        getDailyMarketSummary(),
        getEconomicCalendar(),
        getEarningsCalendar(),
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

      setEconomicEvents(economicData?.economicCalendar || []);
      setEarningsEvents(earningsData?.earningsCalendar || []);
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
      <View style={styles.header}>
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
            {marketHeadlines.map((item, index) => (
              <TouchableOpacity
                key={`${item.url || item.title}-${index}`}
                style={styles.headlineCard}
                onPress={() => handleOpenLink(item.url)}
                activeOpacity={0.85}
              >
                <Text style={styles.headlineTitle}>{item.title}</Text>
                {item.snippet ? (
                  <Text style={styles.headlineSnippet} numberOfLines={3}>
                    {item.snippet}
                  </Text>
                ) : null}
                <View style={styles.headlineMeta}>
                  {item.url ? (
                    <Text style={styles.headlineSource}>{getSourceFromUrl(item.url)}</Text>
                  ) : null}
                  {item.date ? (
                    <>
                      {item.url ? <Text style={styles.headlineSeparator}>•</Text> : null}
                      <Text style={styles.headlineDate}>{formatHeadlineDate(item.date)}</Text>
                    </>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderText}>{headlinesFallbackMessage}</Text>
        )}
      </View>

      {earningsEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Today's Earnings</Text>
          </View>
          <View style={styles.calendarContainer}>
            {earningsEvents.slice(0, 8).map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <View style={styles.eventDot} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventSymbol}>{event.symbol}</Text>
                  {event.hour ? <Text style={styles.eventTime}>{event.hour}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

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

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Perplexity Search • Updated {new Date().toLocaleTimeString()}
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
    padding: theme.spacing.md,
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
  headlineTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  headlineSnippet: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  headlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
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
  eventSymbol: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
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
