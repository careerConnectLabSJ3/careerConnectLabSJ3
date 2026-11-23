import { test, expect } from '@jest/globals';
import { freshMatches } from '../controllers/jobSeekerController.js';

test('returns three newest open jobs published after a matching search, once per job', () => {
  const jobs = Array.from({ length: 8 }, (_, i) => ({
    _id: String(i), title: 'SQL analyst', status: 'Active', deadline: '2999-01-01',
    publishedAt: new Date(2026, 0, i + 1)
  }));
  jobs[6].deadline = '2000-01-01';
  jobs[7].title = 'Writer';
  const history = ['sql', 'analyst'].map(keywords => ({ keywords, searchedAt: new Date(2026, 0, 2) }));
  expect(freshMatches(jobs, history, new Date(2026, 0, 1)).map(job => job._id)).toEqual(['5', '4', '3']);
  expect(freshMatches(jobs.slice(0, 2), history, 0)).toEqual([]);
  expect(freshMatches(jobs, history, new Date(2026, 0, 8))).toEqual([]);
});
