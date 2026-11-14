import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FavoriteJobs from '../components/FavoriteJobs';
import JobDetailsModal from '../components/JobDetailsModal';

function jsonResponse(body) {
  return {
    ok: true,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body
  };
}

function mockJobDetails(initialFavorite) {
  let isFavorite = initialFavorite;
  fetch.mockImplementation(async (url, options) => {
    if (url.endsWith('/details')) {
      return jsonResponse({
        job: { title: 'Backend Developer', company: 'Test Company', location: 'Montreal' },
        canApply: true,
        hasApplied: false
      });
    }
    if (options?.method === 'POST') isFavorite = true;
    if (options?.method === 'DELETE') isFavorite = false;
    return jsonResponse({ isFavorite });
  });
}

describe('Saved jobs acceptance tests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the saved jobs list', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{
      _id: 'job-1', title: 'Frontend Engineer', company: 'Test Company',
      status: 'Active', deadline: '2030-01-01', location: 'Montreal'
    }]));
    render(<FavoriteJobs />);
    expect(screen.getByText('Loading your saved jobs...')).toBeInTheDocument();
    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('1 job')).toBeInTheDocument();
  });

  it('shows a filled bookmark for an already saved job', async () => {
    mockJobDetails(true);
    render(<JobDetailsModal jobId="job-2" onClose={() => {}} />);
    await screen.findByText('Backend Developer');
    await waitFor(() => expect(screen.getByRole('button', { name: /bookmark/i })).toHaveClass('filled'));
  });

  it.each([
    { initial: false, method: 'POST', expected: true, action: 'saves' },
    { initial: true, method: 'DELETE', expected: false, action: 'unsaves' }
  ])('$action a job and keeps the confirmed bookmark state', async ({ initial, method, expected }) => {
    mockJobDetails(initial);
    render(<JobDetailsModal jobId="job-3" onClose={() => {}} />);
    await screen.findByText('Backend Developer');
    const bookmark = screen.getByRole('button', { name: /bookmark/i });
    await waitFor(() => expect(bookmark.classList.contains('filled')).toBe(initial));
    await act(async () => {
      fireEvent.click(bookmark);
    });
    expect(fetch).toHaveBeenCalledWith('/api/jobs/job-3/favorite', expect.objectContaining({ method }));
    expect(bookmark.classList.contains('filled')).toBe(expected);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
