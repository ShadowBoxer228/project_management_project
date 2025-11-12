import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import PortfolioHoldingsScreen from './PortfolioHoldingsScreen';
import PortfolioStatisticsScreen from './PortfolioStatisticsScreen';

const Tab = createMaterialTopTabNavigator();

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

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text,
          tabBarLabelStyle: {
            fontSize: 16,
            fontWeight: '600',
            textTransform: 'none',
            marginTop: 0,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.cardBackground,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.primary,
            height: 3,
          },
          tabBarPressColor: theme.colors.surface,
        }}
      >
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
});

export default PortfolioScreen;
