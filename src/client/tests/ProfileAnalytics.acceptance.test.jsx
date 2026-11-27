import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileAnalytics, { RecruiterAnalytics } from '../components/ProfileAnalytics';

describe('Profile application analytics', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 30, 12));
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('shows real weekly and status charts and changes the period', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => [
      { status: 'Applied', appliedAt: new Date().toISOString() },
      { status: 'Interview', appliedAt: new Date().toISOString() },
      { status: 'Rejected', appliedAt: '2020-01-04T12:00:00.000Z' }
    ] });
    render(<MemoryRouter><ProfileAnalytics /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Applications per week' })).toBeInTheDocument();
    const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(2026, 10, 30));
    expect(screen.getByLabelText(`2 applications during the week of ${label}`)).toBeInTheDocument();
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

  it('shows recruiter volume and status pies with one aggregate request from owned postings', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => [
      { _id: 'job-1', title: 'Frontend Engineer', total: 2, counts: { Applied: 1, Offer: 1 } },
      { _id: 'job-2', title: 'Backend Engineer', total: 1, counts: { Interview: 1 } }
    ] });
    render(<MemoryRouter><RecruiterAnalytics /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Applicants per posting' })).toBeInTheDocument();
    expect(screen.getByLabelText('2 applicants for Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByLabelText(/Backend Engineer: Applied 0, Interview 1/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatch(/^\/api\/jobs\/analytics\?since=/);
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/jobs/analytics', expect.any(Object)));
  });
});
