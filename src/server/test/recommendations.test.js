import { test, expect } from '@jest/globals';
import { rankRecommendations } from '../controllers/jobSeekerController.js';

test('ranks distinct keyword matches across fields and omits expired and unrelated jobs', () => {
  const base = { title: 'Engineer', status: 'Active', deadline: '2999-01-01' };
  const jobs = [
    { ...base, _id: '1', title: 'React developer' },
    { ...base, _id: '2', requirements: 'REACT', location: 'Remote', jobType: 'Contract' },
    { ...base, _id: '3', description: 'Bookkeeping' },
    { ...base, _id: '4', description: 'React', deadline: '2000-01-01' }
  ];
  const result = rankRecommendations(jobs, ['react', 'remote']);
  expect(result.map(job => job._id)).toEqual(['2', '1']);
  expect(result[0].matchedKeywords).toEqual(['react', 'remote']);
  expect(result[1].jobType).toBe('Not specified');
});
