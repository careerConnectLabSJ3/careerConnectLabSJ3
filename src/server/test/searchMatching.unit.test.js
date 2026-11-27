import { expect, test } from '@jest/globals';
import { scoreSearchMatches } from '../serverUtils/searchMatching.js';
const job = (_id, title, extra = {}) => ({ _id, title, ...extra });

test('orders exact wording before synonyms before related job themes', () => {
  const jobs = [job('theme', 'Patient care assistant'), job('synonym', 'Registered nurse'), job('exact', 'Nursing')];
  const results = scoreSearchMatches(jobs, ['nursing']);
  expect(results.map(result => result._id)).toEqual(['exact', 'synonym', 'theme']);
  expect(results[1].explanation).toContain('nursing → registered nurse');
});

test('recognizes phrases, abbreviations, punctuation and common field terms', () => {
  const jobs = [job('hr', 'Talent acquisition specialist'), job('js', 'JavaScript developer'),
    job('cpp', 'C++ programmer'), job('net', 'ASP.NET developer'), job('finance', 'Bookkeeper')];
  for (const [query, expected] of [['human resources', 'hr'], ['JS', 'js'], ['CPP!', 'cpp'], ['.NET', 'net'], ['accounting', 'finance']]) {
    expect(scoreSearchMatches(jobs, [query])[0]._id).toBe(expected);
  }
});

test('matches whole words, ignores filler and prevents accidental substrings', () => {
  expect(scoreSearchMatches([job('a', 'Chair assembler'), job('b', 'Retail trainer')], ['AI'])).toEqual([]);
  expect(scoreSearchMatches([job('a', 'JavaScript')], ['java'])).toEqual([]);
  expect(scoreSearchMatches([job('a', 'Accountant')], ['I am looking for a job'])).toEqual([]);
  expect(scoreSearchMatches([job('a', 'C++ developer')], ['c'])).toEqual([]);
});

test('uses title and requirements more strongly than incidental description words', () => {
  const results = scoreSearchMatches([job('description', 'Coordinator', { description: 'SQL' }),
    job('requirements', 'Analyst', { requirements: 'SQL' }), job('title', 'SQL specialist')], ['SQL']);
  expect(results.map(result => result._id)).toEqual(['title', 'requirements', 'description']);
});

test('ranks stronger coverage first and uses recency only as a modest preference', () => {
  const jobs = [job('partial', 'React'), job('both', 'React SQL'), job('unrelated', 'Nurse')];
  expect(scoreSearchMatches(jobs, ['React SQL']).map(result => result._id)).toEqual(['both', 'partial']);
  expect(scoreSearchMatches([job('related', 'Patient care'), job('exact', 'SQL')], ['nursing', 'SQL'])[0]._id).toBe('exact');
});

test('repeated keywords, descriptions and identical searches do not inflate ranking', () => {
  const jobs = [job('a', 'React', { description: 'React '.repeat(30) })];
  const score = scoreSearchMatches(jobs, ['React'])[0].score;
  expect(scoreSearchMatches(jobs, ['React React React'])[0].score).toBe(score);
  expect(scoreSearchMatches(jobs, ['React', 'REACT!'])[0].score).toBe(score);
});

test('handles no searches and breaks equal scores deterministically', () => {
  expect(scoreSearchMatches([job('a', 'Nurse')], [])).toEqual([]);
  expect(scoreSearchMatches([job('b', 'Nurse'), job('a', 'Nurse')], ['nurse']).map(result => result._id)).toEqual(['a', 'b']);
});

test.each(['Frontend', 'Janitor'])('keeps the latest %s title match ahead of accumulated historical matches', query => {
  const olderJobs = Array.from({ length: 4 }, (_, index) => job(`old${index}`, 'Backend engineer', {
    requirements: 'React SQL JavaScript Python AWS'
  }));
  const results = scoreSearchMatches([...olderJobs, job('latest', `${query} specialist`)],
    [query, 'React', 'SQL', 'JavaScript', 'Python', 'AWS']);
  expect(results[0]._id).toBe('latest');
  expect(results.slice(0, 4).some(result => result._id === 'latest')).toBe(true);
});

test('preserves literal title words inside recognized phrases and recognizes janitorial roles', () => {
  expect(scoreSearchMatches([job('a', 'Software engineer')], ['software'])[0].score).toBe(3);
  expect(scoreSearchMatches([job('a', 'Janitorial staff'), job('b', 'Custodian'), job('c', 'Cleaner')], ['Janitor'])).toHaveLength(3);
  expect(scoreSearchMatches([job('a', 'Front-end developer')], ['Frontend'])).toHaveLength(1);
});

test('historical searches still supply recommendations when the latest search has no matches', () => {
  expect(scoreSearchMatches([job('old', 'SQL analyst')], ['astronaut', 'SQL'])[0]._id).toBe('old');
});
