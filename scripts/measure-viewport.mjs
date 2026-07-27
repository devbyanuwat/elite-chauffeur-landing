// วัดหน้าเว็บที่ขนาดจอที่กำหนด ผ่าน Chrome DevTools Protocol
//
// ทำไมต้อง CDP: headless Chrome ปักความกว้างขั้นต่ำไว้ที่ 500px ถ้าสั่ง
// --window-size=390,844 เฉย ๆ จะได้หน้าเว็บที่ layout ที่ 500px แล้วถูกครอบ
// เหลือ 390 ตัวเลขที่ได้จึงเป็นของปลอม Emulation.setDeviceMetricsOverride
// เท่านั้นที่เปลี่ยน layout viewport จริง
//
// ใช้: node scripts/measure-viewport.mjs <width> <height> <mobile|desktop> <screenshot|none> '<js expression>'
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_BIN
  ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const URL_UNDER_TEST = process.env.MEASURE_URL ?? 'http://localhost:4321/';
const PORT = 9339;

const [width, height, mode, shot, expression] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--window-size=1400,1000',
  `--user-data-dir=${process.env.TMPDIR ?? '/tmp'}/measure-viewport`, 'about:blank',
], { stdio: 'ignore' });

await sleep(1500);
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => {
  const i = ++id;
  pending.set(i, resolve);
  ws.send(JSON.stringify({ id: i, method, params }));
});
await new Promise((r) => { ws.onopen = r; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: mode === 'mobile',
});
await send('Page.navigate', { url: URL_UNDER_TEST });
await sleep(4000);

if (shot && shot !== 'none') {
  const img = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(shot, Buffer.from(img.data, 'base64'));
}

if (expression) {
  // awaitPromise: true จำเป็นเมื่อ expression เป็น async ไม่งั้นจะได้ {} เปล่า
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result?.value ?? r.exceptionDetails, null, 2));
}

ws.close();
chrome.kill();
