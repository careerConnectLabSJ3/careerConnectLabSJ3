import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import JobSeekerDashboard from '../components/JobSeekerDashboard';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('finds a recommendation, opens its details, saves it and confirms an application', async () => {
  const job = { _id: 'j1', title: 'Systems engineer', company: 'Atlas', location: 'Remote',
    jobType: 'Contract', matchedKeywords: ['c++', 'sql'], description: 'Build scheduling tools.' };
  const api = vi.fn(async (url, options) => {
    if (url.startsWith('/api/jobs/recommendations?')) {
      const terms = new URL(url, 'http://localhost').searchParams.get('keywords');
      return Response.json(terms === 'C++ SQL' ? [job] : []);
    }
    if (url.endsWith('/details')) return Response.json({ job, canApply: true });
    if (url.endsWith('/favorite')) return Response.json({ isFavorite: options.method === 'POST' });
    if (url === '/api/jobs/j1/applications') return Response.json({ applicationsCount: 1 });
    return Response.json([]);
  });
  vi.stubGlobal('fetch', api);
  render(<JobSeekerDashboard />);
  const section = within(screen.getByRole('region', { name: 'Recommended jobs' }));
  const input = section.getByRole('searchbox');
  fireEvent.change(input, { target: { value: 'C++ SQL' } });
  expect(await section.findByText(job.title)).toBeInTheDocument();
  expect(section.getByText('Atlas · Remote · Contract')).toBeInTheDocument();
  fireEvent.click(section.getByRole('button', { name: /view details/i }));
  const dialog = within(screen.getByRole('dialog'));
  expect(await dialog.findByText(job.description)).toBeInTheDocument();
  fireEvent.click(dialog.getByRole('button', { name: /bookmark/i }));
  expect(api).toHaveBeenCalledWith('/api/jobs/j1/favorite', expect.objectContaining({ method: 'POST' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Apply' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm application' }));
  expect(await dialog.findByText('Application submitted successfully.')).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/jobs/j1/applications', expect.objectContaining({ method: 'POST' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
  fireEvent.change(input, { target: { value: 'nursing' } });
  expect(await section.findByText(/no recommended jobs match/i)).toBeInTheDocument();
  expect(section.queryByText(job.title)).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: '' } });
  expect(section.getByText(/enter one or more keywords/i)).toBeInTheDocument();
});
