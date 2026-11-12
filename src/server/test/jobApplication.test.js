import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import { getJobDetails, submitApplication, getJobApplications, getMyApplications, updateMyApplicationStatus } 
from '../controllers/applicationController.js';

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

function mockTransaction(t, posting = job()) {
  const session = {};
  let indexReady = false;
  t.mock.method(JobApplication, 'init', async () => {
    indexReady = true;
  });
  t.mock.method(mongoose.connection, 'transaction', async callback => {
    assert.equal(indexReady, true);
    return callback(session);
  });
  t.mock.method(Job, 'findById', id => {
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

test('all application routes reject missing sessions and the wrong role before database access', async t => {
  t.mock.method(Job, 'findById', () => assert.fail('Unauthorized database access'));
  for (const [handler, wrongUser] of [
    [getJobDetails, recruiter], [submitApplication, recruiter], [getJobApplications, seeker], [getMyApplications, recruiter]
  ]) {
    const loggedOut = response();
    await handler({ params: { jobId } }, loggedOut);
    assert.equal(loggedOut.statusCode, 401);
    const forbidden = response();
    await handler(request(wrongUser), forbidden);
    assert.equal(forbidden.statusCode, 403);
  }
});

test('a job seeker receives their applications with a current job lifecycle status', async t => {
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
  t.mock.method(JobApplication, 'find', filter => {
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

test('a job seeker can temporarily update only their own application status', async t => {
  t.mock.method(JobApplication, 'findOneAndUpdate', async (filter, change, options) => {
    assert.deepEqual(filter, { _id: jobId, applicant: applicantId });
    assert.deepEqual(change, { $set: { status: 'Interview' } });
    assert.deepEqual(options, { returnDocument: 'after', runValidators: true });
    return { _id: jobId, status: 'Interview' };
  });
  const res = response();
  await updateMyApplicationStatus({
    session: { user: seeker },
    params: { applicationId: jobId },
    body: { status: 'Interview' }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.application.status, 'Interview');
});

test('application status updates reject unsupported statuses before database access', async t => {
  t.mock.method(JobApplication, 'findOneAndUpdate', () => assert.fail('Invalid status reached the database'));
  const res = response();
  await updateMyApplicationStatus({
    session: { user: seeker },
    params: { applicationId: jobId },
    body: { status: 'Offer extended' }
  }, res);
  assert.equal(res.statusCode, 400);
});

test('malformed job IDs are rejected before database access', async t => {
  t.mock.method(Job, 'findById', () => assert.fail('Invalid ID reached the database'));
  for (const [handler, user] of [[getJobDetails, seeker], [submitApplication, seeker], [getJobApplications, recruiter]]) {
    const req = request(user);
    req.params.jobId = 'not-an-id';
    const res = response();
    await handler(req, res);
    assert.equal(res.statusCode, 400);
  }
});

test('submission requires explicit boolean confirmation', async t => {
  t.mock.method(JobApplication, 'init', () => assert.fail('Unconfirmed submission reached the database'));
  for (const body of [undefined, {}, { confirmed: false }, { confirmed: 'true' }]) {
    const req = request();
    req.body = body;
    const res = response();
    await submitApplication(req, res);
    assert.equal(res.statusCode, 400);
  }
});

test('job details show current eligibility and the signed-in applicant previous application', async t => {
  t.mock.method(Job, 'findById', async () => job());
  t.mock.method(JobApplication, 'exists', async filter => {
    assert.deepEqual(filter, { job: jobId, applicant: applicantId });
    return { _id: 'existing-application' };
  });
  const res = response();
  await getJobDetails(request(), res);
  assert.equal(res.body.hasApplied, true);
  assert.equal(res.body.canApply, true);
});

test('unknown jobs return 404 in details and recruiter applications', async t => {
  t.mock.method(Job, 'findById', async () => null);
  for (const [handler, user] of [[getJobDetails, seeker], [getJobApplications, recruiter]]) {
    const res = response();
    await handler(request(user), res);
    assert.equal(res.statusCode, 404);
  }
});

test('submission uses session identity and server-generated application fields', async t => {
  const session = mockTransaction(t);
  t.mock.method(JobApplication, 'create', async (records, options) => {
    assert.deepEqual(records, [{ job: jobId, applicant: applicantId }]);
    assert.equal(options.session, session);
    const application = new JobApplication(records[0]);
    await application.validate();
    return [application];
  });
  const update = t.mock.method(Job, 'updateOne', async (filter, change, options) => {
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
  assert.equal(update.mock.callCount(), 1);
});

test('a future deadline is also eligible', async t => {
  t.mock.method(Job, 'findById', async () => job({ deadline: date(1) }));
  t.mock.method(JobApplication, 'exists', async () => null);
  const res = response();
  await getJobDetails(request(), res);
  assert.equal(res.body.canApply, true);
  assert.equal(res.body.hasApplied, false);
});

test('closed, expired, missing, and impossible deadlines prevent submission', async t => {
  const postings = [
    job({ status: 'Closed' }), job({ deadline: date(-1) }), job({ deadline: undefined }), job({ deadline: '2099-02-30' })
  ];
  mockTransaction(t);
  t.mock.method(Job, 'findById', () => ({ session: async () => postings.shift() }));
  t.mock.method(JobApplication, 'create', () => assert.fail('Closed job must not receive an application'));
  for (let index = 0; index < 4; index++) {
    const res = response();
    await submitApplication(request(), res);
    assert.equal(res.statusCode, 409);
  }
});

test('a job deleted before submission returns 404', async t => {
  mockTransaction(t, null);
  t.mock.method(JobApplication, 'create', () => assert.fail('Deleted job must not receive an application'));
  const res = response();
  await submitApplication(request(), res);
  assert.equal(res.statusCode, 404);
});

test('database duplicate errors return 409 and do not increase application counts', async t => {
  mockTransaction(t);
  t.mock.method(JobApplication, 'create', async () => {
    throw Object.assign(new Error('duplicate'), { code: 11000 });
  });
  t.mock.method(Job, 'updateOne', () => assert.fail('Duplicate must not change the count'));
  const res = response();
  await submitApplication(request(), res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'You have already applied for this job.');
});

test('count update failures escape the transaction and return an error instead of false success', async t => {
  mockTransaction(t);
  t.mock.method(JobApplication, 'create', async () => [{ job: jobId, applicant: applicantId }]);
  t.mock.method(Job, 'updateOne', async () => {
    throw new Error('update failed');
  });
  t.mock.method(console, 'error', () => {});
  const res = response();
  await submitApplication(request(), res);
  assert.equal(res.statusCode, 500);
});

test('another recruiter cannot access applications', async t => {
  t.mock.method(Job, 'findById', async () => job({ recruiter: applicantId }));
  t.mock.method(JobApplication, 'find', () => assert.fail('Applications must stay private'));
  const res = response();
  await getJobApplications(request(recruiter), res);
  assert.equal(res.statusCode, 403);
});

test('owning recruiter receives job applications with only selected applicant profile fields', async t => {
  t.mock.method(Job, 'findById', async () => job());
  const applications = [{ job: jobId, applicant: { name: 'Test applicant' } }];
  t.mock.method(JobApplication, 'find', filter => {
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

test('detail and application-list database errors return safe messages', async t => {
  t.mock.method(Job, 'findById', async () => {
    throw new Error('private database detail');
  });
  t.mock.method(console, 'error', () => {});
  for (const [handler, user] of [[getJobDetails, seeker], [getJobApplications, recruiter]]) {
    const res = response();
    await handler(request(user), res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.includes('private'), false);
  }
});
