import { describe, test, expect } from '@jest/globals';
import { formatDate, statusClass, getTodayDate } from '../utils/jobUtils.js';

describe('Utility Functions', () => {
  
  describe('formatDate', () => {
    test('returns "Not available" for falsy values', () => {
      expect(formatDate(null)).toBe('Not available');
      expect(formatDate(undefined)).toBe('Not available');
      expect(formatDate('')).toBe('Not available');
    });

    test('returns "Not available" for invalid date strings', () => {
      expect(formatDate('not-a-date')).toBe('Not available');
      expect(formatDate('2026-13-45')).toBe('Not available');
    });

    test('returns a formatted date string for valid inputs', () => {
      // Depending on locale configuration, toLocaleDateString() varies, 
      // but we can check that it returns a non-error string for valid dates.
      const result = formatDate('2026-06-15');
      expect(result).not.toBe('Not available');
      expect(typeof result).toBe('string');
    });
  });

  describe('statusClass', () => {
    test('correctly converts status to lowercase and formats CSS class', () => {
      expect(statusClass('Open')).toBe('application-status application-status-open');
      expect(statusClass('CLOSED')).toBe('application-status application-status-closed');
      expect(statusClass('In-Review')).toBe('application-status application-status-in-review');
    });

    test('handles non-string inputs safely using String() conversion', () => {
      expect(statusClass(123)).toBe('application-status application-status-123');
    });
  });

  describe('getTodayDate', () => {
    test('returns date in YYYY-MM-DD format', () => {
      const result = getTodayDate();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(result).toMatch(dateRegex);
    });

    test('matches the actual local calendar date components', () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const expected = `${year}-${month}-${day}`;

      expect(getTodayDate()).toBe(expected);
    });
  });

});
