import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import JobSeekerDashboard from '../components/JobSeekerDashboard';

// Mock the child modal component
vi.mock('../components/JobDetailsModal', () => ({ default: () => <div>Modal</div> }));

describe('In-App Notifications Acceptance Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the list of active notifications on the dashboard', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/api/notifications')) {
        return {
          ok: true,
          json: async () => ([
            { _id: 'notif-1', type: 'StatusUpdate', message: 'Your application for Developer was updated to Interview' }
          ])
        };
      }
      // Handle FreshMatches API call
      if (url.includes('/api/jobs/matches')) {
        return { ok: true, json: async () => ({ jobs: [], alternatives: [] }) };
      }
      // Default empty response for other API calls (jobs, applications, deadlines)
      return { ok: true, json: async () => [] };
    });

    render(<JobSeekerDashboard />);

    expect(await screen.findByText(/Your application for Developer was updated to Interview/i)).toBeInTheDocument();
    expect(screen.getByText('StatusUpdate')).toBeInTheDocument();
  });

  it('allows a user to dismiss a notification', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      // 1. Handle GET notifications
      if (url.includes('/api/notifications') && (!options || !options.method)) {
        return {
          ok: true,
          json: async () => ([
            { _id: 'notif-1', type: 'StatusUpdate', message: 'Test Message' }
          ])
        };
      }
      // 2. Handle PATCH dismiss
      if (url.includes('/dismiss') && options?.method === 'PATCH') {
        return { ok: true, json: async () => ({ message: 'dismissed' }) };
      }
      // 3. FIX: Handle FreshMatches API call
      if (url.includes('/api/jobs/matches')) {
        return { ok: true, json: async () => ({ jobs: [], alternatives: [] }) };
      }
      // 4. Default empty for other dashboard API calls (jobs, applications, deadlines)
      return { ok: true, json: async () => [] };
    });

    render(<JobSeekerDashboard />);
    
    await screen.findByText('Test Message');
    const dismissButton = screen.getByTitle('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });
  });
});