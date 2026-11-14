import { jest, test } from '@jest/globals';
import assert from 'node:assert/strict';
import Job from '../models/job.js';
import { createJob, getRecruiterJobs } from '../controllers/jobController.js';

const recruiterId = '507f1f77bcf86cd799439011';
const recruiter = { id: recruiterId, role: 'recruiter' };

function calendarDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validBody() {
  return {
    title: ' Junior Developer ',
    company: 'Example Company',
    department: 'Engineering',
    location: 'Montreal',
    description: 'Build web applications.',
    requirements: 'JavaScript knowledge.',
    deadline: calendarDate(),
    publishDate: calendarDate()
  };
}

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code; return this;
    },
    json(body) {
      this.body = body; return this;
    }
  };
}

test('logged-out users and job seekers cannot create or list recruiter jobs', async () => {
  jest.spyOn(Job, 'create').mockImplementation(() => assert.fail('Must not write to the database'));
  jest.spyOn(Job, 'find').mockImplementation(() => assert.fail('Must not read recruiter jobs'));
  for (const handler of [createJob, getRecruiterJobs]) {
    for (const [user, expected] of [[undefined, 401], [{ role: 'job_seeker' }, 403]]) {
      const res = response();
      await handler({ session: { user }, body: validBody() }, res);
      assert.equal(res.statusCode, expected);
    }
  }
});

test('every required field rejects missing, whitespace-only, and non-text values', async () => {
  jest.spyOn(Job, 'create').mockImplementation(() => assert.fail('Invalid data must not be saved'));
  for (const field of Object.keys(validBody())) {
    for (const value of [undefined, '   ', 123, {}]) {
      const res = response();
      await createJob({ session: { user: recruiter }, body: { ...validBody(), [field]: value } }, res);
      assert.equal(res.statusCode, 400, `${field}: ${JSON.stringify(value)}`);
    }
  }
  const res = response();
  await createJob({ session: { user: recruiter } }, res);
  assert.equal(res.statusCode, 400);
});

test('past and impossible deadlines are rejected without saving', async () => {
  jest.spyOn(Job, 'create').mockImplementation(() => assert.fail('Invalid deadlines must not be saved'));
  for (const deadline of [calendarDate(-1), '2099-02-30', '2099-13-01', 'not-a-date', '2099-1-01']) {
    const res = response();
    await createJob({ session: { user: recruiter }, body: { ...validBody(), deadline } }, res);
    assert.equal(res.statusCode, 400, deadline);
  }
});

test('invalid status values are rejected with 400', async () => {
  jest.spyOn(Job, 'create').mockImplementation(() => assert.fail('Invalid status must not be saved'));
  const res = response();
  await createJob({ session: { user: recruiter }, body: { ...validBody(), status: 'Hidden' } }, res);
  assert.equal(res.statusCode, 400);
});

test('today and future deadlines save with session ownership and searchable defaults', async () => {
  jest.spyOn(Job, 'create').mockImplementation(async data => {
    const job = new Job(data);
    await job.validate();
    return job.toObject();
  });
  for (const deadline of [calendarDate(), calendarDate(1)]) {
    const res = response();
    await createJob({
      session: { user: recruiter },
      body: {
        ...validBody(),
        deadline,
        recruiter: 'another-user',
        applicationsCount: 99
      }
    }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.job.title, 'Junior Developer');
    assert.equal(String(res.body.job.recruiter), recruiterId);
    assert.equal(res.body.job.status, 'Active');
    assert.equal(res.body.job.applicationsCount, 0);
    assert.equal(res.body.job.deadline, deadline);
  }
});

test('recruiter list reads only the logged-in recruiter jobs, newest first', async () => {
  const jobs = [{ title: 'My job' }];
  jest.spyOn(Job, 'find').mockImplementation(filter => {
    assert.deepEqual(filter, { recruiter: recruiterId });
    return {
      sort(order) {
        assert.deepEqual(order, { _id: -1 });
        return Promise.resolve(jobs);
      }
    };
  });
  const res = response();
  await getRecruiterJobs({ session: {
    user: recruiter
  }}, res);
  assert.deepEqual(res.body, jobs);
});

test('database save failure returns a useful error without exposing database details', async () => {
  jest.spyOn(Job, 'create').mockImplementation(async () => {
    throw new Error('private database detail');
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = response();
  await createJob({ session: { user: recruiter }, body: validBody() }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'Unable to save your job. Please try again.');
});

test('database list failure returns a useful error', async () => {
  jest.spyOn(Job, 'find').mockImplementation(() => {
    throw new Error('database unavailable');
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = response();
  await getRecruiterJobs({ session: { user: recruiter } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'Unable to load your job postings. Please try again.');
});

