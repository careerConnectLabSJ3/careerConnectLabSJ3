import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../public/css/resumeFeedback.css';
import ProfileIcon from './ProfileIcon';

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
      <p className="resume-comparison-label">Original</p>
      <blockquote className={decision === 'skipped' ? 'skipped' : ''}><del>{edit.original}</del></blockquote>
      {edit.replacement && <><p className="resume-comparison-label">Suggested</p><p className="resume-rewrite">{edit.replacement}</p></>}
      {questionVisible && (
        <form onSubmit={event => { event.preventDefault(); onRewrite(edit, answer.trim()); }}>
          <label htmlFor="resume-edit-answer">{edit.question}</label>
          <input id="resume-edit-answer" type="text" maxLength={160} value={answer} disabled={busy}
            placeholder="Short answer" onChange={event => setAnswer(event.target.value)} />
          <button type="submit" disabled={busy || !answer.trim()}><ProfileIcon name="sparkle"/>Rewrite bullet</button>
        </form>
      )}
      <div className="resume-review-actions">
        {decision ? (
          <>
            <span className={`resume-decision ${decision}`}>{decision === 'approved' ? 'Approved' : 'Skipped'}</span>
            <button type="button" aria-label="Undo" title="Undo decision" disabled={busy} onClick={() => onDecide(edit.id, null)}><ProfileIcon name="undo"/></button>
          </>
        ) : (
          <>
            {edit.replacement && <button className="resume-approve" type="button" disabled={busy}
              onClick={() => onDecide(edit.id, 'approved')}><ProfileIcon name="check"/>Approve</button>}
            <button type="button" aria-label="Skip" title="Skip suggestion" disabled={busy} onClick={() => onDecide(edit.id, 'skipped')}><ProfileIcon name="close"/></button>
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

function ActionError({ error, action }) {
  if (error?.action !== action) return null;
  return <p className="resume-review-error resume-action-error" role="alert">{error.message}</p>;
}

export default function ResumeFeedback({ resume, onResumeSaved }) {
  const [edits, setEdits] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState('loading');
  const [preview, setPreview] = useState(null);
  const [previewPageCount, setPreviewPageCount] = useState(0);
  const panel = useRef(null);
  const exportSource = useRef({ pdf: null, layouts: new Map() });

  useEffect(() => {
    if (!resume) return;
    const controller = new AbortController();
    async function loadAiStatus() {
      try {
        const response = await fetch('/api/profile/resume-feedback/status', {
          credentials: 'include', signal: controller.signal
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) setAiStatus(result.available ? 'available' : 'unconfigured');
      } catch {
        if (!controller.signal.aborted) setAiStatus('error');
      }
    }
    loadAiStatus();
    return () => controller.abort();
  }, [resume]);

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
    setError(null);
    if (scrollToPdf) {
      document.getElementById(`resume-mark-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (window.matchMedia('(max-width: 780px)').matches) {
      panel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function decide(id, decision) {
    setDecisions(previous => ({ ...previous, [id]: decision }));
    setError(null);
  }

  async function improve() {
    if (!hasText || aiStatus !== 'available' || busy) return;
    setBusy('review');
    setError(null);
    try {
      const data = await requestReview({ action: 'review-with-claude', version: resume.version });
      setPages(previous => Object.fromEntries(Object.entries(previous).map(([number, page]) =>
        [number, { ...page, ids: [] }])));
      setEdits(data.edits.map((edit, index) => ({ ...edit, id: index + 1 })));
      setDecisions({});
      setActiveId(null);
    } catch (err) {
      setError({ action: 'review', message: err.message });
    } finally {
      setBusy('');
    }
  }

  async function rewrite(edit, answer) {
    if (!answer || busy) return;
    setBusy('rewrite');
    setError(null);
    try {
      const data = await requestReview({
        action: 'rewrite-with-claude', version: resume.version, original: edit.original, question: edit.question, answer
      });
      setEdits(previous => previous.map(item => item.id === edit.id
        ? { ...item, replacement: data.replacement, question: '' } : item));
    } catch (err) {
      setError({ action: 'rewrite', message: err.message });
    } finally {
      setBusy('');
    }
  }

  async function previewApproved() {
    if (!approved.length || busy) return;
    setBusy('preview');
    setError(null);
    try {
      const { writeResumePdf } = await import('../utils/writeResumePdf');
      const pdf = await writeResumePdf(exportSource.current, approved);
      setPreviewPageCount(0);
      setPreview({ pdf, url: URL.createObjectURL(pdf) });
    } catch (err) {
      setError({ action: 'preview', message: err.message || 'Unable to create the PDF preview.' });
    } finally {
      setBusy('');
    }
  }

  async function updateSavedResume(restore = false) {
    if (busy || (!restore && (!preview || !previewPageCount))) return;
    setBusy(restore ? 'restore' : 'save');
    setError(null);
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
      setError({ action: restore ? 'restore' : 'save', message: err.message || 'Unable to update your resume.' });
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="resume-improver" aria-labelledby="resume-improver-title">
      <header className="resume-improver-heading">
        <div>
          <p className="resume-eyebrow">YOUR NEXT CHAPTER</p>
          <h1 id="resume-improver-title">Résumé review <span className="resume-ai-badge"><ProfileIcon name="sparkle"/>AI</span></h1>
          <p>Small edits. A stronger first impression.</p>
        </div>
        {resume && <a className="resume-original" href="/api/profile/resume" target="_blank" rel="noreferrer" aria-label={`Open PDF: ${resume.fileName}`} title="Open PDF in a new tab"><ProfileIcon name="file"/><span>{resume.fileName}</span><ProfileIcon name="arrow"/></a>}
      </header>

      {!resume ? <p className="resume-improver-empty">Upload and save a PDF on your profile to start.</p> : (
        <div className="resume-improver-grid">
          <Suspense fallback={<p role="status">Loading the PDF viewer…</p>}>
            {preview ? <ResumePdf key="revision" source={preview.url} label="Updated resume PDF preview"
              onDocument={setPreviewPageCount} /> :
              <ResumePdf key="saved" edits={byPage} activeId={active?.id} decisions={decisions} onSelect={selectEdit}
                onDocument={setPageCount} onPage={onPage} exportSource={exportSource} />}
          </Suspense>

          <aside className="resume-review-panel" ref={panel} aria-label="Review suggestions">
            <div className="resume-panel-heading"><span className="resume-panel-icon"><ProfileIcon name={preview ? 'eye' : 'sparkle'}/></span><div><p className="resume-eyebrow">{preview ? 'FINAL LOOK' : 'AI ASSISTANT'}</p><h3>{preview ? 'Review updated PDF' : 'Make every word count'}</h3></div></div>
            {!preview && !edits && <p className="resume-panel-intro">Find clearer, stronger ways to tell your story. You choose which edits to keep.</p>}
            {preview ? (
              <>
                <p>Saving replaces the resume recruiters can view, including on past applications. You can restore your original.</p>
                <button className="resume-run" type="button" onClick={() => updateSavedResume()}
                  disabled={Boolean(busy) || !previewPageCount}><ProfileIcon name="check"/>{busy === 'save' ? 'Saving…' : 'Save updated resume'}</button>
                <ActionError error={error} action="save" />
                <button type="button" disabled={Boolean(busy)} onClick={() => { setPreview(null); setError(null); }}><ProfileIcon name="back"/>Back to edits</button>
              </>
            ) : <>
            {(!edits || (!placed.length && allPagesReady)) && <button type="button" className="resume-run" onClick={improve}
              disabled={!hasText || aiStatus !== 'available' || Boolean(busy)} title="Sends your saved PDF to Anthropic for AI review">
              <ProfileIcon name="sparkle"/>{busy === 'review' ? 'Reviewing…' : edits ? 'Check again with AI' : 'Check with AI'}
            </button>}
            {!edits && aiStatus === 'available' && <p className="resume-privacy-note">Your saved PDF is sent to Anthropic for this review.</p>}
            {aiStatus === 'loading' && <p role="status">Checking AI availability…</p>}
            {aiStatus === 'unconfigured' && <p>AI review is unavailable right now. Please try again later.</p>}
            {aiStatus === 'error' && <p role="alert">Could not check whether AI review is available. Refresh to try again.</p>}
            <ActionError error={error} action="review" />
            {!hasText && allPagesReady && <p>This PDF has no selectable text. Upload a text-based PDF to see inline edits.</p>}
            {busy === 'review' && <p role="status">Looking for the most useful edits…</p>}
            {busy === 'rewrite' && <p role="status">Rewriting bullet…</p>}
            {edits && !placed.length && allPagesReady && (
              <p>{edits.length ? 'No suggestions could be matched to the PDF.' : 'No specific improvements found.'}</p>
            )}
            {placed.length > 0 && (
              <>
                <div className="resume-review-progress"><p className="resume-review-count" role="status">{pending} to review · {approved.length} approved</p><progress aria-label="Suggestions reviewed" max={placed.length} value={placed.length - pending}/></div>
                <nav className="resume-edit-tabs" aria-label="Resume edits">
                  {placed.map(edit => (
                    <button key={edit.id} type="button" aria-label={`Edit ${edit.id}`} title={`Edit ${edit.id}: ${decisions[edit.id] || 'To review'}`} aria-pressed={active?.id === edit.id}
                      className={decisions[edit.id] || 'pending'} onClick={() => selectEdit(edit.id, true)}>
                      {edit.id}{decisions[edit.id] && <ProfileIcon name={decisions[edit.id] === 'approved' ? 'check' : 'close'}/>}
                    </button>
                  ))}
                </nav>
                {active && <EditCard key={active.id} edit={active} decision={decisions[active.id]}
                  busy={Boolean(busy)} onDecide={decide} onRewrite={rewrite} />}
                <ActionError error={error} action="rewrite" />
              </>
            )}
            {approved.length > 0 && (
              <div className="resume-approved resume-save-options">
                <ActionError error={error} action="preview" />
                <button type="button" className="resume-run" disabled={Boolean(busy)} onClick={previewApproved}>
                  <ProfileIcon name="eye"/>{busy === 'preview' ? 'Preparing PDF…' : 'Preview updated PDF'}
                </button>
                <details>
                  <summary>Approved changes ({approved.length})</summary>
                  <ul>{approved.map(edit => <li key={edit.id}>{edit.replacement}</li>)}</ul>
                </details>
              </div>
            )}
            {resume.hasOriginal && <button type="button" disabled={Boolean(busy)}
              onClick={() => {
                if (window.confirm('Restore your original resume? This replaces the current PDF.')) updateSavedResume(true);
              }}>{busy === 'restore' ? 'Restoring…' : 'Restore original'}</button>}
            <ActionError error={error} action="restore" />
            </>}
          </aside>
        </div>
      )}
    </section>
  );
}
