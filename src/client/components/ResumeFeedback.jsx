import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../public/css/resumeFeedback.css';

const ResumePdf = lazy(() => import('./ResumePdf'));

async function requestReview(body) {
  let response;
  let data;
  try {
    response = await fetch('/api/profile/resume-feedback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    data = await response.json();
  } catch {
    throw new Error('Unable to reach the AI service. Try again.');
  }
  if (!response.ok) throw new Error(data.error || 'Unable to review this resume.');
  return data;
}

function EditCard({ edit, decision, busy, onDecide, onRewrite }) {
  const [answer, setAnswer] = useState('');
  const [addingDetail, setAddingDetail] = useState(false);
  const questionVisible = !decision && edit.question && (!edit.replacement || addingDetail);
  return (
    <section className="resume-edit-card" aria-label={`Edit ${edit.id}`}>
      <h3>{edit.reason}</h3>
      <blockquote className={decision === 'skipped' ? 'skipped' : ''}><del>{edit.original}</del></blockquote>
      {edit.replacement && <p className="resume-rewrite">{edit.replacement}</p>}
      {questionVisible && (
        <form onSubmit={event => { event.preventDefault(); onRewrite(edit, answer.trim()); }}>
          <label htmlFor="resume-edit-answer">{edit.question}</label>
          <input id="resume-edit-answer" type="text" maxLength={160} value={answer} disabled={busy}
            placeholder="Short answer" onChange={event => setAnswer(event.target.value)} />
          <button type="submit" disabled={busy || !answer.trim()}>Rewrite bullet</button>
        </form>
      )}
      <div className="resume-review-actions">
        {decision ? (
          <>
            <span className={`resume-decision ${decision}`}>{decision === 'approved' ? 'Approved' : 'Skipped'}</span>
            <button type="button" onClick={() => onDecide(edit.id, null)}>Undo</button>
          </>
        ) : (
          <>
            {edit.replacement && <button className="resume-approve" type="button" disabled={busy}
              onClick={() => onDecide(edit.id, 'approved')}>Approve</button>}
            <button type="button" disabled={busy} onClick={() => onDecide(edit.id, 'skipped')}>Skip</button>
            {edit.replacement && edit.question && !addingDetail && (
              <button className="resume-add-detail" type="button" disabled={busy} onClick={() => setAddingDetail(true)}>
                Add detail
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function ResumeFeedback({ resume, uploading, onResumeSaved }) {
  const [edits, setEdits] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewPageCount, setPreviewPageCount] = useState(0);
  const panel = useRef(null);
  const exportSource = useRef({ pdf: null, layouts: new Map() });

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const byPage = useMemo(() => {
    const groups = {};
    for (const edit of edits || []) (groups[edit.page] ||= []).push(edit);
    return groups;
  }, [edits]);

  const onPage = useCallback((number, hasText, ids) => {
    setPages(previous => ({ ...previous, [number]: { hasText, ids } }));
  }, []);

  const anchoredIds = new Set(Object.values(pages).flatMap(page => page.ids));
  const placed = edits?.filter(edit => anchoredIds.has(edit.id)) || [];
  const active = placed.find(edit => edit.id === activeId) || placed[0];
  const approved = placed.filter(edit => decisions[edit.id] === 'approved');
  const hasText = Object.values(pages).some(page => page.hasText);
  const allPagesReady = pageCount > 0 && Object.keys(pages).length === pageCount;
  const pending = placed.filter(edit => !decisions[edit.id]).length;

  function selectEdit(id, scrollToPdf) {
    setActiveId(id);
    setError('');
    if (scrollToPdf) {
      document.getElementById(`resume-mark-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (window.matchMedia('(max-width: 780px)').matches) {
      panel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function decide(id, decision) {
    setDecisions(previous => ({ ...previous, [id]: decision }));
  }

  async function improve() {
    if (!hasText || uploading || busy) return;
    setBusy('review');
    setError('');
    try {
      const data = await requestReview({ action: 'review-with-claude', version: resume.version });
      setPages(previous => Object.fromEntries(Object.entries(previous).map(([number, page]) =>
        [number, { ...page, ids: [] }])));
      setEdits(data.edits.map((edit, index) => ({ ...edit, id: index + 1 })));
      setDecisions({});
      setActiveId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function rewrite(edit, answer) {
    if (!answer || busy || uploading) return;
    setBusy('rewrite');
    setError('');
    try {
      const data = await requestReview({
        action: 'rewrite-with-claude', version: resume.version, original: edit.original, question: edit.question, answer
      });
      setEdits(previous => previous.map(item => item.id === edit.id
        ? { ...item, replacement: data.replacement, question: '' } : item));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function previewApproved() {
    if (!approved.length || busy || uploading) return;
    setBusy('preview');
    setError('');
    try {
      const { writeResumePdf } = await import('../utils/writeResumePdf');
      const pdf = await writeResumePdf(exportSource.current, approved);
      setPreviewPageCount(0);
      setPreview({ pdf, url: URL.createObjectURL(pdf) });
    } catch (err) {
      setError(err.message || 'Unable to create the PDF preview.');
    } finally {
      setBusy('');
    }
  }

  async function updateSavedResume(restore = false) {
    if (busy || uploading || (!restore && (!preview || !previewPageCount))) return;
    setBusy(restore ? 'restore' : 'save');
    setError('');
    try {
      const body = new FormData();
      body.append('version', resume.version);
      if (!restore) body.append('resumeUpload', preview.pdf, resume.fileName);
      const action = restore ? 'restore' : 'revision';
      const options = { method: 'POST', credentials: 'include', body };
      if (restore) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ version: resume.version });
      }
      const response = await fetch(`/api/profile/resume/${action}`, options);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update your resume.');
      setPreview(null);
      onResumeSaved(data.resume, data.message);
    } catch (err) {
      setError(err.message || 'Unable to update your resume.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="resume-improver" aria-labelledby="resume-improver-title">
      <header className="resume-improver-heading">
        <div>
          <h2 id="resume-improver-title">Resume Improver</h2>
          {resume && <p>{resume.fileName}</p>}
        </div>
        {resume && <a className="resume-original" href="/api/profile/resume" target="_blank" rel="noreferrer">Open PDF</a>}
      </header>

      {!resume ? <p className="resume-improver-empty">Upload and save a PDF above to start.</p> : (
        <div className="resume-improver-grid">
          <Suspense fallback={<p role="status">Loading the PDF viewer…</p>}>
            {preview ? <ResumePdf key="revision" source={preview.url} label="Updated resume PDF preview"
              onDocument={setPreviewPageCount} /> :
              <ResumePdf key="saved" edits={byPage} activeId={active?.id} decisions={decisions} onSelect={selectEdit}
                onDocument={setPageCount} onPage={onPage} exportSource={exportSource} />}
          </Suspense>

          <aside className="resume-review-panel" ref={panel} aria-label="Review suggestions">
            <h3>{preview ? 'Review updated PDF' : 'Review'}</h3>
            {error && <p className="resume-review-error" role="alert">{error}</p>}
            {preview ? (
              <>
                <p>Saving replaces the resume recruiters can view, including on past applications. You can restore your original.</p>
                <button className="resume-run" type="button" onClick={() => updateSavedResume()}
                  disabled={Boolean(busy) || uploading || !previewPageCount}>{busy === 'save' ? 'Saving…' : 'Save updated resume'}</button>
                <button type="button" disabled={Boolean(busy)} onClick={() => { setPreview(null); setError(''); }}>Back to edits</button>
              </>
            ) : <>
            {(!edits || (!placed.length && allPagesReady)) && <button type="button" className="resume-run" onClick={improve}
              disabled={!hasText || uploading || Boolean(busy)} title="Sends your saved PDF to Anthropic for AI review">
              {busy === 'review' ? 'Reviewing…' : edits ? 'Check again with AI' : 'Check with AI'}
            </button>}
            {!hasText && allPagesReady && <p>This PDF has no selectable text. Upload a text-based PDF to see inline edits.</p>}
            {busy === 'review' && <p role="status">Looking for the most useful edits…</p>}
            {busy === 'rewrite' && <p role="status">Rewriting bullet…</p>}
            {edits && !placed.length && allPagesReady && (
              <p>{edits.length ? 'No suggestions could be matched to the PDF.' : 'No specific improvements found.'}</p>
            )}
            {placed.length > 0 && (
              <>
                <p className="resume-review-count">{pending} to review · {approved.length} approved</p>
                <nav className="resume-edit-tabs" aria-label="Resume edits">
                  {placed.map(edit => (
                    <button key={edit.id} type="button" aria-pressed={active?.id === edit.id}
                      className={decisions[edit.id] || 'pending'} onClick={() => selectEdit(edit.id, true)}>
                      Edit {edit.id}
                    </button>
                  ))}
                </nav>
                {active && <EditCard key={active.id} edit={active} decision={decisions[active.id]}
                  busy={Boolean(busy) || uploading} onDecide={decide} onRewrite={rewrite} />}
              </>
            )}
            {approved.length > 0 && (
              <div className="resume-approved resume-save-options">
                <button type="button" className="resume-run" disabled={Boolean(busy) || uploading} onClick={previewApproved}>
                  {busy === 'preview' ? 'Preparing PDF…' : 'Preview updated PDF'}
                </button>
                <details>
                  <summary>Approved changes ({approved.length})</summary>
                  <ul>{approved.map(edit => <li key={edit.id}>{edit.replacement}</li>)}</ul>
                </details>
              </div>
            )}
            {resume.hasOriginal && <button type="button" disabled={Boolean(busy) || uploading}
              onClick={() => {
                if (window.confirm('Restore your original resume? This replaces the current PDF.')) updateSavedResume(true);
              }}>{busy === 'restore' ? 'Restoring…' : 'Restore original'}</button>}
            </>}
          </aside>
        </div>
      )}
    </section>
  );
}
