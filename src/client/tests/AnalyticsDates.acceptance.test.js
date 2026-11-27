import { expect, it } from 'vitest';
import { startForRange, weeklyCounts, weekKey } from '../utils/analyticsDates';

it.each(['30', '90'])('includes the first partial week of a %s-day range', range => {
  const now = new Date(2026, 10, 30, 12);
  const start = startForRange(range, now);
  const applications = [{ appliedAt: start.toISOString() }, { appliedAt: now.toISOString() }];
  const weeks = weeklyCounts(applications, range, now);
  expect(weeks[0].key).toBe(weekKey(start));
  expect(weeks[0].count).toBe(1);
  expect(weeks.at(-1).key).toBe('2026-11-30');
  expect(weeks.at(-1).count).toBe(1);
  expect(weeks.reduce((sum, week) => sum + week.count, 0)).toBe(2);
});

it('retains more than eight weeks and fills gaps in all-time history', () => {
  const now = new Date(2026, 10, 30, 12);
  const applications = [{ appliedAt: new Date(2026, 7, 3, 12).toISOString() }, { appliedAt: now.toISOString() }];
  const weeks = weeklyCounts(applications, 'all', now);
  expect(weeks.length).toBeGreaterThan(8);
  expect(weeks[0]).toMatchObject({ key: '2026-08-03', count: 1 });
  expect(weeks[1].count).toBe(0);
  expect(weeks.at(-1).count).toBe(1);
  expect(weeks.reduce((sum, week) => sum + week.count, 0)).toBe(2);
});
