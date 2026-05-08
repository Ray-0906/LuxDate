/**
 * Coin service — now delegated to MonetizationController.
 * This file remains for backward compatibility.
 * Import MonetizationController directly for all coin operations.
 */
import MonetizationController from '../engines/MonetizationController.js';

const coinService = {
  async credit(userId, amount, type, options = {}) {
    return MonetizationController.grantCoins(userId, amount, type, options.referenceId || '', options.note || '');
  },

  async debit(userId, amount, type, options = {}) {
    return MonetizationController.deductCoins(userId, amount, type, options.referenceId || '', options.note || '');
  },

  async getBalance(userId) {
    const data = await MonetizationController.getBalance(userId);
    return data?.coinBalance || 0;
  },

  async getTransactions(userId, query = {}) {
    return MonetizationController.getTransactions(userId, query);
  },
};

export default coinService;
