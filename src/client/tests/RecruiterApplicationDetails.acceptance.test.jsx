import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RecruiterApplicationDetails from '../components/RecruiterApplications';

vi.mock('/img/edit-pen.svg', () => ({ default: 'edit-pen.svg' }));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ jobId: 'job-123', applicationId: 'app-456' }),
}));

const mockApplicationData = {
  _id: 'app-456',
  applicant: {
    name: 'Jane Doe',
    email: 'jane@example.com',
  },
  job: {
    title: 'Software Engineer',
  },
  appliedAt: '2026-06-01T00:00:00.000Z',
  status: 'Applied',
  interviewDate: null,
  resume: { fileName: 'resume.pdf' }
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.removeAttribute('open');
  });

  // Mock global.fetch to return mockApplicationData by default for GET requests
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockApplicationData,
  });

  const originalLocation = window.location;
  delete window.location;
  window.location = { ...originalLocation, reload: vi.fn() };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RecruiterApplicationDetails Acceptance Tests', () => {
  it('Criteria: The recruiter can select and view a candidate application details', async () => {
    render(<RecruiterApplicationDetails onClose={() => {}} />);

    // Now fetch resolves with mockApplicationData, and the heading renders!
    expect(await screen.findByRole('heading', { name: /jane doe/i })).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('Criteria: The available statuses include Applied, Interview, Rejected, and Offer', async () => {
    render(<RecruiterApplicationDetails onClose={() => {}} />);

    const editButton = await screen.findByRole('button', { name: /edit status/i });
    fireEvent.click(editButton);

    const statusSelect = screen.getByRole('combobox');
    const options = Array.from(statusSelect.options).map(opt => opt.value);
    expect(options).toEqual(['Applied', 'Interview', 'Rejected', 'Offer']);
  });

  it('Criteria: The recruiter can change the candidate status and save it successfully', async () => {
    render(<RecruiterApplicationDetails onClose={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /edit status/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Offer' } });

    // Mock the PATCH response before clicking Save
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/applications/app-456/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'Offer', interviewDate: null }),
      })
    );

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  it('Criteria: The system displays an error if the status update cannot be saved', async () => {
    render(<RecruiterApplicationDetails onClose={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /edit status/i }));

    // Mock a failed PATCH response before clicking Save
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized to update status.' }),
    });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText('Unauthorized to update status.')).toBeInTheDocument();
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});