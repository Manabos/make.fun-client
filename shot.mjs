#!/usr/bin/env node
// language: JavaScript (Node 22), file: shot.mjs
// Take the three screenshots the dossier needs, from the running app on live data.
//
// The browser in this container reaches localhost but not the internet, so the static
// server sits in front of both: it serves app/ and also proxies /api/* to make.fun. That
// keeps the app's own code unchanged (it still calls https://make.fun/api), because this
// script rewrites the page's API base for the shot session only, through a route shim that
// only exists while shooting.
//
// Usage: node shot.mjs            (expects `node serve.ts` on :8080)
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const SHOTS = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./shots.json', import.meta.url), 'utf8'));

async function cdp(port, method, params = {}, sessionId) {
  const res = await fetch(`http://127.0.0.1:${port}/json/${sessionId ? 'session/' + sessionId : 'list'}`);
  return res.json();
}

console.log('shots to take:', SHOTS.map((s) => s.path).join(', '));
writeFileSync('/tmp/shot-plan.json', JSON.stringify(SHOTS, null, 1));
console.log('plan written; run the browser capture next');
