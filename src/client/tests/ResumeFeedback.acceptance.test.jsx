import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { findResumeAnchor } from '../utils/resumeAnchors';
import ResumeFeedback from '../components/ResumeFeedback';

const mocks = vi.hoisted(() => ({ writeResumePdf: vi.fn() }));
vi.mock('../utils/writeResumePdf', () => ({
  writeResumePdf: mocks.writeResumePdf
}));

vi.mock('../components/ResumePdf', async () => {
  const { useEffect } = await import('react');
  return { default: function FakePdf({ edits, onDocument, onPage, label }) {
    useEffect(() => {
      onDocument?.(1);
      onPage?.(1, true, (edits?.[1] || []).map(edit => edit.id));
    }, [edits, onDocument, onPage]);
    return <section aria-label={label} />;
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

it('reviews and saves an updated PDF after the user previews it', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({
    ok: true, json: async () => ({ available: true })
  }).mockResolvedValueOnce({
    ok: true, json: async () => ({ edits: [{
      page: 1, original: 'Used React to build a dashboard.', reason: 'Lead with the contribution',
      question: 'Who used it?', replacement: 'Built a dashboard using React.'
    }, {
      page: 1, original: 'Built a demo.', reason: 'Missing outcome',
      question: 'How much faster did it load?', replacement: ''
    }] })
  }).mockResolvedValueOnce({
    ok: true, json: async () => ({ replacement: 'Built a demo that reduced load time by 15%.' })
  }).mockResolvedValueOnce({
    ok: true, json: async () => ({ resume: { version: 'revision' }, message: 'Updated resume saved.' })
  });
  vi.stubGlobal('fetch', fetch);
  mocks.writeResumePdf.mockRejectedValueOnce(new Error('This edit does not fit the PDF layout.'))
    .mockResolvedValueOnce(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
  const onResumeSaved = vi.fn();
  const createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  const revokeURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  try {
    const { rerender } = render(<ResumeFeedback />);
    expect(screen.getByText('Upload and save a PDF on your profile to start.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    rerender(<ResumeFeedback resume={{ fileName: 'John Smith.pdf', version: 'original' }} onResumeSaved={onResumeSaved} />);
    expect(screen.getByText('John Smith.pdf')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/profile/resume-feedback/status', expect.any(Object));
    const improve = screen.getByRole('button', { name: 'Check with AI' });
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
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview updated PDF' }));
    const previewError = await screen.findByRole('alert');
    expect(previewError).toHaveTextContent('This edit does not fit the PDF layout.');
    expect(previewError.nextElementSibling).toHaveTextContent('Preview updated PDF');
    fireEvent.click(screen.getByRole('button', { name: 'Preview updated PDF' }));
    expect(await screen.findByRole('region', { name: 'Updated resume PDF preview' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3);
    const save = screen.getByRole('button', { name: 'Save updated resume' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(onResumeSaved).toHaveBeenCalledWith({ version: 'revision' }, 'Updated resume saved.'));
    const [url, options] = fetch.mock.calls[3];
    expect(url).toBe('/api/profile/resume/revision');
    expect(options.body.get('version')).toBe('original');
    expect(options.body.get('resumeUpload').type).toBe('application/pdf');
  } finally {
    cleanup();
    createURL.mockRestore();
    revokeURL.mockRestore();
  }
});

it('explains missing AI configuration without starting a review', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ available: false }) });
  vi.stubGlobal('fetch', fetch);
  render(<ResumeFeedback resume={{ fileName: 'John Smith.pdf', version: 'original' }} />);
  expect(await screen.findByText(/AI review is unavailable/i)).toHaveTextContent('src/server/.env');
  expect(screen.getByRole('button', { name: 'Check with AI' })).toBeDisabled();
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/profile/resume-feedback/status']);
});
