import { jest, test, describe, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import { getJobDetails, getJobLifecycleStatus } from '../controllers/applicationController.js';
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

// `restoreMocks: true` in jest.config.js restores spies between tests, but
// `mockClear` on the shared console spy keeps call counts isolated per test.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// --- Existing Lifecycle Unit Tests ---

describe('getJobLifecycleStatus', () => {
  test('returns Active for an Active job with a future deadline', () => {
    const mockJob = { status: 'Active', deadline: calendarDate(5) };
    expect(getJobLifecycleStatus(mockJob)).toBe('Active');
  });

  test('returns Closed for an Active job with a past deadline', () => {
    const mockJob = { status: 'Active', deadline: calendarDate(-1) };
    expect(getJobLifecycleStatus(mockJob)).toBe('Closed');
  });

  test('returns Closed for a Draft job', () => {
    const mockJob = { status: 'Draft', deadline: calendarDate(10) };
    expect(getJobLifecycleStatus(mockJob)).toBe('Closed');
  });
});

// --- US-07 Drafts & Scheduled Publication Tests ---

describe('createJob (drafts & scheduling)', () => {
  test('saves explicitly requested Draft status', async () => {
    jest.spyOn(Job, 'create').mockImplementation(async data => data);

    const res = response();
    await createJob({ session: { user: recruiter }, body: validBody({ status: 'Draft' }) }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.job.status).toBe('Draft');
  });

  test('forces status to Draft when publishDate is in the future', async () => {
    jest.spyOn(Job, 'create').mockImplementation(async data => data);

    const res = response();
    await createJob({
      session: { user: recruiter },
      body: validBody({ status: 'Active', publishDate: calendarDate(3) })
    }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.job.status).toBe('Draft');
  });
});

// --- US-07 Edit & Update Job Tests ---

describe('updateJob', () => {
  test('rejects invalid job IDs, missing jobs, and non-owners', async () => {
    // Invalid ID: findById should never be called.
    jest.spyOn(Job, 'findById').mockImplementation(() => {
      throw new Error('findById must not be called for invalid IDs');
    });
    let res = response();
    await updateJob({ session: { user: recruiter }, params: { jobId: 'bad-id' }, body: validBody() }, res);
    expect(res.statusCode).toBe(400);

    // Job not found
    jest.spyOn(Job, 'findById').mockResolvedValue(null);
    res = response();
    await updateJob({ session: { user: recruiter }, params: { jobId }, body: validBody() }, res);
    expect(res.statusCode).toBe(404);

    // Owned by a different recruiter
    jest.spyOn(Job, 'findById').mockResolvedValue({ _id: jobId, recruiter: otherRecruiterId });
    res = response();
    await updateJob({ session: { user: recruiter }, params: { jobId }, body: validBody() }, res);
    expect(res.statusCode).toBe(403);
  });

  test('updates fields, respects Draft status, and auto-drafts future publish dates', async () => {
    jest.spyOn(Job, 'findById').mockResolvedValue({ _id: jobId, recruiter: recruiterId, status: 'Active' });
    jest.spyOn(Job, 'findByIdAndUpdate').mockImplementation(async (_id, updateData) => ({ _id, ...updateData }));

    // Saving an edit as Draft
    let res = response();
    await updateJob({
      session: { user: recruiter },
      params: { jobId },
      body: validBody({ title: 'Updated Engineer', status: 'Draft' })
    }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.job.title).toBe('Updated Engineer');
    expect(res.body.job.status).toBe('Draft');

    // Rescheduling to a future date forces Draft even if Active was requested
    res = response();
    await updateJob({
      session: { user: recruiter },
      params: { jobId },
      body: validBody({ status: 'Active', publishDate: calendarDate(5) })
    }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.job.status).toBe('Draft');
  });
});

// --- US-07 Status Toggle & Archiving Tests ---

describe('updateJobStatus', () => {
  test('blocks publishing a Draft whose deadline has passed', async () => {
    jest.spyOn(Job, 'findById').mockResolvedValue({
      _id: jobId,
      recruiter: recruiterId,
      status: 'Draft',
      deadline: calendarDate(-2),
      save: jest.fn(async () => {})
    });

    const res = response();
    await updateJobStatus({ session: { user: recruiter }, params: { jobId }, body: { status: 'Active' } }, res);
    expect(res.statusCode).toBe(400);
  });

  test('allows archiving an Active job to Closed', async () => {
    const activeJob = {
      _id: jobId,
      recruiter: recruiterId,
      status: 'Active',
      deadline: calendarDate(5),
      save: jest.fn(async () => {})
    };
    jest.spyOn(Job, 'findById').mockResolvedValue(activeJob);

    const res = response();
    await updateJobStatus({ session: { user: recruiter }, params: { jobId }, body: { status: 'Closed' } }, res);

    expect(res.statusCode).toBe(200);
    expect(activeJob.status).toBe('Closed');
    expect(activeJob.save).toHaveBeenCalledTimes(1);
  });
});

// --- US-07 Duplication Tests ---

describe('duplicateJob', () => {
  test('creates a Draft copy with 0 applications', async () => {
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

    jest.spyOn(Job, 'findById').mockResolvedValue(existingJob);
    jest.spyOn(Job, 'create').mockImplementation(async data => data);

    const res = response();
    await duplicateJob({ session: { user: recruiter }, params: { jobId } }, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.job.title).toBe('Backend Developer (Copy)');
    expect(res.body.job.status).toBe('Draft');
    expect(res.body.job.applicationsCount).toBe(0);
    expect(res.body.job.recruiter).toBe(recruiterId);
  });
});

// --- US-07 Atomic Delete Transaction Tests ---

describe('deleteJob', () => {
  test('deletes applications and job inside a transaction, then ends the session', async () => {
    const sessionEnded = { value: false };
    const withTransaction = jest.fn(async fn => { await fn(); });

    const mockSession = {
      withTransaction,
      endSession: jest.fn(async () => { sessionEnded.value = true; })
    };

    // `mongoose` is a default import (plain object), so spyOn works here.
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

    const deleteOne = jest.fn(async opts => {
      expect(opts.session).toBe(mockSession);
    });
    jest.spyOn(Job, 'findById').mockResolvedValue({
      _id: jobId,
      recruiter: recruiterId,
      deleteOne
    });

    const deleteMany = jest.fn(async (filter, opts) => {
      expect(filter).toEqual({ job: jobId });
      expect(opts.session).toBe(mockSession);
    });
    jest.spyOn(JobApplication, 'deleteMany').mockImplementation(deleteMany);

    const res = response();
    await deleteJob({ session: { user: recruiter }, params: { jobId } }, res);

    expect(res.statusCode).toBe(200);
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(sessionEnded.value).toBe(true);
  });

  test('ends the session even when the transaction throws', async () => {
    const endSession = jest.fn(async () => {});
    const mockSession = {
      withTransaction: jest.fn(async () => { throw new Error('tx failed'); }),
      endSession
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);
    jest.spyOn(Job, 'findById').mockResolvedValue({
      _id: jobId,
      recruiter: recruiterId,
      deleteOne: jest.fn()
    });
    jest.spyOn(JobApplication, 'deleteMany').mockResolvedValue({});

    const res = response();
    await deleteJob({ session: { user: recruiter }, params: { jobId } }, res);

    expect(res.statusCode).toBe(500);
    expect(endSession).toHaveBeenCalledTimes(1);
  });
});

// --- US-07 Job Seeker Visibility & Privacy Filtering Tests ---

describe('job seeker visibility', () => {
  test('getJobDetails hides Draft jobs from job seekers with 404', async () => {
    jest.spyOn(Job, 'findById').mockResolvedValue({
      _id: jobId,
      status: 'Draft',
      deadline: calendarDate(5)
    });

    const res = response();
    await getJobDetails({
      session: { user: { id: '507f1f77bcf86cd799439033', role: 'job_seeker' } },
      params: { jobId }
    }, res);

    expect(res.statusCode).toBe(404);
  });

  test('searchJob and checkUpcomingDeadlines exclude Drafts and future publishDate jobs', async () => {
    const captured = { search: null, deadline: null };

    jest.spyOn(Job, 'find').mockImplementation(query => {
      if (query.deadline) {
        captured.deadline = query;
      } else {
        captured.search = query;
      }
      return { sort: jest.fn(async () => []) };
    });

    const searchRes = response();
    await searchJob({ query: {} }, searchRes);
    expect(searchRes.statusCode).toBe(200);
    expect(captured.search.status).toEqual({ $ne: 'Draft' });
    expect(Array.isArray(captured.search.$or)).toBe(true);

    const deadlineRes = response();
    await checkUpcomingDeadlines({}, deadlineRes);
    expect(deadlineRes.statusCode).toBe(200);
    expect(captured.deadline.status).toEqual({ $ne: 'Draft' });
  });
});