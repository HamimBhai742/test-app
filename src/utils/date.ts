/**
 * Shared local date utility helper.
 * Formats a given Date object (or defaults to current Date) as YYYY-MM-DD
 * matching the user's local timezone calendar day instead of UTC.
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
