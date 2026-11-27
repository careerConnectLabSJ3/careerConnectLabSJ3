import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileAnalytics, { RecruiterAnalytics } from '../components/ProfileAnalytics';

describe('Profile application analytics', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('shows real weekly and status charts and changes the period', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => [
      { status: 'Applied', appliedAt: new Date().toISOString() },
      { status: 'Interview', appliedAt: new Date().toISOString() },
      { status: 'Rejected', appliedAt: '2020-01-04T12:00:00.000Z' }
    ] });
    render(<MemoryRouter><ProfileAnalytics /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Applications per week' })).toBeInTheDocument();
    expect(screen.getByLabelText('2 applications during the week of Nov 23')).toBeInTheDocument();
    expect(screen.getByLabelText('1 Interview applications')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    await waitFor(() => expect(screen.getByLabelText('1 Rejected applications')).toBeInTheDocument());
  });

  it('does not fabricate charts for an empty period', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<MemoryRouter><ProfileAnalytics /></MemoryRouter>);
    expect(await screen.findByText('No applications in this period yet.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Current status' })).not.toBeInTheDocument();
  });

  it('shows recruiter volume and stacked status charts from owned postings', async () => {
    fetch.mockImplementation(async url => {
      if (url === '/api/jobs/mine') return { ok: true, json: async () => [{ _id: 'job-1', title: 'Frontend Engineer' }, { _id: 'job-2', title: 'Backend Engineer' }] };
      if (url.endsWith('/job-1/applications')) return { ok: true, json: async () => [{ status: 'Applied', appliedAt: new Date().toISOString() }, { status: 'Offer', appliedAt: new Date().toISOString() }] };
      return { ok: true, json: async () => [{ status: 'Interview', appliedAt: new Date().toISOString() }] };
    });
    render(<MemoryRouter><RecruiterAnalytics /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Applicants per posting' })).toBeInTheDocument();
    expect(screen.getByLabelText('2 applicants for Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByLabelText(/Backend Engineer: Applied 0, Interview 1/)).toBeInTheDocument();
  });
});
