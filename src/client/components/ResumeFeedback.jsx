import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
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
    throw new Error('Unable to reach Claude. Try again.');
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

export default function ResumeFeedback({ resume, uploading }) {
  const [edits, setEdits] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const panel = useRef(null);

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
    setMessage('');
  }

  async function improve() {
    if (!hasText || uploading || busy) return;
    setBusy('review');
    setError('');
    setMessage('');
    try {
      const data = await requestReview({ action: 'review-with-claude' });
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
      const data = await requestReview({ action: 'rewrite-with-claude', original: edit.original, question: edit.question, answer });
      setEdits(previous => previous.map(item => item.id === edit.id
        ? { ...item, replacement: data.replacement, question: '' } : item));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function copyApproved() {
    try {
      await navigator.clipboard.writeText(approved.map(edit => edit.replacement).join('\n'));
      setMessage('Approved changes copied.');
    } catch {
      setMessage('Unable to copy. Select the approved text to copy it.');
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
            <ResumePdf edits={byPage} activeId={active?.id} decisions={decisions} onSelect={selectEdit}
              onDocument={setPageCount} onPage={onPage} />
          </Suspense>

          <aside className="resume-review-panel" ref={panel} aria-label="Review suggestions">
            <h3>Review</h3>
            {(!edits || (!placed.length && allPagesReady)) && <button type="button" className="resume-run" onClick={improve}
              disabled={!hasText || uploading || Boolean(busy)} title="Sends your saved PDF to Claude">
              {busy === 'review' ? 'Reviewing…' : edits ? 'Review again with Claude' : 'Improve with Claude'}
            </button>}
            {!hasText && allPagesReady && <p>This PDF has no selectable text. Upload a text-based PDF to see inline edits.</p>}
            {busy === 'review' && <p role="status">Looking for the most useful edits…</p>}
            {busy === 'rewrite' && <p role="status">Rewriting bullet…</p>}
            {error && <p className="resume-review-error" role="alert">{error}</p>}
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
              <details className="resume-approved">
                <summary>Approved changes ({approved.length})</summary>
                <ul>{approved.map(edit => <li key={edit.id}>{edit.replacement}</li>)}</ul>
                <button type="button" onClick={copyApproved}>Copy approved changes</button>
              </details>
            )}
            {message && <p role="status">{message}</p>}
          </aside>
        </div>
      )}
    </section>
  );
}
