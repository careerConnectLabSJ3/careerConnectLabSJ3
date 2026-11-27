import { PDFDocument, StandardFonts, TextRenderingMode, setTextRenderingMode } from 'pdf-lib';
import { findResumeAnchor } from './resumeAnchors';

const UNSUPPORTED_LAYOUT = 'This edit does not fit the PDF layout. Undo it and preview the remaining changes.';

function areaFor(run, start, end) {
  const area = run.rect?.(start, end);
  if (!area || area.width < 1 || area.height < 1) throw new Error(UNSUPPORTED_LAYOUT);
  return area;
}

function sameLine(first, second) {
  return Math.abs(first.y + first.height / 2 - second.y - second.height / 2)
    < Math.min(first.height, second.height) / 2;
}

function blankPixels(context, rect, originalAreas, scale) {
  const x = Math.max(0, Math.floor(rect.x * scale));
  const y = Math.max(0, Math.floor(rect.y * scale));
  const width = Math.min(context.canvas.width - x, Math.ceil(rect.width * scale));
  const height = Math.min(context.canvas.height - y, Math.ceil(rect.height * scale));
  const { data } = context.getImageData(x, y, width, height);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const index = (row * width + column) * 4;
      if (data[index] > 242 && data[index + 1] > 242 && data[index + 2] > 242) continue;
      const px = (x + column) / scale;
      const py = (y + row) / scale;
      if (!originalAreas.some(area => px >= area.x - 0.5 && px <= area.x + area.width + 0.5 &&
          py >= area.y && py <= area.y + area.height)) return false;
    }
  }
  return true;
}

function pickRows(areas) {
  const rows = [];
  for (const area of areas) {
    const row = rows.find(candidate => sameLine(candidate, area));
    if (row) {
      const right = Math.max(row.x + row.width, area.x + area.width);
      row.x = Math.min(row.x, area.x);
      row.width = right - row.x;
    } else rows.push({ ...area });
  }
  return rows.sort((a, b) => a.y - b.y);
}

function layoutReplacement(context, words, rows, family, size, scale) {
  for (const shrink of [1, 0.95, 0.9, 0.85]) {
    const fontSize = size * shrink;
    context.font = `${fontSize * scale}px ${family}`;
    const lines = [];
    let index = 0;
    for (const row of rows) {
      let text = '';
      while (index < words.length) {
        const combined = text ? `${text} ${words[index]}` : words[index];
        if (context.measureText(combined).width > row.available * scale) break;
        text = combined;
        index++;
      }
      if (!text) break;
      lines.push({ text, x: row.x, y: row.y, height: row.height, size: fontSize,
        width: context.measureText(text).width / scale });
      if (index === words.length) return lines;
    }
  }
  throw new Error(UNSUPPORTED_LAYOUT);
}

function createPatches(layout, edits, context, scale) {
  const excludedByRun = new Map();
  const patches = edits.map(edit => {
    const spans = findResumeAnchor(layout.runs.map(run => run.text), edit.original);
    if (!spans.length) throw new Error(UNSUPPORTED_LAYOUT);
    const areas = spans.map((span, index) => {
      const excluded = excludedByRun.get(span.index) || [];
      if (excluded.some(item => span.start < item.end && span.end > item.start)) {
        throw new Error('Two approved edits overlap. Undo one and preview again.');
      }
      excluded.push({ ...span, insert: index === 0 ? edit.id : null });
      excludedByRun.set(span.index, excluded);
      return areaFor(layout.runs[span.index], span.start, span.end);
    });
    return { edit, areas, font: layout.runs[spans[0].index] };
  });

  const remainingText = [];
  layout.runs.forEach((run, index) => {
    let start = 0;
    const exclusions = (excludedByRun.get(index) || []).sort((a, b) => a.start - b.start);
    for (const span of [...exclusions, { start: run.text.length }]) {
      const text = run.text.slice(start, span.start).trim();
      if (text) {
        const first = run.text.indexOf(text, start);
        remainingText.push({ text, ...areaFor(run, first, first + text.length), size: run.size });
      }
      if (span.insert) remainingText.push({ insert: span.insert });
      start = span.end;
    }
  });

  for (const patch of patches) {
    const rows = pickRows(patch.areas).map(row => {
      const peers = [...remainingText, ...patches.filter(other => other !== patch).flatMap(other => other.areas)];
      const right = peers.filter(area => area.x >= row.x + row.width - 0.5 && sameLine(area, row))
        .reduce((edge, area) => Math.min(edge, area.x - 2), layout.width - 12);
      return { ...row, available: Math.max(row.width, right - row.x) };
    });
    patch.lines = layoutReplacement(context, patch.edit.replacement.trim().split(/\s+/), rows, patch.font.family, patch.font.size, scale);
    for (const line of patch.lines) {
      if (!blankPixels(context, line, patch.areas, scale)) throw new Error(UNSUPPORTED_LAYOUT);
    }
    for (const area of patch.areas) {
      const above = { ...area, y: Math.max(0, area.y - 1.5), height: 1 };
      if (!blankPixels(context, above, [], scale)) throw new Error(UNSUPPORTED_LAYOUT);
    }
  }
  return { patches, remainingText };
}

async function rewritePage(result, sourcePage, layout, edits, font) {
  const original = sourcePage.getViewport({ scale: 1 });
  const rendered = sourcePage.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(rendered.width);
  canvas.height = Math.ceil(rendered.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  await sourcePage.render({ canvasContext: context, viewport: rendered }).promise;
  const displayScale = canvas.width / layout.width;
  const { patches, remainingText } = createPatches(layout, edits, context, displayScale);

  for (const patch of patches) {
    context.fillStyle = '#ffffff';
    for (const area of patch.areas) {
      context.fillRect(area.x * displayScale, area.y * displayScale,
        area.width * displayScale, area.height * displayScale);
    }
    context.fillStyle = '#161616';
    for (const line of patch.lines) {
      context.font = `${line.size * displayScale}px ${patch.font.family}`;
      context.fillText(line.text, line.x * displayScale, (line.y + line.height * 0.8) * displayScale);
    }
  }

  const image = await result.embedPng(canvas.toDataURL('image/png'));
  canvas.width = 0;
  canvas.height = 0;
  const page = result.addPage([original.width, original.height]);
  page.drawImage(image, { x: 0, y: 0, width: original.width, height: original.height });
  // Keep the revised page selectable. The old words are omitted from its text layer.
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));
  const points = original.width / layout.width;
  for (const item of remainingText) {
    const fragments = item.insert ? patches.find(patch => patch.edit.id === item.insert).lines : [item];
    for (const fragment of fragments) {
      try {
        page.drawText(fragment.text, {
          x: fragment.x * points, y: original.height - (fragment.y + fragment.height * 0.8) * points,
          size: Math.max(1, fragment.size * points), font
        });
      } catch {
        throw new Error('This PDF uses characters the revised export cannot preserve.');
      }
    }
  }
}

export async function writeResumePdf(source, approvedEdits) {
  if (!source.pdf || !approvedEdits.length) throw new Error('Approve an edit before previewing.');
  const layouts = new Map();
  for (const { page } of approvedEdits) {
    if (!layouts.has(page)) {
      const layout = source.layouts.get(page)?.();
      if (!layout?.width) throw new Error('Wait for the PDF to finish loading, then try again.');
      layouts.set(page, layout);
    }
  }
  const original = await PDFDocument.load(await source.pdf.getData());
  const result = await PDFDocument.create();
  const font = await result.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < original.getPageCount(); index++) {
    const number = index + 1;
    const edits = approvedEdits.filter(edit => edit.page === number);
    if (edits.length) {
      await rewritePage(result, await source.pdf.getPage(number), layouts.get(number), edits, font);
    } else {
      const [page] = await result.copyPages(original, [index]);
      result.addPage(page);
    }
  }
  const bytes = await result.save();
  if (bytes.length > 5 * 1024 * 1024) throw new Error('The revised PDF exceeds the 5 MB upload limit.');
  return new Blob([bytes], { type: 'application/pdf' });
}
