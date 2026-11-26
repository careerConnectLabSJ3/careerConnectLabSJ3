import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import FreshMatches from '../components/FreshMatches';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const job = { _id: 'j1', title: 'React engineer', company: 'Atlas', location: 'Remote', jobType: 'Contract', explanation: 'Matches React.' };
const props = { onView: vi.fn(), applicationsByJob: new Map() };

it('requires confirmation for every AI run, permits cancel, and switches back to search only', async () => {
  const api = vi.fn(async (url, options) => Response.json({ mode: options.method === 'POST' ? 'ai' : 'search', jobs: [job] }));
  vi.stubGlobal('fetch', api);
  render(<FreshMatches {...props} />);
  await screen.findByText(job.title);
  expect(api.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Improve matches with AI' }));
  expect(screen.getByRole('dialog')).toHaveTextContent(/Anthropic/);
  expect(api).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Improve matches with AI' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate AI matches' }));
  await screen.findByText(/AI matches from your profile/);
  expect(api).toHaveBeenLastCalledWith('/api/jobs/matches', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'confirm-ai-matching' }) }));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh recommendations' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Use search-only matches' }));
  await screen.findByText(/AI is off/);
  expect(api).toHaveBeenLastCalledWith('/api/jobs/matches', expect.objectContaining({ method: 'GET' }));
});

it('filters recommendations and shows explanations, skills and missing evidence', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ mode: 'search', jobs: [
    { ...job, matchingSkills: ['React'], missingQualifications: ['SQL'] },
    { ...job, _id: 'j2', title: 'Backend developer', location: 'Montreal', jobType: 'Full-time' }
  ] })));
  render(<FreshMatches {...props} />);
  await screen.findByText(job.title);
  expect(screen.getByText(/Matching skills/).parentElement).toHaveTextContent('React');
  expect(screen.getByText(/Not evidenced/).parentElement).toHaveTextContent('SQL');
  fireEvent.change(screen.getByLabelText('Recommendation location'), { target: { value: 'Remote' } });
  expect(screen.queryByText('Backend developer')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Recommendation job type'), { target: { value: 'Full-time' } });
  expect(screen.getByRole('status')).toHaveTextContent('No matching jobs');
});

it('shows loading and provider errors, retains old results, and refreshes search-only when searches change', async () => {
  const api = vi.fn(async (url, options) => options.method === 'POST'
    ? Response.json({ error: 'AI matching failed.' }, { status: 502 })
    : Response.json({ mode: 'search', jobs: [job] }));
  vi.stubGlobal('fetch', api);
  const view = render(<FreshMatches {...props} />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  await screen.findByText(job.title);
  view.rerender(<FreshMatches {...props} searchRevision={1} />);
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Improve matches with AI' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Improve matches with AI' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and generate AI matches' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('AI matching failed.');
  expect(screen.getByText(job.title)).toBeVisible();
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button'));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

it('shows no more than four recommendation cards', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ mode: 'search', jobs:
    Array.from({ length: 6 }, (_, index) => ({ ...job, _id: `job${index}`, title: `Match ${index}` }))
  })));
  render(<FreshMatches {...props} />);
  await screen.findByText('Match 0');
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.queryByText('Match 4')).not.toBeInTheDocument();
});

it('refills four cards from reserves after filtering or applying', async () => {
  const jobs = Array.from({ length: 8 }, (_, index) => ({ ...job, _id: `j${index}`, title: `Role ${index}`,
    location: index < 3 ? 'Montreal' : 'Remote', recommendationType: index > 3 ? 'discovery' : undefined }));
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ mode: 'search', jobs: jobs.slice(0, 4), alternatives: jobs.slice(4) })));
  const view = render(<FreshMatches {...props} />);
  await screen.findByText('Role 0');
  fireEvent.change(screen.getByLabelText('Recommendation location'), { target: { value: 'Remote' } });
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.getByText('Role 6')).toBeInTheDocument();
  view.rerender(<FreshMatches {...props} applicationsByJob={new Map([['j3', {}]])} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.queryByText('Role 3')).not.toBeInTheDocument();
  expect(screen.getByText('Role 7')).toBeInTheDocument();
  expect(screen.getAllByText('Broader suggestion')).toHaveLength(4);
});
