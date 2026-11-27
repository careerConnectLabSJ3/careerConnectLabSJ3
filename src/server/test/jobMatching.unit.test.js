import { expect, jest, test } from '@jest/globals';
import User from '../models/user.js';
import Job from '../models/job.js';
import JobApplication from '../models/jobApplication.js';
const readResumePdf = jest.fn(async () => Buffer.from('%PDF-test'));
jest.unstable_mockModule('../serverUtils/fileStorage.js', () => ({ readResumePdf, sendResume: jest.fn() }));
const { getJobMatches, rankBySearches, recentKeywords, recommendationPool } = await import('../controllers/jobMatchingController.js');
const job = { _id: 'j1', title: 'React engineer', company: 'Atlas', location: 'Remote', jobType: 'Contract',
  description: 'Build React apps', requirements: 'React SQL', status: 'Active', deadline: '2099-01-01', publishDate: '2020-01-01' };
const history = [{ keywords: 'React', searchedAt: new Date() }];
function response() {
  const res = { set: jest.fn(), status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}
function request(ai = false, id = 'seeker') {
  return { method: ai ? 'POST' : 'GET', session: { user: { id, role: 'job_seeker' } },
    is: type => type === 'application/json', body: ai ? { action: 'confirm-ai-matching', userId: 'victim' } : {} };
}
function database(user = { skills: 'React', recentSearches: history }, jobs = [job]) {
  const select = jest.fn(() => ({ lean: async () => user }));
  const findUser = jest.spyOn(User, 'findById').mockReturnValue({ select });
  const findJobs = jest.spyOn(Job, 'find').mockReturnValue({ lean: async () => jobs });
  jest.spyOn(JobApplication, 'distinct').mockResolvedValue([]);
  return { select, findUser, findJobs };
}
const match = { id: 'j1', score: 90, explanation: 'React experience matches the role.', matchingSkills: ['React'], missingQualifications: ['SQL'] };
function aiResponse(recommendations = [match]) {
  return { ok: true, json: async () => ({ content: [{ type: 'text', text: JSON.stringify({ insufficientInformation: false, recommendations }) }] }) };
}

test('requires authentication, seeker role and explicit confirmation before any AI access', async () => {
  const fetch = jest.spyOn(globalThis, 'fetch');
  const find = jest.spyOn(User, 'findById');
  for (const [req, status] of [[{}, 401], [{ session: { user: { role: 'recruiter' } } }, 403],
    [{ ...request(true), body: {} }, 400], [{ ...request(true), body: { action: true } }, 400]]) {
    const res = response();
    await getJobMatches(req, res);
    expect(res.status).toHaveBeenCalledWith(status);
  }
  expect(fetch).not.toHaveBeenCalled();
  expect(find).not.toHaveBeenCalled();
});

test('search-only ranking uses recency and coverage, excludes inactive and future jobs', async () => {
  const ranked = rankBySearches([job, { ...job, _id: 'j2', title: 'SQL analyst', description: 'SQL', requirements: 'SQL' },
    { ...job, _id: 'closed', status: 'Closed' }, { ...job, _id: 'draft', status: 'Draft' },
    { ...job, _id: 'expired', deadline: '2020-01-01' }, { ...job, _id: 'future', publishDate: '2099-01-01' }], ['React', 'SQL']);
  expect(ranked.map(j => j._id)).toEqual(['j1', 'j2']);
  expect(rankBySearches([job], ['nursing'])).toEqual([]);
  expect(recentKeywords([...history, { keywords: 'Old', searchedAt: '2020-01-01' }, ...history])).toEqual(['React', 'Old']);
  const { select, findUser } = database();
  const fetch = jest.spyOn(globalThis, 'fetch');
  const res = response();
  await getJobMatches(request(), res);
  expect(select).toHaveBeenCalledWith('recentSearches');
  expect(findUser).toHaveBeenCalledWith('seeker');
  expect(res.json.mock.calls[0][0].jobs[0]._id).toBe('j1');
  expect(fetch).not.toHaveBeenCalled();
  expect(readResumePdf).not.toHaveBeenCalled();
});

test('confirmed matching combines only own profile, PDF and searches; validates IDs and ranks results', async () => {
  const env = jest.replaceProperty(process, 'env', { ANTHROPIC_API_KEY: 'test-key' });
  const second = { ...job, _id: 'j2', title: 'SQL developer' };
  const { findUser, findJobs } = database({ skills: 'React', resumeFileId: 'own-pdf', recentSearches: history }, [job, second]);
  const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse([
    { ...match, id: 'j2', score: 70 }, match, match, { ...match, id: 'invented' }, { ...match, score: 101 }
  ]));
  try {
    const res = response();
    await getJobMatches(request(true, 'owner'), res);
    expect(findUser).toHaveBeenCalledWith('owner');
    expect(readResumePdf).toHaveBeenLastCalledWith('own-pdf');
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    const content = payload.messages[0].content;
    expect(content[0].source.media_type).toBe('application/pdf');
    expect(JSON.parse(content[1].text)).toMatchObject({ profile: { skills: 'React' }, recentSearches: ['React'] });
    expect(content[1].text).not.toContain('victim');
    expect(res.json.mock.calls[0][0].jobs.map(j => j._id)).toEqual(['j1', 'j2']);
    expect(findJobs).toHaveBeenLastCalledWith(expect.objectContaining({ _id: { $in: ['j1', 'j2'], $nin: [] } }));
    expect(JobApplication.distinct).toHaveBeenLastCalledWith('job', { applicant: 'owner' });
  } finally {
    env.restore();
  }
});

test('supports profile-only AI, rechecks closed jobs, and handles empty history', async () => {
  const env = jest.replaceProperty(process, 'env', { ANTHROPIC_API_KEY: 'test-key' });
  const { findJobs } = database({ skills: 'React', recentSearches: [] });
  findJobs.mockReturnValueOnce({ lean: async () => [job] }).mockReturnValue({ lean: async () => [{ ...job, status: 'Closed' }] });
  const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse());
  try {
    const res = response();
    await getJobMatches(request(true, 'profile-only'), res);
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages[0].content).toHaveLength(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mode: 'ai', jobs: [] }));
    await getJobMatches(request(), res);
    expect(res.json).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'search', jobs: [], message: expect.stringMatching(/Search for jobs/) }));
  } finally {
    env.restore();
  }
});

test('handles missing qualifications, key, unreadable resume and provider errors without leaking details', async () => {
  const env = jest.replaceProperty(process, 'env', {});
  const fetch = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('secret provider detail'));
  try {
    let res = response();
    await getJobMatches(request(true), res);
    expect(res.status).toHaveBeenCalledWith(503);
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const { findUser } = database({ skills: 'None', education: 'None', experience: 'None' });
    res = response();
    await getJobMatches(request(true, 'missing'), res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(fetch).not.toHaveBeenCalled();
    findUser.mockReturnValue({ select: () => ({ lean: async () => ({ skills: 'React' }) }) });
    res = response();
    await getJobMatches(request(true, 'failure'), res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret');
    fetch.mockResolvedValue({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'invalid' }] }) });
    res = response();
    await getJobMatches(request(true, 'malformed'), res);
    expect(res.status).toHaveBeenCalledWith(502);
    findUser.mockReturnValue({ select: () => ({ lean: async () => ({ resumeFileId: 'broken' }) }) });
    readResumePdf.mockRejectedValueOnce(new Error('storage failure'));
    res = response();
    await getJobMatches(request(true, 'broken'), res);
    expect(res.status).toHaveBeenCalledWith(422);
  } finally {
    env.restore();
  }
});

test('limits repeated confirmed requests and fills empty AI matches from search history', async () => {
  const env = jest.replaceProperty(process, 'env', { ANTHROPIC_API_KEY: 'test-key' });
  database();
  const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(aiResponse([]));
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = response();
      await getJobMatches(request(true, 'limited-user'), res);
      expect(res.json.mock.calls[0][0].jobs.map(job => job._id)).toEqual(['j1']);
    }
    const res = response();
    await getJobMatches(request(true, 'limited-user'), res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(fetch).toHaveBeenCalledTimes(5);
  } finally {
    env.restore();
  }
});

test('remembers the last hundred saved searches without expiring older interests', () => {
  const searches = Array.from({ length: 105 }, (_, index) => ({ keywords: `interest${index}`, searchedAt: new Date(2020, 0, index + 1) }));
  expect(recentKeywords(searches)).toEqual(Array.from({ length: 100 }, (_, index) => `interest${104 - index}`));
});

test('returns at most four search matches, retaining weak themes after strong matches', async () => {
  const jobs = ['Patient care assistant', 'Clinical assistant', 'Healthcare aide', 'Medical assistant', 'Nursing'].map((title, index) =>
    ({ ...job, _id: `n${index}`, title, description: '', requirements: '' }));
  database({ recentSearches: [{ keywords: 'nursing', searchedAt: new Date('2020-01-01') }] }, jobs);
  const res = response();
  await getJobMatches(request(), res);
  const result = res.json.mock.calls[0][0];
  expect(result.jobs).toHaveLength(4);
  expect(result.jobs[0].title).toBe('Nursing');
  expect(result.jobs[1].score).toBeGreaterThan(0);
  expect(result.jobs[1].score).toBeLessThan(result.jobs[0].score);
});

test('AI reviews all open jobs beyond the old cutoff with saved interests in every batch', async () => {
  const env = jest.replaceProperty(process, 'env', { ANTHROPIC_API_KEY: 'test-key' });
  const jobs = Array.from({ length: 85 }, (_, index) => ({ ...job, _id: `job-${index}` }));
  const history = Array.from({ length: 30 }, (_, index) => ({ keywords: `topic${index}`, searchedAt: new Date(2020, 0, index + 1) }));
  database({ skills: 'React', recentSearches: history }, jobs);
  const reviewed = [];
  const fetch = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const payload = JSON.parse(options.body);
    const input = JSON.parse(payload.messages[0].content.at(-1).text);
    expect(input.recentSearches).toHaveLength(30);
    expect(input.recentSearches).toContain('topic0');
    expect(payload.system).toContain('Reasonable partial matches');
    reviewed.push(...input.jobs.map(job => job.id));
    return aiResponse(input.jobs.slice(-4).map((job, index) => ({ ...match, id: job.id, score: reviewed.length + index })));
  });
  try {
    const res = response();
    await getJobMatches(request(true, 'all-jobs'), res);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(reviewed).toEqual(jobs.map(job => job._id));
    const data = res.json.mock.calls[0][0];
    expect(data.jobs).toHaveLength(4);
    expect(data.jobs[0]._id).toBe('job-84');
    expect(data.message).toContain('all 85');
  } finally {
    env.restore();
  }
});

test('a later AI batch failure is reported rather than presenting incomplete coverage', async () => {
  const env = jest.replaceProperty(process, 'env', { ANTHROPIC_API_KEY: 'test-key' });
  database({ skills: 'React' }, Array.from({ length: 41 }, (_, index) => ({ ...job, _id: `job-${index}` })));
  const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(aiResponse([{ ...match, id: 'job-0' }])).mockRejectedValueOnce(new Error('provider failure'));
  try {
    const res = response();
    await getJobMatches(request(true, 'batch-failure'), res);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json.mock.calls[0][0].jobs).toBeUndefined();
  } finally {
    env.restore();
  }
});

test.each(['Frontend', 'Janitor'])('the API includes the latest %s title match in its four cards', keyword => {
  return (async () => {
    const jobs = Array.from({ length: 4 }, (_, index) => ({ ...job, _id: `older-${index}`,
      title: 'Backend engineer', requirements: 'React SQL JavaScript Python AWS' }));
    jobs.push({ ...job, _id: 'latest-title', title: `${keyword} specialist`, description: '', requirements: '' });
    const recentSearches = [keyword, 'React', 'SQL', 'JavaScript', 'Python', 'AWS'].map((keywords, index) =>
      ({ keywords, searchedAt: new Date(Date.now() - index * 1000) }));
    database({ recentSearches }, jobs);
    const res = response();
    await getJobMatches(request(), res);
    expect(res.json.mock.calls[0][0].jobs).toHaveLength(4);
    expect(res.json.mock.calls[0][0].jobs[0]._id).toBe('latest-title');
  })();
});

test('fills four cards after one match and retains honest broader suggestions as reserves', async () => {
  const jobs = [job, ...Array.from({ length: 5 }, (_, index) => ({ ...job, _id: `other-${index}`, title: 'Janitor', description: '', requirements: '' }))];
  database({ recentSearches: history }, jobs);
  const res = response();
  await getJobMatches(request(), res);
  const data = res.json.mock.calls[0][0];
  expect(data.jobs).toHaveLength(4);
  expect(data.jobs[0]._id).toBe('j1');
  expect(data.jobs.slice(1).every(job => job.recommendationType === 'discovery')).toBe(true);
  expect(data.alternatives).toHaveLength(2);
  expect(new Set([...data.jobs, ...data.alternatives].map(job => job._id)).size).toBe(6);
});

test('fills from open jobs with history even without keyword matches, but respects eligibility and empty history', () => {
  const jobs = Array.from({ length: 6 }, (_, index) => ({ ...job, _id: `job-${index}` }));
  expect(recommendationPool(jobs, ['unmatched interest']).slice(0, 4)).toHaveLength(4);
  expect(recommendationPool(jobs, [])).toEqual([]);
  expect(recommendationPool(jobs.slice(0, 2), ['React'])).toHaveLength(2);
  expect(recommendationPool([{ ...job, status: 'Closed' }, { ...job, status: 'Draft' },
    { ...job, deadline: '2020-01-01' }, { ...job, publishDate: '2099-01-01' }], ['React'])).toEqual([]);
  expect(recommendationPool(jobs, [], [{ ...jobs[0], explanation: 'AI match', score: 20 }])).toHaveLength(6);
});
