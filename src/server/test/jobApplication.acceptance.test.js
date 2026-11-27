import { jest, test } from '@jest/globals';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import {
  getJobDetails, submitApplication, getJobApplications, getJobApplication, getJobApplicationResume,
  getMyApplications, updateMyApplicationStatus
} from '../controllers/applicationController.js';
import Notification from '../models/notification.js';

const jobId = '507f1f77bcf86cd799439010';
const applicantId = '507f1f77bcf86cd799439011';
const recruiterId = '507f1f77bcf86cd799439012';
const seeker = { id: applicantId, role: 'job_seeker' };
const recruiter = { id: recruiterId, role: 'recruiter' };

function date(offset = 0) {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function job(overrides = {}) {
  return { _id: jobId, recruiter: recruiterId, status: 'Active', deadline: date(), applicationsCount: 2, ...overrides };
}

function request(user = seeker, body = { confirmed: true }) {
  return { session: { user }, params: { jobId }, body };
}

function response() {
  return {
    statusCode: 200,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function mockTransaction(posting = job()) {
  const session = {};
  let indexReady = false;
  jest.spyOn(JobApplication, 'init').mockImplementation(async () => {
    indexReady = true;
  });
  jest.spyOn(mongoose.connection, 'transaction').mockImplementation(async callback => {
    assert.equal(indexReady, true);
    return callback(session);
  });
  jest.spyOn(Job, 'findById').mockImplementation(id => {
    assert.equal(id, jobId);
    return {
      session(value) {
        assert.equal(value, session);
        return Promise.resolve(posting);
      }
    };
  });
  return session;
}

test('model requires job and applicant and defines the duplicate-prevention index', async () => {
  const application = new JobApplication({ job: jobId, applicant: applicantId });
  await application.validate();
  assert.equal(application.status, 'Applied');
  assert.ok(application.appliedAt instanceof Date);
  assert.ok(JobApplication.schema.indexes().some(([fields, options]) =>
    fields.job === 1 && fields.applicant === 1 && options.unique === true));
  await assert.rejects(new JobApplication({}).validate(), { name: 'ValidationError' });
});

test('all application routes reject missing sessions and the wrong role before database access', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(() => assert.fail('Unauthorized database access'));
  for (const [handler, wrongUser] of [
    [getJobDetails, recruiter], [submitApplication, recruiter], [getJobApplications, seeker],
    [getJobApplication, seeker], [getJobApplicationResume, seeker], [getMyApplications, recruiter]
  ]) {
    const loggedOut = response();
    await handler({ params: { jobId } }, loggedOut);
    assert.equal(loggedOut.statusCode, 401);
    const forbidden = response();
    await handler(request(wrongUser), forbidden);
    assert.equal(forbidden.statusCode, 403);
  }
});

test('a job seeker receives their applications with a current job lifecycle status', async () => {
  const applications = [{
    _id: 'application-id',
    status: 'Applied',
    appliedAt: new Date('2026-10-20T12:00:00Z'),
    job: {
      _id: jobId,
      title: 'Developer',
      company: 'Example Company',
      status: 'Active',
      deadline: date(1)
    },
    toObject() {
      return this;
    }
  }];
  jest.spyOn(JobApplication, 'find').mockImplementation(filter => {
    assert.deepEqual(filter, { applicant: applicantId });
    return {
      populate(path, fields) {
        assert.equal(path, 'job');
        assert.equal(fields, 'title company department location deadline status');
        return {
          sort(order) {
            assert.deepEqual(order, { appliedAt: -1 });
            return Promise.resolve(applications);
          }
        };
      }
    };
  });
  const res = response();
  await getMyApplications(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].status, 'Applied');
  assert.equal(res.body[0].jobStatus, 'Active');
});

test('a recruiter can update an application status for their job posting', async () => {
  const recruiterId = '5f4dcc3b5aa765d61d8327db';
  const validJobId = '5f4dcc3b5aa765d61d8327dc';
  
  const mockRecruiter = { 
    id: recruiterId, 
    _id: recruiterId, 
    role: 'recruiter' 
  };

  const mockSave = jest.fn().mockResolvedValue(true);

  jest.spyOn(JobApplication, 'findById').mockReturnValue({
    populate: async () => ({
      _id: validJobId,
      job: { _id: validJobId, title: 'Software Engineer', recruiter: recruiterId },
      applicant: '5f4dcc3b5aa765d61d8327de',
      status: 'Applied',
      interviewDate: null,
      save: mockSave
    })
  });

  // NEW: Mock the Notification creation so it doesn't try to connect to a real database
  jest.spyOn(Notification, 'create').mockResolvedValue({ _id: 'fake-notif-id' });

  const res = response();
  await updateMyApplicationStatus({
    session: { user: mockRecruiter },
    params: { applicationId: validJobId },
    body: { status: 'Interview', interviewDate: '2026-06-15' }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.application.status, 'Interview');
  expect(mockSave).toHaveBeenCalled();
});

test('application status updates reject unsupported statuses before database access', async () => {
  jest.spyOn(JobApplication, 'findOneAndUpdate').mockImplementation(() => assert.fail('Invalid status reached the database'));
  const res = response();
  await updateMyApplicationStatus({
    session: { user: seeker },
    params: { applicationId: jobId },
    body: { status: 'Offer extended' }
  }, res);
  assert.equal(res.statusCode, 403);
});

test('malformed job IDs are rejected before database access', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(() => assert.fail('Invalid ID reached the database'));
  for (const [handler, user] of [[getJobDetails, seeker], [submitApplication, seeker], [getJobApplications, recruiter]]) {
    const req = request(user);
    req.params.jobId = 'not-an-id';
    const res = response();
    await handler(req, res);
    assert.equal(res.statusCode, 400);
  }
});

test('submission requires explicit boolean confirmation', async () => {
  jest.spyOn(JobApplication, 'init').mockImplementation(() => assert.fail('Unconfirmed submission reached the database'));
  for (const body of [undefined, {}, { confirmed: false }, { confirmed: 'true' }]) {
    const req = request();
    req.body = body;
    const res = response();
    await submitApplication(req, res);
    assert.equal(res.statusCode, 400);
  }
});

test('job details show current eligibility and the signed-in applicant previous application', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(async () => job());
  jest.spyOn(JobApplication, 'exists').mockImplementation(async filter => {
    assert.deepEqual(filter, { job: jobId, applicant: applicantId });
    return { _id: 'existing-application' };
  });
  const res = response();
  await getJobDetails(request(), res);
  assert.equal(res.body.hasApplied, true);
  assert.equal(res.body.canApply, true);
});

test('unknown jobs return 404 in details and recruiter applications', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(async () => null);
  for (const [handler, user] of [[getJobDetails, seeker], [getJobApplications, recruiter]]) {
    const res = response();
    await handler(request(user), res);
    assert.equal(res.statusCode, 404);
  }
});

test('submission uses session identity and server-generated application fields', async () => {
  const session = mockTransaction();
  jest.spyOn(JobApplication, 'create').mockImplementation(async (records, options) => {
    assert.deepEqual(records, [{ job: jobId, applicant: applicantId }]);
    assert.equal(options.session, session);
    const application = new JobApplication(records[0]);
    await application.validate();
    return [application];
  });
  const update = jest.spyOn(Job, 'updateOne').mockImplementation(async (filter, change, options) => {
    assert.deepEqual(filter, { _id: jobId });
    assert.deepEqual(change, { $inc: { applicationsCount: 1 } });
    assert.equal(options.session, session);
    return { modifiedCount: 1 };
  });
  const res = response();
  await submitApplication(request(seeker, {
    confirmed: true, applicant: recruiterId, job: recruiterId, status: 'Offered', appliedAt: '2000-01-01'
  }), res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.application.status, 'Applied');
  assert.equal(res.body.applicationsCount, 3);
  assert.equal(update.mock.calls.length, 1);
});

test('a future deadline is also eligible', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(async () => job({ deadline: date(1) }));
  jest.spyOn(JobApplication, 'exists').mockImplementation(async () => null);
  const res = response();
  await getJobDetails(request(), res);
  assert.equal(res.body.canApply, true);
  assert.equal(res.body.hasApplied, false);
});

test('closed, expired, missing, and impossible deadlines prevent submission', async () => {
  const postings = [
    job({ status: 'Closed' }), job({ deadline: date(-1) }), job({ deadline: undefined }), job({ deadline: '2099-02-30' })
  ];
  mockTransaction();
  jest.spyOn(Job, 'findById').mockImplementation(() => ({ session: async () => postings.shift() }));
  jest.spyOn(JobApplication, 'create').mockImplementation(() => assert.fail('Closed job must not receive an application'));
  for (let index = 0; index < 4; index++) {
    const res = response();
    await submitApplication(request(), res);
    assert.equal(res.statusCode, 409);
  }
});

test('a job deleted before submission returns 404', async () => {
  mockTransaction(null);
  jest.spyOn(JobApplication, 'create').mockImplementation(() => assert.fail('Deleted job must not receive an application'));
  const res = response();
  await submitApplication(request(), res);
  assert.equal(res.statusCode, 404);
});

test('database duplicate errors return 409 and do not increase application counts', async () => {
  mockTransaction();
  jest.spyOn(JobApplication, 'create').mockImplementation(async () => {
    throw Object.assign(new Error('duplicate'), { code: 11000 });
  });
  jest.spyOn(Job, 'updateOne').mockImplementation(() => assert.fail('Duplicate must not change the count'));
  const res = response();
  await submitApplication(request(), res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'You have already applied for this job.');
});

test('count update failures escape the transaction and return an error instead of false success', async () => {
  mockTransaction();
  jest.spyOn(JobApplication, 'create').mockImplementation(async () => [{ job: jobId, applicant: applicantId }]);
  jest.spyOn(Job, 'updateOne').mockImplementation(async () => {
    throw new Error('update failed');
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = response();
  await submitApplication(request(), res);
  assert.equal(res.statusCode, 500);
});

test('another recruiter cannot access applications', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(async () => job({ recruiter: applicantId }));
  jest.spyOn(JobApplication, 'find').mockImplementation(() => assert.fail('Applications must stay private'));
  const res = response();
  await getJobApplications(request(recruiter), res);
  assert.equal(res.statusCode, 403);
});

test('owning recruiter receives job applications with only selected applicant profile fields', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(async () => job());
  const applications = [{ job: jobId, applicant: { name: 'Test applicant' } }];
  jest.spyOn(JobApplication, 'find').mockImplementation(filter => {
    assert.deepEqual(filter, { job: jobId });
    return {
      populate(path, fields) {
        assert.equal(path, 'applicant');
        assert.equal(fields, 'name email education experience skills');
        return {
          sort(order) {
            assert.deepEqual(order, { appliedAt: -1 });
            return Promise.resolve(applications);
          }
        };
      }
    };
  });
  const res = response();
  await getJobApplications(request(recruiter), res);
  assert.deepEqual(res.body, applications);
});

test('recruiter application detail and resume validate the application ID before querying', async () => {
  const findJob = jest.spyOn(Job, 'findById').mockImplementation(() => assert.fail('Invalid ID reached the database'));
  const req = request(recruiter);
  req.params.applicationId = 'invalid';

  for (const handler of [getJobApplication, getJobApplicationResume]) {
    const res = response();
    await handler(req, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(findJob.mock.calls.length, 0);
});

test('recruiter application detail preserves the date when the applicant profile is gone', async () => {
  const appliedAt = new Date('2026-10-20T12:00:00Z');
  jest.spyOn(Job, 'findById').mockResolvedValue(job({ title: 'Developer' }));
  jest.spyOn(JobApplication, 'findOne').mockReturnValue({
    populate: async () => ({ appliedAt, status: 'Applied', applicant: null })
  });
  const req = request(recruiter);
  req.params.applicationId = applicantId;
  const res = response();

  await getJobApplication(req, res);

  assert.deepEqual(res.body, {
    job: { title: 'Developer' }, 
    appliedAt, 
    status: 'Applied', 
    applicant: null, 
    resume: null, 
    interviewDate: undefined
  });
});

test('detail and application-list database errors return safe messages', async () => {
  jest.spyOn(Job, 'findById').mockImplementation(async () => {
    throw new Error('private database detail');
  });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  for (const [handler, user] of [[getJobDetails, seeker], [getJobApplications, recruiter]]) {
    const res = response();
    await handler(request(user), res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.includes('private'), false);
  }
});
