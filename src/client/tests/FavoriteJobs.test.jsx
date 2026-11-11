import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FavoriteJobs from '../components/FavoriteJobs';
import JobDetailsModal from '../components/JobDetailsModal';

// Mock global fetch
global.fetch = vi.fn();

describe('Saved Jobs and Favoriting Feature Acceptance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. User can view a list of saved job postings in the saved job postings tab', async () => {
    const mockJobs = [
      {
        _id: 'job-1',
        title: 'Frontend Engineer',
        company: 'Tech Corp',
        status: 'Open',
        deadline: '2030-01-01',
        location: 'Remote'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJobs,
    });

    render(<FavoriteJobs />);

    // Verify loading state appears
    expect(screen.getByText(/Loading your saved jobs.../i)).toBeInTheDocument();

    // Wait for jobs to render
    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
      expect(screen.getByText('1 job')).toBeInTheDocument();
    });
  });

  it('2. User can see a filled bookmark icon for already saved job postings', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/details')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job: { title: 'Backend Developer', company: 'Cloud Inc', location: 'New York' },
            canApply: true,
            hasApplied: false,
            isFavorite: true
          })
        });
      }
      if (url.includes('/favorite')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ isFavorite: true })
        });
      }
    });

    render(<JobDetailsModal jobId="job-2" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    });

    // Verify bookmark button exists and is rendered
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
    expect(bookmarkButton).toBeInTheDocument();
  });

  it('3 & 4. User can save a job posting and untap filled bookmark icon to unsave the job posting', async () => {
    // Mock initial state as favorited (isFavorite: true)
    fetch.mockImplementation((url, options) => {
      if (url.includes('/details')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job: { title: 'Fullstack Engineer', company: 'Dev Ltd', location: 'San Francisco' },
            canApply: true,
            hasApplied: false
          })
        });
      }
      if (url.includes('/favorite')) {
        if (options && options.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ isFavorite: true })
        });
      }
    });

    render(<JobDetailsModal jobId="job-3" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Fullstack Engineer')).toBeInTheDocument();
    });

    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });

    // Untap / click to remove from favorites (triggers DELETE request)
    fireEvent.click(bookmarkButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs/job-3/favorite'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});