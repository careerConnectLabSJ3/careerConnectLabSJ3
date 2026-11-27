import { afterEach, expect, jest, test } from '@jest/globals';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import { getRecruiterAnalytics } from '../controllers/recruiterAnalyticsController.js';

const request = (query = {}) => ({ session: { user: { id: 'recruiter', role: 'recruiter' } }, query });
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn() });
afterEach(() => jest.restoreAllMocks());

test('aggregates only owned jobs and the selected submission period without applicant profiles', async () => {
  const select = jest.fn(() => ({ lean: async () => [{ _id: 'owned', title: 'Engineer' }, { _id: 'empty', title: 'Designer' }] }));
  const find = jest.spyOn(Job, 'find').mockReturnValue({ select });
  const aggregate = jest.spyOn(JobApplication, 'aggregate').mockResolvedValue([
    { _id: { job: 'owned', status: 'Applied' }, count: 2 },
    { _id: { job: 'owned', status: 'Offer' }, count: 1 }
  ]);
  const res = response();
  const since = '2026-11-01T04:00:00.000Z';
  await getRecruiterAnalytics(request({ since }), res);
  expect(find).toHaveBeenCalledWith({ recruiter: 'recruiter' });
  expect(select).toHaveBeenCalledWith('_id title');
  expect(aggregate.mock.calls[0][0][0]).toEqual({ $match: { job: { $in: ['owned', 'empty'] }, appliedAt: { $gte: new Date(since) } } });
  expect(res.json).toHaveBeenCalledWith([
    { _id: 'owned', title: 'Engineer', total: 3, counts: { Applied: 2, Offer: 1 } },
    { _id: 'empty', title: 'Designer', total: 0, counts: {} }
  ]);
});

test('rejects unauthorized access and malformed dates before querying', async () => {
  const find = jest.spyOn(Job, 'find');
  for (const req of [{ session: {}, query: {} }, { session: { user: { role: 'job_seeker' } }, query: {} }, request({ since: 'invalid' }), request({ since: ['2026-11-01'] })]) {
    const res = response();
    await getRecruiterAnalytics(req, res);
    expect(res.status.mock.calls[0][0]).toBeGreaterThanOrEqual(400);
  }
  expect(find).not.toHaveBeenCalled();
});

test('returns empty aggregates without querying applications for a recruiter with no jobs', async () => {
  jest.spyOn(Job, 'find').mockReturnValue({ select: () => ({ lean: async () => [] }) });
  const aggregate = jest.spyOn(JobApplication, 'aggregate');
  const res = response();
  await getRecruiterAnalytics(request(), res);
  expect(aggregate).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith([]);
});
