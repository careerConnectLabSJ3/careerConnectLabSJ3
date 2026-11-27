import { MemoryRouter, useNavigate } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import JobApplications from '../components/JobApplications';

function HistoryButtons() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button></>;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('restores the URL filter on back and forward navigation', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
  render(<MemoryRouter initialEntries={['/applications']}><HistoryButtons/><JobApplications/></MemoryRouter>);
  await screen.findByText('No applications yet');
  fireEvent.click(screen.getByRole('button', { name: 'Interview' }));
  expect(screen.getByRole('button', { name: 'Interview' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('button', { name: 'All applications' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
  expect(screen.getByRole('button', { name: 'Interview' })).toHaveAttribute('aria-pressed', 'true');
});
