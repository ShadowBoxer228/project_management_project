import React, { createContext, useState, useEffect, useContext } from 'react';
import * as PortfolioStorage from '../services/portfolioStorage';
import { getBulkSnapshots } from '../services/polygonAPI';
import sp100Data from '../data/sp100.json';

const PortfolioContext = createContext();

/**
 * Portfolio Context Provider
 * Manages portfolio state, CRUD operations, and shared stock quotes cache
 */
export const PortfolioProvider = ({ children }) => {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quotes, setQuotes] = useState({}); // Shared quotes cache
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Load portfolio and quotes on mount
  useEffect(() => {
    loadPortfolio();
    fetchQuotes();
  }, []);

  /**
   * Fetch all stock quotes
   */
  const fetchQuotes = async () => {
    try {
      setQuotesLoading(true);
      if (__DEV__) {
        console.log('[PortfolioContext] Fetching quotes for all S&P 100 stocks');
      }
      const symbols = sp100Data.map((stock) => stock.symbol);
      const quotesData = await getBulkSnapshots(symbols);
      setQuotes(quotesData);
      if (__DEV__) {
        console.log('[PortfolioContext] Quotes fetched:', Object.keys(quotesData).length);
      }
    } catch (error) {
      console.error('[PortfolioContext] Error fetching quotes:', error);
    } finally {
      setQuotesLoading(false);
    }
  };

  /**
   * Get quote for a specific symbol
   * @param {string} symbol - Stock symbol
   * @returns {Object|null} Quote data
   */
  const getQuote = (symbol) => {
    return quotes[symbol] || null;
  };

  /**
   * Get current price for a symbol
   * @param {string} symbol - Stock symbol
   * @returns {number|null} Current price
   */
  const getCurrentPrice = (symbol) => {
    const quote = quotes[symbol];
    if (!quote) return null;
    return quote.c || null;
  };

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
      // Also refresh quotes
      await fetchQuotes();
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
    quotes,
    quotesLoading,
    addHolding,
    updateHolding,
    deleteHolding,
    clearPortfolio,
    refreshPortfolio,
    fetchQuotes,
    getQuote,
    getCurrentPrice,
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
