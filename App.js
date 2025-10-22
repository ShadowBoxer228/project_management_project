import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import StockListScreen from './screens/StockListScreen.js';
import StockDetailScreen from './screens/StockDetailScreen.js';
import NewsSummaryScreen from './screens/NewsSummaryScreen.js';
import { theme } from './utils/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function StocksStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
      }}
    >
      <Stack.Screen
        name="StockList"
        component={StockListScreen}
        options={{ title: 'Markets' }}
      />
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={({ route }) => ({
          title: route.params?.symbol || 'Stock Detail',
          headerBackTitleVisible: false,
        })}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Stocks') {
                  iconName = focused ? 'trending-up' : 'trending-up-outline';
                } else if (route.name === 'News') {
                  iconName = focused ? 'newspaper' : 'newspaper-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.textSecondary,
              tabBarStyle: {
                backgroundColor: theme.colors.background,
                borderTopColor: theme.colors.border,
                borderTopWidth: 1,
                paddingTop: 5,
                height: 85,
                paddingBottom: 30,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
                marginTop: -5,
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Stocks" component={StocksStack} />
            <Tab.Screen name="News" component={NewsSummaryScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
