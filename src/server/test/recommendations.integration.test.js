import { afterAll, beforeAll, expect, jest, test } from '@jest/globals';
import { once } from 'node:events';
import bcrypt from 'bcrypt';
import app from '../server.js';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import User from '../models/user.js';

let server;
let origin;
let cookie;
beforeAll(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = 'http://127.0.0.1:' + server.address().port;
  jest.spyOn(User, 'findOne').mockResolvedValue({
    _id: 'user', role: 'job_seeker', password: await bcrypt.hash('test-password', 4)
  });
  const response = await fetch(origin + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seeker@example.test', password: 'test-password' })
  });
  expect(response.status).toBe(200);
  cookie = response.headers.get('set-cookie').split(';')[0];
});
afterAll(() => new Promise(resolve => server.close(resolve)));

const search = '/api/jobs/search?';
test('requires a session and validates the search view', async () => {
  expect((await fetch(origin + '/api/jobs/recommendations')).status).toBe(401);
  expect((await fetch(origin + '/api/jobs/matches')).status).toBe(401);
  expect((await fetch(origin + '/api/jobs/matches', {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: '{}'
  })).status).toBe(400);
  expect((await fetch(origin + search + 'view=unknown', { headers: { cookie } })).status).toBe(400);
});

test('records an active search and later recommends a newer posting for that seeker', async () => {
  const headers = { cookie };
  const recentSearches = [];
  const save = jest.spyOn(User, 'updateOne').mockImplementation(async (filter, update) => {
    expect(filter._id).toBe('user');
    expect(update.$push.recentSearches.$slice).toBe(-100);
    recentSearches.push(...update.$push.recentSearches.$each);
  });
  jest.spyOn(User, 'findById').mockReturnValue({ select: () => ({ lean: async () => ({ recentSearches }) }) });
  const matches = () => fetch(origin + '/api/jobs/recommendations', { headers }).then(res => res.json());
  expect(await matches()).toEqual([]);
  const base = { title: 'C++ engineer', status: 'Active', deadline: '2999-01-01' };
  const jobs = [{ ...base, _id: 'one' }, { ...base, _id: 'two', requirements: 'SQL' },
    { ...base, _id: 'expired', deadline: '2000-01-01' }, { ...base, _id: 'closed', status: 'Closed' }];
  const find = jest.spyOn(Job, 'find').mockReturnValue({ sort: () => ({ lean: async () => jobs }) });
  const params = new URLSearchParams({ keywords: 'C++ SQL' });
  const result = await fetch(origin + search + params, { headers, method: 'POST' });
  expect((await result.json()).map(job => job._id)).toEqual(['two', 'one']);
  expect(find.mock.calls[0][0].$and[0].$or).toContainEqual({ title: { $regex: 'c\\+\\+|sql', $options: 'i' } });
  const past = await fetch(origin + search + params + '&view=past', { headers });
  expect((await past.json()).map(job => job._id)).toEqual(['expired', 'closed']);
  expect(save).toHaveBeenCalledTimes(1);
  const applied = jest.spyOn(JobApplication, 'distinct').mockResolvedValue(['applied']);
  const searched = recentSearches[0].searchedAt.getTime();
  find.mockReturnValue({ lean: async () => [
    { ...base, _id: 'older', publishedAt: new Date(searched - 1) },
    { ...base, _id: 'new', publishedAt: new Date(searched + 1) }
  ] });
  expect(await matches()).toEqual([expect.objectContaining({ _id: 'new', sourceSearch: 'C++ SQL' })]);
  expect(applied).toHaveBeenCalledWith('job', { applicant: 'user' });
  expect(find.mock.lastCall[0]._id.$nin).toEqual(['applied']);
});
