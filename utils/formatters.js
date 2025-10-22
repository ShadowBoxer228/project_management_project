export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatLargeNumber = (value) => {
  if (value === null || value === undefined) return 'N/A';

  const absValue = Math.abs(value);

  if (absValue >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }

  return formatCurrency(value);
};

export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatVolume = (value) => {
  if (value === null || value === undefined) return 'N/A';

  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }

  return value.toLocaleString();
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getTimeUntilMarketOpen = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Market opens at 9:30 AM EST (14:30 UTC during standard time, 13:30 UTC during daylight saving)
  const marketOpenHour = 9;
  const marketOpenMinute = 30;

  // If it's weekend (Saturday = 6, Sunday = 0)
  if (currentDay === 0 || currentDay === 6) {
    const daysUntilMonday = currentDay === 0 ? 1 : 2;
    return `${daysUntilMonday} day${daysUntilMonday > 1 ? 's' : ''}`;
  }

  // Calculate time until market open
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const marketOpenTotalMinutes = marketOpenHour * 60 + marketOpenMinute;

  let minutesUntilOpen = marketOpenTotalMinutes - currentTotalMinutes;

  // If market has already opened today, calculate time until tomorrow's open
  if (minutesUntilOpen < 0) {
    minutesUntilOpen = 24 * 60 + minutesUntilOpen;
  }

  const hours = Math.floor(minutesUntilOpen / 60);
  const minutes = minutesUntilOpen % 60;

  return `${hours}h ${minutes}m`;
};

export const isMarketOpen = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Weekend check
  if (currentDay === 0 || currentDay === 6) return false;

  // Market hours: 9:30 AM - 4:00 PM EST
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  return currentTotalMinutes >= marketOpen && currentTotalMinutes < marketClose;
};
