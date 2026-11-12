

// Job status returns Open or Closed depending on if deadline date has passed
export function checkJobStatus(deadlineString) {
  if (!deadlineString) return 'Open'; // Default fallback if no deadline is specified
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for an accurate day-only comparison
  
  const deadlineDate = new Date(deadlineString);
  deadlineDate.setHours(0, 0, 0, 0);

  // If the deadline is today or in the future, it's Open; otherwise Closed
  return deadlineDate >= today ? 'Open' : 'Closed';
};


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


