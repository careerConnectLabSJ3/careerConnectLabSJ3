import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import JobSeekerDashboard from '../components/JobSeekerDashboard';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('finds a recommendation, opens its details, saves it and confirms an application', async () => {
  const job = { _id: 'j1', title: 'Systems engineer', company: 'Atlas', location: 'Remote',
    jobType: 'Contract', matchedKeywords: ['c++', 'sql'], description: 'Build scheduling tools.' };
  const api = vi.fn(async (url, options) => {
    if (url === '/api/jobs/recommendations') return Response.json([{ ...job, sourceSearch: 'C++ SQL' }]);
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
  const section = within(await screen.findByRole('region', { name: /new jobs matching/i }));
  const input = within(screen.getByRole('region', { name: 'Job Opportunities' })).getByRole('searchbox');
  const previousRow = await screen.findByRole('row', { name: /principal infrastructure engineer/i });
  const table = screen.getByRole('table');
  fireEvent.change(input, { target: { value: 'C++' } });
  fireEvent.change(input, { target: { value: 'C++ SQL' } });
  expect(previousRow).toBeVisible();
  expect(await screen.findByRole('button', { name: 'View details for Systems engineer' })).toBeInTheDocument();
  expect(screen.getByRole('table')).toBe(table);
  expect(previousRow).not.toBeInTheDocument();
  expect(api.mock.calls.filter(([, options]) => options?.method === 'POST').map(([url]) => url))
    .toEqual(['/api/jobs/search?keywords=C%2B%2B+SQL&view=active']);
  expect(await section.findByText(job.title)).toBeInTheDocument();
  expect(section.getByText('Atlas · Remote · Contract')).toBeInTheDocument();
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
  fireEvent.click(screen.getByRole('radio', { name: 'Past jobs' }));
  expect(await screen.findByText('Past engineer')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'View details for Systems engineer' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Active jobs' }));
  fireEvent.change(input, { target: { value: 'nursing' } });
  expect(await screen.findByText(/no active jobs match/i)).toBeInTheDocument();
});
