import { afterAll, beforeAll, expect, jest, test } from '@jest/globals';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import bcrypt from 'bcrypt';
import app from '../server.js';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
import User from '../models/user.js';
import { initializeFileStorage, resumeBucket } from '../serverUtils/fileStorage.js';

const recruiterId = '507f1f77bcf86cd799439010';
const jobId = '507f1f77bcf86cd799439011';
const applicationId = '507f1f77bcf86cd799439012';
const otherApplicationId = '507f1f77bcf86cd799439013';
const resumeFileId = '507f1f77bcf86cd799439014';
const otherRecruiterId = '507f1f77bcf86cd799439015';
const recruiterEmail = 'recruiter@example.test';
const otherRecruiterEmail = 'another-recruiter@example.test';
const posting = { _id: jobId, recruiter: recruiterId, title: 'Software Developer' };
const profile = {
  name: 'Taylor Lee', email: 'taylor@example.test', education: 'Computer Science',
  experience: 'Software Intern', skills: 'React and Node'
};
const application = {
  _id: applicationId, job: jobId, appliedAt: '2026-10-20T12:00:00.000Z', status: 'Applied', applicant: profile
};
const pdf = Buffer.from('%PDF-1.7\n%%EOF');
const path = `/api/jobs/${jobId}/applications`;

let server;
let origin;
let passwordHash;

beforeAll(async () => {
  passwordHash = await bcrypt.hash('test-password', 4);
  initializeFileStorage({ collection: () => ({}) });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  if (!server?.listening) return;
  server.close();
  await once(server, 'close');
});

async function login(email = recruiterEmail) {
  const response = await fetch(`${origin}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'test-password' })
  });
  expect(response.status).toBe(200);
  await response.json();
  return { Cookie: response.headers.get('set-cookie').split(';')[0] };
}

function mockRecruiterAccounts() {
  jest.spyOn(User, 'findOne').mockImplementation(async ({ email }) => ({
    _id: email === recruiterEmail ? recruiterId : otherRecruiterId,
    email,
    role: 'recruiter',
    password: passwordHash
  }));
}

test('posting owner can list, open, and view the CV for an application through the API', async () => {
  mockRecruiterAccounts();
  jest.spyOn(Job, 'findById').mockResolvedValue(posting);
  jest.spyOn(JobApplication, 'find').mockReturnValue({
    populate: () => ({ sort: async () => [application] })
  });
  const findApplication = jest.spyOn(JobApplication, 'findOne').mockReturnValue({
    populate: async () => ({
      ...application,
      applicant: { ...profile, resumeFileId, resumeFileName: 'Taylor.pdf', password: 'private' }
    })
  });
  const findFile = jest.spyOn(resumeBucket, 'find').mockReturnValue({ toArray: async () => [{ _id: resumeFileId }] });
  jest.spyOn(resumeBucket, 'openDownloadStream').mockImplementation(() => Readable.from([pdf]));
  const headers = await login();

  const list = await fetch(`${origin}${path}`, { headers });
  expect(list.status).toBe(200);
  expect(await list.json()).toEqual([application]);

  const detail = await fetch(`${origin}${path}/${applicationId}`, { headers });
  expect(detail.status).toBe(200);
  expect(await detail.json()).toEqual({
    job: { title: posting.title }, applicant: profile, appliedAt: application.appliedAt,
    status: application.status, resume: { fileName: 'Taylor.pdf' }
  });

  const resume = await fetch(`${origin}${path}/${applicationId}/resume`, { headers });
  expect(resume.status).toBe(200);
  expect(resume.headers.get('content-type')).toBe('application/pdf');
  expect(resume.headers.get('content-disposition')).toBe('inline; filename="Taylor.pdf"');
  expect(resume.headers.get('cache-control')).toBe('private, no-store');
  expect(Buffer.from(await resume.arrayBuffer())).toEqual(pdf);
  expect(findFile.mock.calls[0][0]._id.toString()).toBe(resumeFileId);
  expect(findApplication.mock.calls).toEqual([
    [{ _id: applicationId, job: jobId }],
    [{ _id: applicationId, job: jobId }]
  ]);
});

test('detail and CV routes require an owning recruiter and an application belonging to that posting', async () => {
  mockRecruiterAccounts();
  jest.spyOn(Job, 'findById').mockResolvedValue(posting);
  const findApplication = jest.spyOn(JobApplication, 'findOne').mockReturnValue({ populate: async () => null });
  const otherRecruiter = await login(otherRecruiterEmail);
  const owner = await login();

  for (const suffix of ['', '/resume']) {
    const url = `${origin}${path}/${otherApplicationId}${suffix}`;
    const anonymous = await fetch(url);
    expect(anonymous.status).toBe(401);
    await anonymous.json();
    const forbidden = await fetch(url, { headers: otherRecruiter });
    expect(forbidden.status).toBe(403);
    await forbidden.json();
  }
  expect(findApplication).not.toHaveBeenCalled();

  for (const suffix of ['', '/resume']) {
    const missing = await fetch(`${origin}${path}/${otherApplicationId}${suffix}`, { headers: owner });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'Application not found.' });
  }
  expect(findApplication.mock.calls).toEqual([
    [{ _id: otherApplicationId, job: jobId }],
    [{ _id: otherApplicationId, job: jobId }]
  ]);
});
