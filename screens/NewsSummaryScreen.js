import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { getTimeUntilMarketOpen, isMarketOpen } from '../utils/formatters';
import { getDailyMarketSummary } from '../services/perplexityAPI';
import { getEconomicCalendar, getEarningsCalendar } from '../services/finnhubAPI';

export default function NewsSummaryScreen() {
  const [marketSummary, setMarketSummary] = useState('');
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
      const [summary, economicData, earningsData] = await Promise.all([
        getDailyMarketSummary(),
        getEconomicCalendar(),
        getEarningsCalendar(),
      ]);

      setMarketSummary(summary || 'Market summary unavailable. Please check your Perplexity API key.');
      setEconomicEvents(economicData?.economicCalendar || []);
      setEarningsEvents(earningsData?.earningsCalendar || []);
    } catch (error) {
      console.error('Error fetching news data:', error);
      setMarketSummary('Failed to load market summary. Please check your API configuration.');
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

  const parseSummary = (summary) => {
    if (!summary) return { sections: [], finalAdvice: '' };

    const sections = [];
    let currentSection = null;
    const lines = summary.split('\n');

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (trimmedLine.match(/^\d+\.\s+[A-Z]/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: trimmedLine.replace(/^\d+\.\s+/, '').replace(/:/g, ''),
          points: [],
        };
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        if (currentSection) {
          currentSection.points.push(trimmedLine.replace(/^[-•]\s+/, ''));
        }
      } else if (trimmedLine.length > 0 && currentSection && !trimmedLine.match(/^\d+\./)) {
        currentSection.points.push(trimmedLine);
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    const finalAdviceSection = sections.find((s) =>
      s.title.toLowerCase().includes('final') || s.title.toLowerCase().includes('strategy')
    );
    const finalAdvice = finalAdviceSection
      ? finalAdviceSection.points.join(' ')
      : 'Monitor market conditions closely and manage risk appropriately.';

    return {
      sections: sections.filter((s) => s !== finalAdviceSection),
      finalAdvice,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const { sections, finalAdvice } = parseSummary(marketSummary);
  const today = new Date();

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
          <Text style={styles.headerTitle}>Market Analysis</Text>
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
            {!marketIsOpen && (
              <Text style={styles.marketOpenTime}>Opens in {timeUntilOpen}</Text>
            )}
          </View>
        </View>
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
                  {event.hour && <Text style={styles.eventTime}>{event.hour}</Text>}
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
                    {event.time && (
                      <>
                        <Text style={styles.eventDivider}>•</Text>
                        <Text style={styles.eventTime}>{formatEventTime(event.time)}</Text>
                      </>
                    )}
                  </View>
                </View>
                {event.impact && (
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
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>AI Market Summary</Text>
        </View>

        {sections.length > 0 ? (
          sections.map((section, index) => (
            <View key={index} style={styles.summarySection}>
              <Text style={styles.summarySectionTitle}>{section.title}</Text>
              {section.points.map((point, pIndex) => (
                <View key={pIndex} style={styles.bulletPoint}>
                  <View style={styles.bullet} />
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.summaryText}>{marketSummary}</Text>
        )}
      </View>

      <View style={[styles.section, styles.adviceSection]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={20} color={theme.colors.warning} />
          <Text style={[styles.sectionTitle, { color: theme.colors.warning }]}>
            Trading Strategy
          </Text>
        </View>
        <View style={styles.adviceCard}>
          <Text style={styles.adviceText}>{finalAdvice}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Perplexity AI • Updated {new Date().toLocaleTimeString()}
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  impactText: {
    ...theme.typography.small,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summarySection: {
    marginBottom: theme.spacing.lg,
  },
  summarySectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    marginRight: theme.spacing.sm,
  },
  bulletText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 20,
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  adviceSection: {
    backgroundColor: theme.colors.warning + '08',
  },
  adviceCard: {
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    ...theme.shadows.card,
  },
  adviceText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
