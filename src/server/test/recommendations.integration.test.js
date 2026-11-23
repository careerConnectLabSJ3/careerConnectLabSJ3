import { afterAll, beforeAll, expect, jest, test } from '@jest/globals';
import { once } from 'node:events';
import bcrypt from 'bcrypt';
import app from '../server.js';
import Job from '../models/job.js';
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

const path = '/api/jobs/recommendations?';
test('requires a session and rejects blank keywords before querying jobs', async () => {
  const find = jest.spyOn(Job, 'find');
  expect((await fetch(origin + path + 'keywords=react')).status).toBe(401);
  expect((await fetch(origin + path + 'keywords=%20', { headers: { cookie } })).status).toBe(400);
  expect(find).not.toHaveBeenCalled();
});

test('searches published active jobs with literal keywords and returns recommendation summaries', async () => {
  const find = jest.spyOn(Job, 'find').mockReturnValue({ lean: async () => [{
    _id: '1', title: 'C++ engineer', requirements: 'SQL', company: 'Test Co', location: 'Remote',
    status: 'Active', deadline: '2999-01-01'
  }] });
  const response = await fetch(origin + path + new URLSearchParams({ keywords: 'C++ SQL sql' }), { headers: { cookie } });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{
    _id: '1', title: 'C++ engineer', company: 'Test Co', location: 'Remote',
    jobType: 'Not specified', matchedKeywords: ['c++', 'sql']
  }]);
  const [filter] = find.mock.calls[0];
  expect(filter.status).toBe('Active');
  expect(filter.$and[0].$or).toEqual([{ publishDate: null }, { publishDate: { $lte: new Date().toISOString().slice(0, 10) } }]);
  expect(filter.$and[1].$or).toContainEqual({ title: { $regex: 'c\\+\\+|sql', $options: 'i' } });
  find.mockReturnValue({ lean: async () => [] });
  const empty = await fetch(origin + path + 'keywords=nursing', { headers: { cookie } });
  expect(empty.status).toBe(200);
  expect(await empty.json()).toEqual([]);
});
