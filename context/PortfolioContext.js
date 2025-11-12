import React, { createContext, useState, useEffect, useContext } from 'react';
import * as PortfolioStorage from '../services/portfolioStorage';

const PortfolioContext = createContext();

/**
 * Portfolio Context Provider
 * Manages portfolio state and provides CRUD operations
 */
export const PortfolioProvider = ({ children }) => {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load portfolio on mount
  useEffect(() => {
    loadPortfolio();
  }, []);

  /**
   * Load portfolio from storage
   */
  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const data = await PortfolioStorage.getPortfolio();
      setHoldings(data);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh portfolio (for pull-to-refresh)
   */
  const refreshPortfolio = async () => {
    try {
      setRefreshing(true);
      const data = await PortfolioStorage.getPortfolio();
      setHoldings(data);
    } catch (error) {
      console.error('Error refreshing portfolio:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Add a new holding
   * @param {Object} holding - Holding data
   * @returns {Promise<boolean>} Success status
   */
  const addHolding = async (holding) => {
    try {
      const success = await PortfolioStorage.addHolding(holding);
      if (success) {
        await loadPortfolio();
        return true;
      }
      return false;
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
  const updateHolding = async (id, updates) => {
    try {
      const success = await PortfolioStorage.updateHolding(id, updates);
      if (success) {
        await loadPortfolio();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating holding:', error);
      return false;
    }
  };

  /**
   * Delete a holding
   * @param {string} id - Holding ID
   * @returns {Promise<boolean>} Success status
   */
  const deleteHolding = async (id) => {
    try {
      const success = await PortfolioStorage.deleteHolding(id);
      if (success) {
        await loadPortfolio();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting holding:', error);
      return false;
    }
  };

  /**
   * Clear entire portfolio
   * @returns {Promise<boolean>} Success status
   */
  const clearPortfolio = async () => {
    try {
      const success = await PortfolioStorage.clearPortfolio();
      if (success) {
        setHoldings([]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing portfolio:', error);
      return false;
    }
  };

  /**
   * Check if symbol exists in portfolio
   * @param {string} symbol - Stock symbol
   * @returns {boolean} True if symbol exists
   */
  const hasSymbol = (symbol) => {
    return holdings.some(h => h.symbol === symbol);
  };

  const value = {
    holdings,
    loading,
    refreshing,
    addHolding,
    updateHolding,
    deleteHolding,
    clearPortfolio,
    refreshPortfolio,
    hasSymbol,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

/**
 * Custom hook to use portfolio context
 */
export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export default PortfolioContext;
