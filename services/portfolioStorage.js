import AsyncStorage from '@react-native-async-storage/async-storage';

const PORTFOLIO_KEY = '@portfolio_holdings';

/**
 * Portfolio Storage Service
 * Handles persistence of portfolio data using AsyncStorage
 */

/**
 * Get all portfolio holdings
 * @returns {Promise<Array>} Array of holdings
 */
export const getPortfolio = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(PORTFOLIO_KEY);
    if (jsonValue != null) {
      const data = JSON.parse(jsonValue);
      if (__DEV__) {
        console.log('Portfolio loaded from storage:', data.holdings?.length || 0, 'holdings');
      }
      return data.holdings || [];
    }
    return [];
  } catch (error) {
    console.error('Error loading portfolio:', error);
    return [];
  }
};

/**
 * Save portfolio holdings
 * @param {Array} holdings - Array of holding objects
 * @returns {Promise<boolean>} Success status
 */
export const savePortfolio = async (holdings) => {
  try {
    const data = {
      holdings,
      lastUpdated: Date.now(),
    };
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(PORTFOLIO_KEY, jsonValue);
    if (__DEV__) {
      console.log('Portfolio saved to storage:', holdings.length, 'holdings');
    }
    return true;
  } catch (error) {
    console.error('Error saving portfolio:', error);
    return false;
  }
};

/**
 * Add a new holding to portfolio
 * @param {Object} holding - Holding object
 * @returns {Promise<boolean>} Success status
 */
export const addHolding = async (holding) => {
  try {
    const holdings = await getPortfolio();
    const newHolding = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...holding,
      addedAt: Date.now(),
    };
    holdings.push(newHolding);
    return await savePortfolio(holdings);
  } catch (error) {
    console.error('Error adding holding:', error);
    return false;
  }
};

/**
 * Update an existing holding
 * @param {string} id - Holding ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export const updateHolding = async (id, updates) => {
  try {
    const holdings = await getPortfolio();
    const index = holdings.findIndex(h => h.id === id);
    if (index !== -1) {
      holdings[index] = {
        ...holdings[index],
        ...updates,
        updatedAt: Date.now(),
      };
      return await savePortfolio(holdings);
    }
    return false;
  } catch (error) {
    console.error('Error updating holding:', error);
    return false;
  }
};

/**
 * Delete a holding from portfolio
 * @param {string} id - Holding ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteHolding = async (id) => {
  try {
    const holdings = await getPortfolio();
    const filtered = holdings.filter(h => h.id !== id);
    if (filtered.length !== holdings.length) {
      return await savePortfolio(filtered);
    }
    return false;
  } catch (error) {
    console.error('Error deleting holding:', error);
    return false;
  }
};

/**
 * Clear all portfolio holdings
 * @returns {Promise<boolean>} Success status
 */
export const clearPortfolio = async () => {
  try {
    await AsyncStorage.removeItem(PORTFOLIO_KEY);
    if (__DEV__) {
      console.log('Portfolio cleared');
    }
    return true;
  } catch (error) {
    console.error('Error clearing portfolio:', error);
    return false;
  }
};

/**
 * Check if a symbol already exists in portfolio
 * @param {string} symbol - Stock symbol
 * @returns {Promise<boolean>} True if symbol exists
 */
export const hasSymbol = async (symbol) => {
  try {
    const holdings = await getPortfolio();
    return holdings.some(h => h.symbol === symbol);
  } catch (error) {
    console.error('Error checking symbol:', error);
    return false;
  }
};
