import test from 'node:test';
import assert from 'node:assert';
import { getJobLifecycleStatus } from '../applicationController.js';

// We are writing a "Unit Test" for the logic that determines if a job is Active or Closed.
// This is a core piece of the US-07 acceptance criteria.

test('Job Lifecycle Status - Active Job', () => {
  // Setup a fake job that is active and has a future deadline
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5); // 5 days from now
  const deadlineString = futureDate.toISOString().split('T')[0];

  const mockJob = {
    status: 'Active',
    deadline: deadlineString
  };

  const result = getJobLifecycleStatus(mockJob);
  
  assert.strictEqual(result, 'Active', 'Job with a future deadline should be Active');
});

test('Job Lifecycle Status - Expired Job', () => {
  // Setup a fake job that is active but the deadline was yesterday
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Yesterday
  const deadlineString = pastDate.toISOString().split('T')[0];

  const mockJob = {
    status: 'Active',
    deadline: deadlineString
  };

  const result = getJobLifecycleStatus(mockJob);
  
  assert.strictEqual(result, 'Closed', 'Job with a past deadline should be Closed');
});

test('Job Lifecycle Status - Draft Job', () => {
  const mockJob = {
    status: 'Draft',
    deadline: '2026-12-31'
  };

  const result = getJobLifecycleStatus(mockJob);
  
  assert.strictEqual(result, 'Closed', 'Draft jobs should never be considered Active in public search');
});