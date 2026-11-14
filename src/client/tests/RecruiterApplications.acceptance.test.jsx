import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { formatDate } from '../utils/jobUtils';

vi.mock('../components/Profile', () => ({ default: () => null }));

const jobs = [
  { _id: 'job-1', title: 'Software Developer', department: 'Engineering', applicationsCount: 2, status: 'Active' },
  { _id: 'job-2', title: 'UX Designer', department: 'Design', applicationsCount: 0, status: 'Active' }
];
const profile = {
  name: 'Taylor Lee', email: 'taylor@example.test', education: 'Computer Science',
  experience: 'Software Intern', skills: 'React and Node'
};
const applications = [
  { _id: 'application-1', applicant: profile, appliedAt: '2026-10-21T12:00:00Z', status: 'Applied' },
  { _id: 'application-2', applicant: { name: 'Avery Chen', skills: 'Python' }, appliedAt: '2026-10-20T12:00:00Z', status: 'Interview' }
];
const listUrl = '/api/jobs/job-1/applications';

function mockApi(entries) {
  const routes = {
    '/api/check-session': { loggedIn: true, user: { name: 'CareerConnect Recruiter', role: 'recruiter' } },
    '/api/jobs/mine': jobs,
    ...entries
  };
  vi.stubGlobal('fetch', vi.fn(async url => ({
    ok: Boolean(routes[url]) && !routes[url].error,
    json: async () => routes[url] || { error: 'Unknown API route' }
  })));
}

beforeEach(() => {
  window.history.replaceState(null, '', '/dashboard');
  // jsdom does not implement the browser's native modal dialog methods.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('opens the applicant overview, searches and sorts, and navigates to the selected application', async () => {
  mockApi({
    [listUrl]: applications,
    [`${listUrl}/application-1`]: {
      ...applications[0], job: { title: jobs[0].title }, resume: { fileName: 'Taylor.pdf' }
    }
  });
  render(<App />);
  const viewApplicants = await screen.findByRole('link', { name: 'View applicants for Software Developer' });
  expect(viewApplicants).toHaveTextContent(/^View applicants$/);
  fireEvent.click(viewApplicants);
  expect(window.location.pathname).toBe('/dashboard/jobs/job-1/applications');
  expect(await screen.findByRole('heading', { name: 'Job applicants' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Your job postings' })).not.toBeInTheDocument();
  await screen.findByRole('link', { name: 'Taylor Lee' });
  const list = screen.getByRole('table', { name: 'Applications' });
  expect(within(list).getAllByRole('link').map(link => link.textContent)).toEqual(['Taylor Lee', 'Avery Chen']);
  expect(within(list).getByText(formatDate(applications[0].appliedAt))).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } });
  expect(within(list).getAllByRole('link').map(link => link.textContent)).toEqual(['Avery Chen', 'Taylor Lee']);
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'oldest' } });
  expect(within(list).getAllByRole('link')[0]).toHaveTextContent('Avery Chen');
  fireEvent.change(screen.getByLabelText('Search field'), { target: { value: 'skills' } });
  fireEvent.change(screen.getByRole('searchbox', { name: 'Keyword' }), { target: { value: ' missing ' } });
  expect(screen.getByText('No applicants match your search.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Keyword' }), { target: { value: ' rEaCt ' } });
  expect(within(screen.getByRole('table', { name: 'Applications' })).getAllByRole('link')).toHaveLength(1);

  fireEvent.click(screen.getByRole('link', { name: 'Taylor Lee' }));
  expect(await screen.findByRole('heading', { name: 'Taylor Lee' })).toBeInTheDocument();
  const dialog = screen.getByRole('dialog', { name: 'Taylor Lee' });
  expect(within(dialog).getByText(formatDate(applications[0].appliedAt))).toBeInTheDocument();
  expect(screen.getByText(profile.education)).toBeInTheDocument();
  expect(screen.getByText(profile.experience)).toBeInTheDocument();
  expect(screen.getByText(profile.skills)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View CV (Taylor.pdf)' })).toHaveAttribute('href', `${listUrl}/application-1/resume`);

  fireEvent.click(screen.getByRole('button', { name: 'Close application' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(await screen.findByRole('table', { name: 'Applications' })).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Keyword' })).toHaveValue(' rEaCt ');
  expect(screen.getByLabelText('Sort by')).toHaveValue('oldest');
  expect(screen.getByLabelText('Search field')).toHaveValue('skills');
  expect(within(screen.getByRole('table', { name: 'Applications' })).getAllByRole('link')).toHaveLength(1);
});

it.each(['focus', 'visibilitychange'])('refreshes on %s without polling or losing search and sort settings', async trigger => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  window.history.replaceState(null, '', '/dashboard/jobs/job-1/applications');
  mockApi({ [listUrl]: [applications[0]] });
  render(<App />);
  await screen.findByRole('link', { name: 'Taylor Lee' });
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'name' } });
  fireEvent.change(screen.getByRole('searchbox', { name: 'Keyword' }), { target: { value: 'e' } });
  const initialRequestCount = fetch.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(fetch).toHaveBeenCalledTimes(initialRequestCount);
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  expect(fetch).toHaveBeenCalledTimes(initialRequestCount);
  hidden.mockReturnValue(false);
  fetch.mockResolvedValueOnce({ ok: true, json: async () => applications });

  await act(async () => {
    if (trigger === 'focus') {
      fireEvent.focus(window);
    } else {
      fireEvent(document, new Event('visibilitychange'));
    }
  });

  expect(await screen.findByRole('link', { name: 'Avery Chen' })).toBeInTheDocument();
  expect(screen.getByText('2 applicants')).toBeInTheDocument();
  expect(screen.getByLabelText('Sort by')).toHaveValue('name');
  expect(screen.getByRole('searchbox', { name: 'Keyword' })).toHaveValue('e');
  expect(fetch).toHaveBeenLastCalledWith(listUrl, expect.objectContaining({ cache: 'no-store', credentials: 'include' }));
  cleanup();
  const requestCount = fetch.mock.calls.length;
  await vi.advanceTimersByTimeAsync(60000);
  fireEvent.focus(window);
  fireEvent(document, new Event('visibilitychange'));
  expect(fetch).toHaveBeenCalledTimes(requestCount);
});

it('keeps applicant results scoped to the selected posting and shows an empty state', async () => {
  mockApi({ [listUrl]: applications, '/api/jobs/job-2/applications': [] });
  render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'View applicants for Software Developer' }));
  expect(await screen.findByText('Taylor Lee')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Back to job postings' }));
  fireEvent.click(await screen.findByRole('link', { name: 'View applicants for UX Designer' }));
  expect(await screen.findByText('No one has applied for this posting yet.')).toBeInTheDocument();
  expect(screen.queryByText('Taylor Lee')).not.toBeInTheDocument();
});

it('shows application details when the applicant has no CV', async () => {
  window.history.replaceState(null, '', '/dashboard/jobs/job-1/applications/application-2');
  mockApi({
    [listUrl]: applications,
    [`${listUrl}/application-2`]: { ...applications[1], job: { title: jobs[0].title }, resume: null }
  });
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Avery Chen' })).toBeInTheDocument();
  expect(screen.getByText('No CV on file.')).toBeInTheDocument();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/dashboard/jobs/job-1/applications');
});
