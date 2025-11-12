import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import PortfolioHoldingsScreen from './PortfolioHoldingsScreen';
import PortfolioStatisticsScreen from './PortfolioStatisticsScreen';

const Tab = createMaterialTopTabNavigator();
const TAB_LABELS = {
  Holdings: 'Portfolio',
  Statistics: 'Statistics',
};

const PortfolioTabBar = ({ state, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={TAB_LABELS[route.name] || route.name}
              testID={`portfolio-tab-${route.name.toLowerCase()}`}
              style={styles.tabButton}
              activeOpacity={0.8}
              onPress={onPress}
              onLongPress={onLongPress}
            >
              <Text
                style={[
                  styles.tabLabel,
                  focused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {TAB_LABELS[route.name] || route.name}
              </Text>
              <View
                style={[
                  styles.tabUnderline,
                  focused && styles.tabUnderlineActive,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/**
 * PortfolioScreen Component
 * Main portfolio view with top tab navigation for Holdings and Statistics
 */
const PortfolioScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddEditStock')}
          style={styles.addButton}
        >
          <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <Tab.Navigator tabBar={(props) => <PortfolioTabBar {...props} />}>
        <Tab.Screen
          name="Holdings"
          component={PortfolioHoldingsScreen}
          options={{ title: 'Portfolio' }}
        />
        <Tab.Screen
          name="Statistics"
          component={PortfolioStatisticsScreen}
          options={{ title: 'Statistics' }}
        />
      </Tab.Navigator>
    </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  addButton: {
    padding: theme.spacing.xs,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'none',
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },
  tabLabelInactive: {
    color: theme.colors.textSecondary,
  },
  tabBarContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tabUnderline: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: theme.spacing.xs,
  },
  tabUnderlineActive: {
    backgroundColor: theme.colors.primary,
  },
});

export default PortfolioScreen;
