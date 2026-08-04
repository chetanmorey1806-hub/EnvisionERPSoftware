export const formatDate = (dateString, formatType = 'standard') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  if (formatType === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
};