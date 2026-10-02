// Drives headless Chrome over CDP with a pinned clock. See README.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OUT = process.env.OUT ?? path.join(os.tmpdir(), 'rangers-road-walkthrough');
const PORT = process.env.PORT ?? 4311;
const CDP = process.env.CDP ?? 9333;
// Local time the app should believe it is. The clock keeps ticking from here.
const PIN = process.env.PIN ?? '2026-10-05T07:00:00';
fs.mkdirSync(OUT, { recursive: true });

export async function connect() {
  const targets = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, (d) => (d.error ? reject(new Error(`${method}: ${JSON.stringify(d.error)}`)) : resolve(d.result)));
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const phone = (height, scale) =>
    send('Emulation.setDeviceMetricsOverride', { width: 390, height, deviceScaleFactor: scale, mobile: true });

  await send('Page.enable');
  await send('Runtime.enable');
  const target = new Date(PIN).getTime();
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => { const R = Date; const off = ${target} - R.now();
      class D extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } }
      Date = D; })();`,
  });
  await phone(845, 2);

  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails));
    return r.result.value;
  };
  const waitFor = async (expression, ms = 10000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if (await ev(expression)) return true; } catch { /* page still loading */ } await sleep(200); }
    throw new Error(`timeout waiting for ${expression}`);
  };
  const go = async (url) => {
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${url}` });
    await sleep(1500);
    await waitFor('document.fonts.status === "loaded" && !!document.querySelector("main, app-root *")');
    await sleep(600);
  };
  const shot = async (name, full = false) => {
    if (full) await phone(Math.ceil((await send('Page.getLayoutMetrics')).cssContentSize.height), 1.5);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    if (full) await phone(845, 2);
    const file = path.join(OUT, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  };
  const text = () => ev('document.body.innerText');
  const clickText = (label, tag = 'button, a') =>
    ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(tag)})].find((x) => x.innerText && x.innerText.trim().includes(${JSON.stringify(label)})); if (!e) return false; e.click(); return true; })()`);
  /** Set a text input or textarea so Angular sees it. */
  const type = (selector, value) =>
    ev(`(() => { const i = document.querySelector(${JSON.stringify(selector)}); i.value = ${JSON.stringify(value)}; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  /** Pick a radio by its form name (for example "ng.form0.energy") and value. */
  const pick = (name, value) =>
    ev(`(() => { const r = [...document.querySelectorAll('input[type=radio]')].find((x) => x.name === ${JSON.stringify(name)} && x.value === ${JSON.stringify(String(value))}); r.click(); return r.checked; })()`);

  return { send, ev, go, waitFor, shot, text, clickText, type, pick, sleep, out: OUT, close: () => ws.close() };
}
