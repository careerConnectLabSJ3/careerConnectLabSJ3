// Returns formatted date
export function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
}


// Application status class for CSS
export function statusClass(status) {
  return `application-status application-status-${String(status).toLowerCase()}`;
}


// Return today's local calendar date in YYYY-MM-DD format
export function getTodayDate() {
  // Use the recruiter's local calendar date, rather than UTC.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


