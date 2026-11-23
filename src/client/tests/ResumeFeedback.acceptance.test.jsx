import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { findResumeAnchor } from '../utils/resumeAnchors';
import ResumeFeedback from '../components/ResumeFeedback';

vi.mock('../components/ResumePdf', async () => {
  const { useEffect } = await import('react');
  return { default: function FakePdf({ edits, onDocument, onPage }) {
    useEffect(() => {
      onDocument(1);
      onPage(1, true, (edits[1] || []).map(edit => edit.id));
    }, [edits, onDocument, onPage]);
    return null;
  } };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('matches text across wrapped runs and refuses ambiguous matches', () => {
  expect(findResumeAnchor(['• Built a', 'dashboard for 12 users.'], 'Built a dashboard for 12 users.'))
    .toEqual([{ index: 0, start: 2, end: 9 }, { index: 1, start: 0, end: 23 }]);
  expect(findResumeAnchor(['Built a demo', 'Built a demo'], 'Built a demo')).toEqual([]);
  expect(findResumeAnchor(['Built a demo'], 'Grew sales')).toEqual([]);
});

it('reviews the saved PDF, rewrites one bullet, and supports approve, copy, skip and undo', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({
    ok: true, json: async () => ({ edits: [{
      page: 1, original: 'Used React to build a dashboard.', reason: 'Lead with the contribution',
      question: 'Who used it?', replacement: 'Built a dashboard using React.'
    }, {
      page: 1, original: 'Built a demo.', reason: 'Missing outcome',
      question: 'How much faster did it load?', replacement: ''
    }] })
  }).mockResolvedValueOnce({
    ok: true, json: async () => ({ replacement: 'Built a demo that reduced load time by 15%.' })
  });
  vi.stubGlobal('fetch', fetch);
  const copy = vi.fn().mockResolvedValue();
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
  try {
    const { rerender } = render(<ResumeFeedback />);
    expect(screen.getByText('Upload and save a PDF above to start.')).toBeInTheDocument();
    rerender(<ResumeFeedback resume={{ fileName: 'John Smith.pdf' }} />);
    expect(screen.getByText('John Smith.pdf')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    const improve = screen.getByRole('button', { name: 'Improve with Claude' });
    await waitFor(() => expect(improve).toBeEnabled());
    fireEvent.click(improve);
    await screen.findByText('Built a dashboard using React.');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.queryByLabelText('Who used it?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add detail' }));
    expect(screen.getByLabelText('Who used it?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit 2' }));
    await screen.findByRole('heading', { name: 'Missing outcome' });
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('How much faster did it load?'), { target: { value: '15%' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rewrite bullet' }));
    await screen.findByText('Built a demo that reduced load time by 15%.');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByText('Approved changes (1)'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy approved changes' }));
    expect(copy).toHaveBeenCalledWith('Built a demo that reduced load time by 15%.');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  } finally {
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
    else delete navigator.clipboard;
  }
});
