import { expect, jest, test } from '@jest/globals';
import User from '../models/user.js';
import { getMyFavoriteJobs } from '../controllers/favoriteJobsController.js';

test('returns the effective status of saved jobs, including early closures and expired active jobs', async () => {
  const favoriteJobs = [
    { title: 'Hiring', status: 'Active', deadline: '2999-01-01' },
    { title: 'Closed early', status: 'Closed', deadline: '2999-01-01' },
    { title: 'Expired', status: 'Active', deadline: '2000-01-01' }
  ];
  jest.spyOn(User, 'findById').mockReturnValue({
    populate: () => ({ lean: async () => ({ favoriteJobs }) })
  });
  const res = { json: jest.fn() };
  await getMyFavoriteJobs({ session: { user: { id: 'seeker', role: 'job_seeker' } } }, res);
  expect(res.json).toHaveBeenCalledWith([favoriteJobs[0], favoriteJobs[1], { ...favoriteJobs[2], status: 'Closed' }]);
});
