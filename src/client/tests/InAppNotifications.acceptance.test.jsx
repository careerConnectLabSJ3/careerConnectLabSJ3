import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import JobSeekerDashboard from '../components/JobSeekerDashboard'; // Adjust path if needed

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
    // Mock the API calls made by the dashboard on load
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/api/notifications')) {
        return {
          ok: true,
          json: async () => ([
            { _id: 'notif-1', type: 'StatusUpdate', message: 'Your application for Developer was updated to Interview' }
          ])
        };
      }
      // Default empty response for other API calls (jobs, applications, deadlines)
      return { ok: true, json: async () => [] };
    });

    render(<JobSeekerDashboard />);

    // Wait for the notification to appear
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
      // 3. Default empty for other dashboard API calls (jobs, applications, deadlines)
      return { ok: true, json: async () => [] };
    });

    render(<JobSeekerDashboard />);
    
    // Wait for the notification to load
    await screen.findByText('Test Message');

    // Find the dismiss button and click it
    const dismissButton = screen.getByTitle('Dismiss notification');
    fireEvent.click(dismissButton);

    // The notification should immediately disappear from the screen
    await waitFor(() => {
      expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });
  });
});