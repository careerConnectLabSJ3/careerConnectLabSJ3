import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import JobSeekerDashboard from '../components/JobSeekerDashboard';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('finds a recommendation, opens its details, saves it and confirms an application', async () => {
  const job = { _id: 'j1', title: 'Systems engineer', company: 'Atlas', location: 'Remote',
    jobType: 'Contract', matchedKeywords: ['c++', 'sql'], description: 'Build scheduling tools.' };
  const api = vi.fn(async (url, options) => {
    if (url === '/api/jobs/matches') return Response.json({ mode: 'search', jobs: [{ ...job, explanation: 'Matches C++ SQL' }] });
    if (url.startsWith('/api/jobs/search?')) {
      if (url.includes('view=past')) return Response.json([{ ...job, _id: 'past', title: 'Past engineer', status: 'Closed' }]);
      const terms = new URL(url, 'http://localhost').searchParams.get('keywords');
      if (!terms) return Response.json([{ ...job, _id: 'other', title: 'Principal infrastructure engineer' }]);
      return Response.json(terms === 'C++ SQL' ? [job] : []);
    }
    if (url.endsWith('/details')) return Response.json({ job, canApply: true });
    if (url.endsWith('/favorite')) return Response.json({ isFavorite: options.method === 'POST' });
    if (url === '/api/jobs/j1/applications') return Response.json({ applicationsCount: 1 });
    return Response.json([]);
  });
  vi.stubGlobal('fetch', api);
  render(<JobSeekerDashboard />);
  const section = within(await screen.findByRole('region', { name: /recommended jobs/i }));
  const input = within(screen.getByRole('region', { name: 'Job Opportunities' })).getByRole('searchbox');
  const previousRow = await screen.findByRole('row', { name: /principal infrastructure engineer/i });
  const table = screen.getByRole('table');
  fireEvent.change(input, { target: { value: 'C++' } });
  fireEvent.change(input, { target: { value: 'C++ SQL' } });
  expect(previousRow).toBeVisible();
  expect(await screen.findByRole('button', { name: 'View details for Systems engineer' })).toBeInTheDocument();
  expect(screen.getByRole('table')).toBe(table);
  expect(previousRow).not.toBeInTheDocument();
  expect(api.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
  await waitFor(() => expect(api.mock.calls.filter(([, options]) => options?.method === 'POST').map(([url]) => url))
    .toEqual(['/api/jobs/search?keywords=C%2B%2B+SQL&view=active']), { timeout: 2500 });
  expect(await section.findByText(job.title)).toBeInTheDocument();
  expect(section.queryByText('Atlas · Remote · Contract')).not.toBeInTheDocument();
  fireEvent.click(section.getByRole('button', { name: job.title }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByText(job.description)).toBeInTheDocument();
  fireEvent.click(dialog.getByRole('button', { name: /bookmark/i }));
  expect(api).toHaveBeenCalledWith('/api/jobs/j1/favorite', expect.objectContaining({ method: 'POST' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Apply' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm application' }));
  expect(await dialog.findByText('Application submitted successfully.')).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/jobs/j1/applications', expect.objectContaining({ method: 'POST' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Closed jobs' }));
  expect(await screen.findByText('Past engineer')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'View details for Systems engineer' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Active jobs' }));
  fireEvent.change(input, { target: { value: 'nursing' } });
  expect(await screen.findByText(/no active jobs match/i)).toBeInTheDocument();
});

it('paginates all jobs and resets the page when sorting or filtering', async () => {
  const jobs = Array.from({ length: 51 }, (_, i) => ({ _id: `job${i}`, title: `Role ${String(i).padStart(2, '0')}`,
    status: i % 2 ? 'Closed' : 'Active', publishedAt: new Date(2026, 0, i + 1).toISOString() }));
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url === '/api/jobs/matches') return Response.json({ mode: 'search', jobs: [] });
    if (url.startsWith('/api/jobs/search?')) {
      const view = new URL(url, 'http://localhost').searchParams.get('view');
      return Response.json(jobs.filter(job => view === 'all' || job.status === (view === 'past' ? 'Closed' : 'Active')));
    }
    return Response.json([]);
  }));
  render(<JobSeekerDashboard />);
  await screen.findByText('Role 50');
  expect(screen.getByRole('radio', { name: 'All jobs' })).toBeChecked();
  expect(screen.getAllByRole('row')).toHaveLength(26);
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('Role 25')).toBeInTheDocument();
  expect(screen.queryByText('Role 50')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getAllByRole('row')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort jobs' }), { target: { value: 'oldest' } });
  expect(screen.getByText('Role 00')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'Closed jobs' }));
  await waitFor(() => expect(screen.queryByText('Role 00')).not.toBeInTheDocument());
  expect(screen.getAllByRole('row')).toHaveLength(26);
  expect(screen.queryByRole('navigation', { name: 'Job listing pages' })).not.toBeInTheDocument();
});
