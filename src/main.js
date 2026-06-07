import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ffmpegCoreURL from '@ffmpeg/core?url';
import ffmpegCoreWasmURL from '@ffmpeg/core/wasm?url';
import html2canvas from 'html2canvas';
import './styles.css';

const app = document.querySelector('#app');

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="https://artenisalija.com/" aria-label="Artenis Alija home">ARTENIS ALIJA</a>
    <nav class="nav-links" aria-label="Converter navigation">
      <a href="https://artenisalija.com/services/">Services</a>
      <a href="https://artenisalija.com/blog/">Blog</a>
      <a href="https://github.com/artenisalija/html-to-mp4-converter">GitHub</a>
    </nav>
  </header>

  <main class="workspace">
    <section class="tool-intro" aria-labelledby="app-title">
      <div>
        <span class="eyebrow">Free browser tool</span>
        <h1 id="app-title">Free HTML to MP4 Converter</h1>
        <p>Turn AI-generated HTML into MP4 video locally in your browser. No server upload. 4x upscale available.</p>
      </div>
      <span class="tool-status" id="toolStatus">Ready</span>
    </section>

    <div class="app-grid">
      <section class="panel controls" aria-label="Converter controls">
        <div class="section">
          <div class="section-head">
            <h2>Source</h2>
            <div class="segmented" aria-label="Source type">
              <button type="button" class="active" data-source="paste">Paste</button>
              <button type="button" data-source="upload">Upload</button>
            </div>
          </div>

          <div class="source-pane" data-pane="paste">
            <label for="htmlInput">HTML</label>
            <textarea id="htmlInput" spellcheck="false"></textarea>
          </div>

          <div class="source-pane" data-pane="upload" hidden>
            <label for="htmlFile">HTML file</label>
            <input id="htmlFile" type="file" accept=".html,.htm,text/html">
            <label for="assetFiles">Assets</label>
            <input id="assetFiles" type="file" multiple>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2>Canvas</h2>
            <div class="preset-row">
              <button type="button" data-size="1280x720">16:9</button>
              <button type="button" data-size="1080x1080">1:1</button>
              <button type="button" data-size="720x1280">9:16</button>
            </div>
          </div>

          <div class="grid">
            <label>Width<input id="width" type="number" min="120" max="1920" value="720"></label>
            <label>Height<input id="height" type="number" min="120" max="1920" value="1280"></label>
            <label>Duration<input id="duration" type="number" min="0.5" max="60" step="0.5" value="4"></label>
            <label>FPS<input id="fps" type="number" min="1" max="30" value="12"></label>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <h2>Output</h2>
            <output id="outputSize">2880 x 5120</output>
          </div>

          <div class="grid">
            <label>Upscale
              <select id="scale">
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4" selected>4x</option>
              </select>
            </label>
            <label>Quality
              <select id="quality">
                <option value="18">High</option>
                <option value="23" selected>Balanced</option>
                <option value="28">Small</option>
              </select>
            </label>
            <label>Capture
              <select id="captureMode">
                <option value="realtime" selected>Realtime animation</option>
                <option value="sharp">Sharp stills</option>
              </select>
            </label>
            <label>Background<input id="background" type="color" value="#0d1110"></label>
            <label>Frame wait<input id="frameWait" type="number" min="0" max="1000" step="25" value="0"></label>
          </div>
        </div>

        <div class="action-row">
          <button class="primary" id="convertButton" type="button">Convert MP4</button>
          <button class="secondary" id="refreshButton" type="button">Refresh Preview</button>
        </div>
      </section>

      <section class="panel preview-panel" aria-label="Preview and output">
        <div class="preview-head">
          <h2>Preview</h2>
          <span id="previewMeta">720 x 1280</span>
        </div>
        <div class="preview-frame" id="previewFrame">
          <iframe id="preview" title="HTML preview"></iframe>
        </div>
        <div class="progress-track">
          <div id="progressBar"></div>
        </div>
        <div class="job-row">
          <span id="jobStatus">Idle</span>
          <a id="downloadLink" hidden>Download MP4</a>
        </div>
        <video id="videoPreview" controls hidden></video>
      </section>
    </div>
  </main>
`;

const defaultHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      display: grid;
      place-items: center;
      min-height: 100vh;
      margin: 0;
      overflow: hidden;
      background:
        linear-gradient(90deg, rgba(15,118,110,.14) 1px, transparent 1px),
        linear-gradient(0deg, rgba(29,78,216,.12) 1px, transparent 1px),
        #0d1110;
      background-size: 64px 64px;
      color: #f4f7f1;
      font-family: Inter, system-ui, sans-serif;
    }
    main { width: 100%; padding: 8vw; }
    .label { color: #5ef38c; font-size: 32px; font-weight: 900; text-transform: uppercase; }
    h1 { max-width: 900px; margin: 16px 0 0; font-size: 118px; line-height: .92; letter-spacing: 0; }
    .bar { position: fixed; left: 8vw; bottom: 8vw; width: 48vw; height: 18px; overflow: hidden; border-radius: 8px; background: #1e2520; }
    .bar::after { content: ""; display: block; width: 42%; height: 100%; background: #5ef38c; animation: move 2.8s ease-in-out infinite alternate; }
    .dot { position: fixed; right: 12vw; top: 18vh; width: 120px; aspect-ratio: 1; border-radius: 50%; background: #5ef38c; animation: float 3s ease-in-out infinite alternate; }
    @keyframes move { to { transform: translateX(138%); } }
    @keyframes float { to { transform: translateY(34vh); } }
  </style>
</head>
<body>
  <main>
    <div class="label">Demo render</div>
    <h1>HTML becomes MP4</h1>
    <div class="dot"></div>
    <div class="bar"></div>
  </main>
</body>
</html>`;

const state = {
  source: 'paste',
  ffmpeg: null,
  busy: false,
  objectUrls: [],
  downloadUrl: null,
  durationTouched: false,
};

const elements = {
  toolStatus: document.querySelector('#toolStatus'),
  sourceButtons: [...document.querySelectorAll('[data-source]')],
  sourcePanes: [...document.querySelectorAll('[data-pane]')],
  htmlInput: document.querySelector('#htmlInput'),
  htmlFile: document.querySelector('#htmlFile'),
  assetFiles: document.querySelector('#assetFiles'),
  width: document.querySelector('#width'),
  height: document.querySelector('#height'),
  duration: document.querySelector('#duration'),
  fps: document.querySelector('#fps'),
  scale: document.querySelector('#scale'),
  quality: document.querySelector('#quality'),
  captureMode: document.querySelector('#captureMode'),
  background: document.querySelector('#background'),
  frameWait: document.querySelector('#frameWait'),
  outputSize: document.querySelector('#outputSize'),
  previewMeta: document.querySelector('#previewMeta'),
  previewFrame: document.querySelector('#previewFrame'),
  preview: document.querySelector('#preview'),
  progressBar: document.querySelector('#progressBar'),
  jobStatus: document.querySelector('#jobStatus'),
  downloadLink: document.querySelector('#downloadLink'),
  videoPreview: document.querySelector('#videoPreview'),
  convertButton: document.querySelector('#convertButton'),
  refreshButton: document.querySelector('#refreshButton'),
};

elements.htmlInput.value = defaultHtml;

elements.sourceButtons.forEach((button) => {
  button.addEventListener('click', () => setSource(button.dataset.source));
});

document.querySelectorAll('[data-size]').forEach((button) => {
  button.addEventListener('click', () => {
    const [width, height] = button.dataset.size.split('x');
    elements.width.value = width;
    elements.height.value = height;
    updateDimensions();
    refreshPreview();
  });
});

[
  elements.width,
  elements.height,
  elements.scale,
  elements.duration,
  elements.fps,
  elements.background,
].forEach((input) => {
  input.addEventListener('input', updateDimensions);
});

elements.htmlInput.addEventListener('input', debounce(refreshPreview, 350));
elements.htmlFile.addEventListener('change', refreshPreview);
elements.assetFiles.addEventListener('change', refreshPreview);
elements.duration.addEventListener('input', () => {
  state.durationTouched = true;
});
elements.refreshButton.addEventListener('click', () => refreshPreview());
elements.convertButton.addEventListener('click', convert);
window.addEventListener('resize', debounce(updateDimensions, 100));

updateDimensions();
refreshPreview();

function setSource(source) {
  state.source = source;
  elements.sourceButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.source === source);
  });
  elements.sourcePanes.forEach((pane) => {
    pane.hidden = pane.dataset.pane !== source;
  });
  refreshPreview();
}

function updateDimensions() {
  const settings = getSettings();
  const outWidth = settings.width * settings.scale;
  const outHeight = settings.height * settings.scale;
  const previewBounds = elements.previewFrame.getBoundingClientRect();
  const previewWidth = Math.max(280, previewBounds.width - 36 || window.innerWidth - 72);
  const previewHeight = Math.min(640, Math.max(360, window.innerHeight - 260));
  const previewScale = Math.min(1, previewWidth / settings.width, previewHeight / settings.height);

  elements.outputSize.value = `${outWidth} x ${outHeight}`;
  elements.previewMeta.textContent = `${settings.width} x ${settings.height}`;
  elements.preview.style.width = `${settings.width}px`;
  elements.preview.style.height = `${settings.height}px`;
  elements.preview.style.setProperty('--preview-scale', previewScale.toFixed(4));
  elements.previewFrame.style.minHeight = `${Math.max(360, Math.round((settings.height * previewScale) + 48))}px`;
}

async function refreshPreview(options = {}) {
  const { force = false, throwOnError = false } = options instanceof Event ? {} : options;
  if (state.busy && !force) return false;
  setStatus('Loading preview', 0);

  try {
    const sourceHtml = await getSourceHtml();
    applyInferredDuration(sourceHtml);
    elements.preview.srcdoc = prepareSourceHtml(sourceHtml, getSettings());
    await waitForIframe();
    setStatus('Preview ready', 0);
    return true;
  } catch (error) {
    setStatus(error.message, 0, true);
    if (throwOnError) throw error;
    return false;
  }
}

async function convert() {
  if (state.busy) return;
  state.busy = true;
  elements.convertButton.disabled = true;
  elements.downloadLink.hidden = true;
  elements.videoPreview.hidden = true;
  revokeDownloadUrl();

  try {
    const settings = getSettings();
    validateSettings(settings);
    await refreshPreview({ force: true, throwOnError: true });
    const doc = elements.preview.contentDocument;
    if (!doc?.documentElement) throw new Error('Preview is not available.');

    const webmBlob = await captureWebm(doc, settings);
    const mp4Blob = await transcodeToMp4(webmBlob, settings);
    const url = URL.createObjectURL(mp4Blob);
    state.downloadUrl = url;

    elements.downloadLink.href = url;
    elements.downloadLink.download = `html-to-mp4-${Date.now()}.mp4`;
    elements.downloadLink.hidden = false;
    elements.videoPreview.src = url;
    elements.videoPreview.hidden = false;
    setStatus(`Done - ${formatBytes(mp4Blob.size)}`, 100);
  } catch (error) {
    console.error(error);
    setStatus(error.message || String(error), 0, true);
  } finally {
    state.busy = false;
    elements.convertButton.disabled = false;
  }
}

async function captureWebm(doc, settings) {
  const output = document.createElement('canvas');
  output.width = settings.width * settings.scale;
  output.height = settings.height * settings.scale;
  const context = output.getContext('2d', { alpha: false });
  const stream = output.captureStream(settings.fps);
  const mimeType = getRecorderMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });

  const stopped = new Promise((resolve) => {
    recorder.addEventListener('stop', resolve, { once: true });
  });

  recorder.start(1000);

  const totalFrames = Math.max(1, Math.ceil(settings.duration * settings.fps));
  const startedAt = performance.now();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    const target = startedAt + (frame * 1000 / settings.fps);
    const wait = target - performance.now();
    if (wait > 0) await sleep(wait);
    if (settings.frameWait > 0) await sleep(settings.frameWait);

    const targetElement = getCaptureTarget(doc);
    const targetRect = targetElement.getBoundingClientRect();
    const captureWidth = Math.max(1, Math.round(targetRect.width || settings.width));
    const captureHeight = Math.max(1, Math.round(targetRect.height || settings.height));
    const captureScale = settings.captureMode === 'sharp' ? settings.scale : 1;

    const snapshot = await html2canvas(targetElement, {
      width: captureWidth,
      height: captureHeight,
      windowWidth: settings.width,
      windowHeight: settings.height,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      scale: captureScale,
      backgroundColor: settings.background,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 8000,
    });

    context.fillStyle = settings.background;
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(snapshot, 0, 0, output.width, output.height);
    stream.getVideoTracks()[0]?.requestFrame?.();
    snapshot.width = 0;
    snapshot.height = 0;

    setStatus(`Capturing frame ${frame + 1}/${totalFrames}`, Math.round(((frame + 1) / totalFrames) * 62));
  }

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  return new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
}

async function transcodeToMp4(webmBlob, settings) {
  const ffmpeg = await getFfmpeg();
  const inputName = 'input.webm';
  const outputName = 'output.mp4';
  setStatus('Writing video to encoder', 66);
  await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));

  ffmpeg.on('progress', ({ progress }) => {
    if (Number.isFinite(progress)) {
      setStatus('Encoding MP4', 66 + Math.round(Math.min(progress, 1) * 31));
    }
  });

  await ffmpeg.exec([
    '-y',
    '-i', inputName,
    '-t', String(settings.duration),
    '-vf', `fps=${settings.fps},format=yuv420p`,
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', String(settings.quality),
    '-movflags', 'faststart',
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});
  return new Blob([data], { type: 'video/mp4' });
}

async function getFfmpeg() {
  if (state.ffmpeg?.loaded) return state.ffmpeg.instance;

  setStatus('Loading FFmpeg', 64);
  elements.toolStatus.textContent = 'Loading encoder';

  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(ffmpegCoreURL, 'text/javascript'),
    wasmURL: await toBlobURL(ffmpegCoreWasmURL, 'application/wasm'),
  });

  state.ffmpeg = { instance: ffmpeg, loaded: true };
  elements.toolStatus.textContent = 'Encoder ready';
  return ffmpeg;
}

async function getSourceHtml() {
  if (state.source === 'paste') {
    const html = elements.htmlInput.value.trim();
    if (!html) throw new Error('Paste HTML first.');
    return html;
  }

  const file = elements.htmlFile.files?.[0];
  if (!file) throw new Error('Choose an HTML file.');

  const html = await file.text();
  const assets = [...(elements.assetFiles.files || [])];
  return rewriteHtmlAssets(html, assets);
}

async function rewriteHtmlAssets(html, files) {
  cleanupAssetUrls();
  if (files.length === 0) return html;

  const assetMap = new Map();
  for (const file of files) {
    const url = URL.createObjectURL(file);
    state.objectUrls.push(url);
    assetMap.set(file.name.toLowerCase(), { file, url });
    if (file.webkitRelativePath) {
      assetMap.set(file.webkitRelativePath.toLowerCase(), { file, url });
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  for (const element of doc.querySelectorAll('[src]')) {
    replaceAssetAttribute(element, 'src', assetMap);
  }

  for (const element of doc.querySelectorAll('[href]')) {
    const rel = String(element.getAttribute('rel') || '').toLowerCase();
    if (element.tagName === 'LINK' && rel.includes('stylesheet')) {
      await replaceStylesheet(element, assetMap);
    } else {
      replaceAssetAttribute(element, 'href', assetMap);
    }
  }

  for (const element of doc.querySelectorAll('style')) {
    element.textContent = replaceCssUrls(element.textContent || '', assetMap);
  }

  for (const element of doc.querySelectorAll('[style]')) {
    element.setAttribute('style', replaceCssUrls(element.getAttribute('style') || '', assetMap));
  }

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

function replaceAssetAttribute(element, attribute, assetMap) {
  const value = element.getAttribute(attribute);
  const asset = findAsset(value, assetMap);
  if (asset) element.setAttribute(attribute, asset.url);
}

async function replaceStylesheet(element, assetMap) {
  const value = element.getAttribute('href');
  const asset = findAsset(value, assetMap);
  if (!asset) return;

  const css = replaceCssUrls(await asset.file.text(), assetMap);
  const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
  state.objectUrls.push(url);
  element.setAttribute('href', url);
}

function replaceCssUrls(css, assetMap) {
  return css.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, rawUrl) => {
    const asset = findAsset(rawUrl, assetMap);
    return asset ? `url(${quote}${asset.url}${quote})` : match;
  });
}

function findAsset(value, assetMap) {
  if (!value || isExternalUrl(value) || value.startsWith('#') || value.startsWith('data:')) return null;
  const clean = decodeURIComponent(value.split(/[?#]/)[0]).replace(/^\.?\//, '').toLowerCase();
  const fileName = clean.split('/').pop();
  return assetMap.get(clean) || assetMap.get(fileName);
}

function isExternalUrl(value) {
  return /^(https?:)?\/\//i.test(value) || /^(blob|mailto|tel):/i.test(value);
}

async function waitForIframe() {
  const iframe = elements.preview;
  await new Promise((resolve) => {
    iframe.addEventListener('load', resolve, { once: true });
    setTimeout(resolve, 800);
  });

  const doc = iframe.contentDocument;
  if (!doc) return;
  await doc.fonts?.ready?.catch(() => {});
  const images = [...doc.images];
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return img.decode?.().catch(() => {}) || new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}

function getSettings() {
  return {
    width: numberValue(elements.width, 720),
    height: numberValue(elements.height, 1280),
    duration: numberValue(elements.duration, 4),
    fps: numberValue(elements.fps, 12),
    scale: numberValue(elements.scale, 4),
    quality: numberValue(elements.quality, 23),
    captureMode: elements.captureMode.value || 'realtime',
    background: elements.background.value || '#ffffff',
    frameWait: numberValue(elements.frameWait, 0),
  };
}

function validateSettings(settings) {
  const outputPixels = settings.width * settings.height * settings.scale * settings.scale;
  if (settings.width < 120 || settings.height < 120) throw new Error('Canvas is too small.');
  if (settings.width > 1920 || settings.height > 1920) throw new Error('Canvas is too large.');
  if (settings.duration < 0.5 || settings.duration > 60) throw new Error('Duration must be 0.5 to 60 seconds.');
  if (settings.fps < 1 || settings.fps > 30) throw new Error('FPS must be 1 to 30.');
  if (![1, 2, 4].includes(settings.scale)) throw new Error('Upscale must be 1x, 2x, or 4x.');
  if (!['realtime', 'sharp'].includes(settings.captureMode)) throw new Error('Choose a valid capture mode.');
  if (outputPixels > 34_000_000) throw new Error('Output is too large for reliable browser encoding.');
}

function prepareSourceHtml(html, settings) {
  const normalizer = `
<style data-html-to-mp4-normalizer>
  html, body {
    width: ${settings.width}px !important;
    height: ${settings.height}px !important;
    min-width: ${settings.width}px !important;
    min-height: ${settings.height}px !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  #reel, [data-reel], [data-html-to-mp4-target] {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
  }
</style>`;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${normalizer}\n</head>`);
  }

  return `${normalizer}\n${html}`;
}

function getCaptureTarget(doc) {
  return doc.querySelector('[data-html-to-mp4-target], #reel, [data-reel], .reel')
    || doc.body
    || doc.documentElement;
}

function applyInferredDuration(html) {
  if (state.durationTouched) return;
  const duration = inferDurationSeconds(html);
  if (!duration) return;

  elements.duration.value = String(duration);
  updateDimensions();
}

function inferDurationSeconds(html) {
  const patterns = [
    /\bTOTAL_DURATION\s*=\s*(\d+(?:\.\d+)?)\b/i,
    /\bduration\s*[:=]\s*(\d+(?:\.\d+)?)\s*ms\b/i,
    /\bduration\s*[:=]\s*(\d+(?:\.\d+)?)\s*s\b/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;

    const raw = Number(match[1]);
    if (!Number.isFinite(raw) || raw <= 0) continue;

    const seconds = pattern.source.includes('\\s*ms') || raw > 300 ? raw / 1000 : raw;
    return Math.min(60, Math.max(0.5, Number(seconds.toFixed(2))));
  }

  return null;
}

function getRecorderMimeType() {
  const options = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function setStatus(text, progress = null, isError = false) {
  elements.jobStatus.textContent = text;
  elements.jobStatus.classList.toggle('error', isError);
  if (progress !== null) {
    elements.progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  }
}

function cleanupAssetUrls() {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls = [];
}

function revokeDownloadUrl() {
  if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
  state.downloadUrl = null;
}

function numberValue(input, fallback) {
  const number = Number(input.value);
  return Number.isFinite(number) ? number : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
