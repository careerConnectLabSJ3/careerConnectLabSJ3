import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from '../components/Profile';

const profile = { name: 'Alex Morgan', education: 'Concordia University', experience: 'Developer', skills: 'React, CSS', role: 'job_seeker', resume: { fileName: 'alex.pdf' } };
const response = (body) => ({ ok: true, json: async () => body });

describe('Profile interactions', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(profile))));
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('shows profile details and named icon actions, and restores canceled edits', async () => {
    render(<MemoryRouter><Profile/></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'alex.pdf' })).toHaveAttribute('href', '/api/profile/resume');
    expect(screen.getByRole('button', { name: 'Delete resume' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/applications', { credentials: 'include' });
  });

  it('saves edited fields and returns to the profile summary', async () => {
    render(<MemoryRouter><Profile/></MemoryRouter>);
    await screen.findByText('Alex Morgan');
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Experience' }), { target: { value: 'Senior developer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('button', { name: 'Edit profile' });
    expect(screen.getByText('Senior developer')).toBeInTheDocument();
    const [url, options] = fetch.mock.calls.find(([requestUrl]) => requestUrl === '/api/profile');
    expect(url).toBe('/api/profile');
    expect(options.body.get('experience')).toBe('Senior developer');
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  });

  it('deletes a resume and offers upload again', async () => {
    render(<MemoryRouter><Profile/></MemoryRouter>);
    await screen.findByText('alex.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }));
    await waitFor(() => expect(screen.queryByText('alex.pdf')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Upload resume' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/profile/resume', { method: 'DELETE', credentials: 'include' });
  });

  it('keeps the resume panel exclusive to job seekers', async () => {
    fetch.mockResolvedValue(response({ ...profile, role: 'recruiter' }));
    render(<MemoryRouter><Profile/></MemoryRouter>);
    await screen.findByText('Alex Morgan');
    expect(screen.queryByRole('heading', { name: 'Résumé' })).not.toBeInTheDocument();
  });
});
