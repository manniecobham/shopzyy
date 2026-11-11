export const DayPhrase = {
  span(days: number): string {
    if (days < 14) return days === 1 ? '1 day' : `${days} days`;
    if (days < 60) return `${Math.round(days / 7)} weeks`;
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  },

  ago(days: number): string {
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${DayPhrase.span(days)} ago`;
  },

  cadence(days: number): string {
    if (days <= 1) return 'daily';
    if (days >= 6 && days <= 8) return 'weekly';
    if (days >= 13 && days <= 16) return 'every 2 weeks';
    if (days >= 27 && days <= 33) return 'monthly';
    if (days < 14) return `every ${days} days`;
    if (days < 60) return `every ${Math.round(days / 7)} weeks`;
    return `every ${Math.round(days / 30)} months`;
  },
};
