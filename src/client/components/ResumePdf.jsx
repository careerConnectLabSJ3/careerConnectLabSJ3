import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';
import { findResumeAnchor } from '../utils/resumeAnchors';

GlobalWorkerOptions.workerSrc = workerUrl;
const NO_EDITS = [];
const NO_CHANGES = {};
const ignore = () => {};

function PdfPage({ pdf, number, width, edits, activeId, decisions, onSelect, onPage, exportSource }) {
  const canvas = useRef(null);
  const pageBox = useRef(null);
  const textBox = useRef(null);
  const [layer, setLayer] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!layer || !exportSource) return;
    const capture = () => captureLayout(layer, pageBox.current);
    exportSource.current.layouts.set(number, capture);
    return () => exportSource.current.layouts.delete(number);
  }, [layer, number, exportSource]);

  useEffect(() => {
    let cancelled = false;
    let rendering;
    let textLayer;
    const textContainer = textBox.current;
    setLayer(null);
    setError(false);
    textContainer.replaceChildren();

    async function render() {
      const page = await pdf.getPage(number);
      if (cancelled) return;
      const scale = width / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const node = canvas.current;
      node.width = Math.ceil(viewport.width * pixelRatio);
      node.height = Math.ceil(viewport.height * pixelRatio);
      node.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      textContainer.style.setProperty('--total-scale-factor', viewport.scale * viewport.userUnit);
      rendering = page.render({
        canvasContext: node.getContext('2d'), viewport,
        transform: [pixelRatio, 0, 0, pixelRatio, 0, 0]
      });
      textLayer = new TextLayer({ textContentSource: page.streamTextContent(), container: textContainer, viewport });
      await Promise.all([rendering.promise, textLayer.render()]);
      if (!cancelled) setLayer(textLayer);
    }

    render().catch(error => {
      if (!cancelled) {
        console.debug('Resume preview page could not render', error.message);
        setError(true);
        onPage(number, false, []);
      }
    });
    return () => {
      cancelled = true;
      rendering?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, number, width, onPage]);

  useEffect(() => {
    if (!layer) {
      setMarkers([]);
      return;
    }
    const box = pageBox.current.getBoundingClientRect();
    const matches = edits.flatMap(edit => {
      const spans = findResumeAnchor(layer.textContentItemsStr, edit.original);
      const rectangles = spans.flatMap(({ index, start, end }) => {
        const node = layer.textDivs[index]?.firstChild;
        if (node?.nodeType !== Node.TEXT_NODE || end > node.length) return [];
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        return Array.from(range.getClientRects()).filter(rect => rect.width && rect.height).map(rect => ({
          left: rect.left - box.left, top: rect.top - box.top, width: rect.width, height: rect.height
        }));
      });
      return rectangles.length ? [{ edit, rectangles }] : [];
    });
    setMarkers(matches);
    onPage(number, layer.textContentItemsStr.some(text => text.trim()), matches.map(match => match.edit.id));
  }, [layer, edits, number, onPage]);

  const annotation = markers.find(({ edit }) => edit.id === activeId && decisions[edit.id] === 'approved');
  const lastMark = annotation?.rectangles.at(-1);

  return (
    <div className="resume-pdf-page" ref={pageBox} style={{ width }} aria-label={`Page ${number}`}>
      {error && <p className="resume-pdf-page-error" role="alert">Unable to display page {number}.</p>}
      <canvas ref={canvas} aria-hidden="true" />
      <div className="textLayer" ref={textBox} />
      {markers.map(({ edit, rectangles }) => decisions[edit.id] !== 'skipped' && rectangles.map((rect, index) => (
        <button key={`${edit.id}-${index}`} type="button"
          id={index === 0 ? `resume-mark-${edit.id}` : undefined}
          className={`resume-marker ${decisions[edit.id] || 'pending'} ${activeId === edit.id ? 'selected' : ''}`}
          style={rect} tabIndex={index ? -1 : 0} aria-hidden={index ? true : undefined}
          aria-label={`Review edit ${edit.id}`} onClick={() => onSelect(edit.id, false)} />
      )))}
      {annotation && <p className="resume-inline-rewrite" style={{ top: lastMark.top + lastMark.height + 4 }}>
        {annotation.edit.replacement}
      </p>}
    </div>
  );
}

function captureLayout(layer, page) {
  const box = page.getBoundingClientRect();
  const runs = layer.textContentItemsStr.map((text, index) => {
    const span = layer.textDivs[index];
    const node = span?.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) return { text };
    const css = window.getComputedStyle(span);
    return {
      text, family: css.fontFamily, size: parseFloat(css.fontSize),
      rect(start, end) {
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        const { left, top, width, height } = range.getBoundingClientRect();
        return { x: left - box.left, y: top - box.top, width, height };
      }
    };
  });
  return { width: box.width, runs };
}

export default function ResumePdf({ source = '/api/profile/resume', label = 'Saved resume PDF',
  edits = NO_CHANGES, activeId, decisions = NO_CHANGES, onSelect = ignore, onDocument = ignore,
  onPage = ignore, exportSource }) {
  const container = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const task = getDocument({ url: source, isEvalSupported: false });
    let cancelled = false;
    task.promise.then(document => {
      if (cancelled) return;
      setPdf(document);
      if (exportSource) exportSource.current.pdf = document;
      onDocument(document.numPages);
    }).catch(error => {
      if (!cancelled) {
        console.debug('Resume preview could not load', error.message);
        setError(true);
      }
    });
    return () => {
      cancelled = true;
      if (exportSource) exportSource.current.pdf = null;
      task.destroy().catch(() => {});
    };
  }, [onDocument, exportSource, source]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(0, Math.min(760, Math.floor(entry.contentRect.width))));
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="resume-pdf" ref={container} role="region" aria-label={label}>
      {!pdf && !error && <p role="status">Loading your PDF…</p>}
      {error && <p role="alert">Unable to preview this PDF. <a href={source}>Open PDF</a></p>}
      {pdf && width > 0 && Array.from({ length: pdf.numPages }, (_, index) => (
        <PdfPage key={index + 1} pdf={pdf} number={index + 1} width={width}
          edits={edits[index + 1] || NO_EDITS} activeId={activeId} decisions={decisions}
          onSelect={onSelect} onPage={onPage} exportSource={exportSource} />
      ))}
    </div>
  );
}
