// Temporary ?debug=signal view — spec §8 Phase 2: "Ship a temporary
// ?debug=signal page plotting the ROC and score histogram and screenshot
// it. A human must look at that curve before Phase 4." Dynamically
// imported only when the query param is present, so it never touches the
// production bundle budget.

import { buildRoc, type RocTable } from '../signal/roc';

export function mountSignalDebug(): void {
  const table = buildRoc();

  document.body.innerHTML = '';
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;inset:0;background:#090a09;z-index:9999;overflow:auto;padding:2rem;color:#e9ede7;font-family:"JetBrains Mono",monospace;box-sizing:border-box;';
  document.body.appendChild(container);

  const title = document.createElement('h1');
  title.textContent = 'debug: signal ROC + peak-score histogram';
  title.style.cssText = 'font-size:1rem;font-weight:400;margin:0 0 1.5rem;';
  container.appendChild(title);

  const rocLabel = document.createElement('p');
  rocLabel.textContent = 'ROC — sensitivity vs FA/day. Box = clinically-useful region (FA/day ≤ 2, sensitivity ≥ 59%).';
  rocLabel.style.cssText = 'font-size:0.8rem;color:#7d857c;margin:0 0 0.5rem;';
  container.appendChild(rocLabel);

  const rocCanvas = document.createElement('canvas');
  rocCanvas.width = 800;
  rocCanvas.height = 420;
  rocCanvas.style.cssText = 'display:block;margin-bottom:2rem;border:1px solid #232a2d;';
  container.appendChild(rocCanvas);
  drawRoc(rocCanvas, table);

  const histLabel = document.createElement('p');
  histLabel.textContent = 'Peak z-score per event — teal = seizures (7), red = artefacts (400). The invariant: sortedArtefactPeaks[2] > max(truePeakScores).';
  histLabel.style.cssText = 'font-size:0.8rem;color:#7d857c;margin:0 0 0.5rem;';
  container.appendChild(histLabel);

  const histCanvas = document.createElement('canvas');
  histCanvas.width = 800;
  histCanvas.height = 320;
  histCanvas.style.cssText = 'display:block;border:1px solid #232a2d;';
  container.appendChild(histCanvas);
  drawHistogram(histCanvas, table);

  const strongestSeizure = Math.max(...table.truePeakScores);
  const info = document.createElement('pre');
  info.style.cssText = 'font-size:0.8rem;color:#aab3a8;margin-top:1.5rem;white-space:pre-wrap;';
  info.textContent = [
    `seizures: ${table.seizures.length}    artefacts: ${table.artefacts.length}`,
    `strongest seizure peak z:       ${strongestSeizure.toFixed(3)}`,
    `3rd-strongest artefact peak z:  ${table.sortedArtefactPeaks[2].toFixed(3)}  (invariant holds: ${table.sortedArtefactPeaks[2] > strongestSeizure})`,
    `best sensitivity reachable:     ${Math.max(...table.points.map((p) => p.sensitivity)).toFixed(3)}`,
    `min FA/day at sensitivity≥0.5:  ${Math.min(...table.points.filter((p) => p.sensitivity >= 0.5).map((p) => p.faPerDay))}`,
  ].join('\n');
  container.appendChild(info);
}

function drawRoc(canvas: HTMLCanvasElement, table: RocTable): void {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0e100e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pad = 44;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const maxFA = Math.max(...table.points.map((p) => p.faPerDay), 1);

  // clinical box: FA/day ≤ 2, sensitivity ≥ 0.59
  const boxX = pad;
  const boxW = Math.min(w, (2 / maxFA) * w);
  const boxY = pad + (1 - 0.59) * h;
  const boxH = (1 - 0.59) * h;
  ctx.strokeStyle = 'rgba(79,176,168,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = '#e9ede7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  table.points.forEach((p, i) => {
    const x = pad + Math.min(1, p.faPerDay / maxFA) * w;
    const y = pad + (1 - p.sensitivity) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#7d857c';
  ctx.font = '11px monospace';
  ctx.fillText(`FA/day → (0..${maxFA.toFixed(0)})`, pad, canvas.height - 12);
  ctx.save();
  ctx.translate(14, pad + h);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('sensitivity ↑ (0..1)', 0, 0);
  ctx.restore();
}

function drawHistogram(canvas: HTMLCanvasElement, table: RocTable): void {
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0e100e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const all = [...table.truePeakScores, ...table.sortedArtefactPeaks];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const bins = 40;
  const seizureBins = new Array(bins).fill(0);
  const artefactBins = new Array(bins).fill(0);
  const binFor = (v: number) => Math.min(bins - 1, Math.max(0, Math.floor(((v - min) / (max - min || 1)) * bins)));
  table.truePeakScores.forEach((v) => seizureBins[binFor(v)]++);
  table.sortedArtefactPeaks.forEach((v) => artefactBins[binFor(v)]++);
  const maxCount = Math.max(...seizureBins, ...artefactBins, 1);

  const pad = 44;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const bw = w / bins;

  for (let i = 0; i < bins; i++) {
    const ah = (artefactBins[i] / maxCount) * h;
    ctx.fillStyle = 'rgba(209,83,63,0.55)';
    ctx.fillRect(pad + i * bw, pad + h - ah, bw - 1, ah);
  }
  for (let i = 0; i < bins; i++) {
    const sh = (seizureBins[i] / maxCount) * h;
    ctx.fillStyle = '#5fae7a';
    ctx.fillRect(pad + i * bw, pad + h - sh, Math.max(2, bw - 1), sh);
  }

  ctx.fillStyle = '#7d857c';
  ctx.font = '11px monospace';
  ctx.fillText(`peak z-score → (${min.toFixed(1)}..${max.toFixed(1)})`, pad, canvas.height - 12);
}
