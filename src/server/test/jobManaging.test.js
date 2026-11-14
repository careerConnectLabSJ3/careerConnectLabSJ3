import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import { getJobLifecycleStatus } from '../controllers/applicationController.js';
import {
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  duplicateJob
} from '../controllers/jobController.js';
import { searchJob, checkUpcomingDeadlines } from '../controllers/jobSeekerController.js';

const recruiterId = '507f1f77bcf86cd799439011';
const otherRecruiterId = '507f1f77bcf86cd799439022';
const jobId = '507f1f77bcf86cd799439099';
const recruiter = { id: recruiterId, role: 'recruiter' };

function calendarDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validBody(overrides = {}) {
  return {
    title: 'Software Engineer',
    company: 'Tech Corp',
    department: 'Engineering',
    location: 'Montreal',
    description: 'Develop scalable web systems.',
    requirements: 'Node.js and React.',
    deadline: calendarDate(7),
    publishDate: calendarDate(0),
    ...overrides
  };
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    }
  };
}

// --- Existing Lifecycle Unit Tests ---

test('Job Lifecycle Status - Active Job', () => {
  const mockJob = {
    status: 'Active',
    deadline: calendarDate(5)
  };
  assert.strictEqual(getJobLifecycleStatus(mockJob), 'Active');
});

test('Job Lifecycle Status - Expired Job', () => {
  const mockJob = {
    status: 'Active',
    deadline: calendarDate(-1)
  };
  assert.strictEqual(getJobLifecycleStatus(mockJob), 'Closed');
});

test('Job Lifecycle Status - Draft Job', () => {
  const mockJob = {
    status: 'Draft',
    deadline: calendarDate(10)
  };
  assert.strictEqual(getJobLifecycleStatus(mockJob), 'Closed');
});

// --- US-07 Drafts & Scheduled Publication Tests ---

test('createJob saves explicitly requested Draft status', async t => {
  t.mock.method(Job, 'create', async data => data);

  const res = response();
  await createJob({
    session: { user: recruiter },
    body: validBody({ status: 'Draft' })
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.job.status, 'Draft');
});

test('createJob forces status to Draft when publishDate is in the future', async t => {
  t.mock.method(Job, 'create', async data => data);

  const res = response();
  await createJob({
    session: { user: recruiter },
    body: validBody({ status: 'Active', publishDate: calendarDate(3) })
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.job.status, 'Draft');
});

// --- US-07 Edit & Update Job Tests ---

test('updateJob rejects invalid job IDs, missing jobs, and non-owners', async t => {
  // Invalid ID
  let res = response();
  await updateJob({ session: { user: recruiter }, params: { jobId: 'bad-id' }, body: validBody() }, res);
  assert.equal(res.statusCode, 400);

  // Job not found
  t.mock.method(Job, 'findById', async () => null);
  res = response();
  await updateJob({ session: { user: recruiter }, params: { jobId }, body: validBody() }, res);
  assert.equal(res.statusCode, 404);

  // Owned by different recruiter
  t.mock.method(Job, 'findById', async () => ({ _id: jobId, recruiter: otherRecruiterId }));
  res = response();
  await updateJob({ session: { user: recruiter }, params: { jobId }, body: validBody() }, res);
  assert.equal(res.statusCode, 403);
});

test('updateJob updates fields, respects Draft status, and auto-drafts future publish dates', async t => {
  t.mock.method(Job, 'findById', async () => ({ _id: jobId, recruiter: recruiterId, status: 'Active' }));
  t.mock.method(Job, 'findByIdAndUpdate', async (_id, updateData) => ({ _id, ...updateData }));

  // Saving an edit as Draft
  let res = response();
  await updateJob({
    session: { user: recruiter },
    params: { jobId },
    body: validBody({ title: 'Updated Engineer', status: 'Draft' })
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.job.title, 'Updated Engineer');
  assert.equal(res.body.job.status, 'Draft');

  // Rescheduling to a future date forces Draft even if Active was requested
  res = response();
  await updateJob({
    session: { user: recruiter },
    params: { jobId },
    body: validBody({ status: 'Active', publishDate: calendarDate(5) })
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.job.status, 'Draft');
});

// --- US-07 Status Toggle & Archiving Tests ---

test('updateJobStatus changes status and blocks publishing expired jobs', async t => {
  // Block publishing if deadline has passed
  t.mock.method(Job, 'findById', async () => ({
    _id: jobId,
    recruiter: recruiterId,
    status: 'Draft',
    deadline: calendarDate(-2),
    async save() {}
  }));

  let res = response();
  await updateJobStatus({
    session: { user: recruiter },
    params: { jobId },
    body: { status: 'Active' }
  }, res);
  assert.equal(res.statusCode, 400);

  // Allow archiving (Closing) an active job
  const activeJob = {
    _id: jobId,
    recruiter: recruiterId,
    status: 'Active',
    deadline: calendarDate(5),
    async save() {}
  };
  t.mock.method(Job, 'findById', async () => activeJob);

  res = response();
  await updateJobStatus({
    session: { user: recruiter },
    params: { jobId },
    body: { status: 'Closed' }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(activeJob.status, 'Closed');
});

// --- US-07 Duplication Tests ---

test('duplicateJob creates a Draft copy with 0 applications', async t => {
  const existingJob = {
    _id: jobId,
    recruiter: recruiterId,
    title: 'Backend Developer',
    company: 'Acme Inc',
    department: 'IT',
    location: 'Remote',
    description: 'API design',
    requirements: 'Express & MongoDB',
    deadline: calendarDate(10),
    status: 'Active',
    applicationsCount: 14
  };

  t.mock.method(Job, 'findById', async () => existingJob);
  t.mock.method(Job, 'create', async data => data);

  const res = response();
  await duplicateJob({ session: { user: recruiter }, params: { jobId } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.job.title, 'Backend Developer (Copy)');
  assert.equal(res.body.job.status, 'Draft');
  assert.equal(res.body.job.applicationsCount, 0);
  assert.equal(res.body.job.recruiter, recruiterId);
});

// --- US-07 Atomic Delete Transaction Tests ---

test('deleteJob deletes applications and job inside a transaction', async t => {
  let deletedApps = false;
  let deletedJob = false;
  let sessionEnded = false;

  const mockSession = {
    async withTransaction(fn) {
      await fn();
    },
    async endSession() {
      sessionEnded = true;
    }
  };

  t.mock.method(mongoose, 'startSession', async () => mockSession);
  t.mock.method(Job, 'findById', async () => ({
    _id: jobId,
    recruiter: recruiterId,
    async deleteOne(opts) {
      assert.equal(opts.session, mockSession);
      deletedJob = true;
    }
  }));
  t.mock.method(JobApplication, 'deleteMany', async (filter, opts) => {
    assert.deepEqual(filter, { job: jobId });
    assert.equal(opts.session, mockSession);
    deletedApps = true;
  });

  const res = response();
  await deleteJob({ session: { user: recruiter }, params: { jobId } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(deletedApps, true);
  assert.equal(deletedJob, true);
  assert.equal(sessionEnded, true);
});

// --- US-07 Job Seeker Visibility Filtering Tests ---

test('searchJob and checkUpcomingDeadlines exclude Drafts and future publishDate jobs', async t => {
  let capturedSearchQuery = null;
  let capturedDeadlineQuery = null;

  t.mock.method(Job, 'find', query => {
    if (query.deadline) {
      capturedDeadlineQuery = query;
    } else {
      capturedSearchQuery = query;
    }
    return {
      sort: async () => []
    };
  });

  const searchRes = response();
  await searchJob({ query: {} }, searchRes);
  assert.equal(searchRes.statusCode, 200);
  assert.deepEqual(capturedSearchQuery.status, { $ne: 'Draft' });
  assert.ok(Array.isArray(capturedSearchQuery.$or));

  const deadlineRes = response();
  await checkUpcomingDeadlines({}, deadlineRes);
  assert.equal(deadlineRes.statusCode, 200);
  assert.deepEqual(capturedDeadlineQuery.status, { $ne: 'Draft' });
});
