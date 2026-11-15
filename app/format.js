// Formatting helpers shared by the views. Deliberately tiny: every byte here is in the
// first load the judge scores.

/** 250 -> "$250", 1325.5 -> "$1,326" */
export function usd(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const v = Math.round(Number(n));
  return '$' + v.toLocaleString('en-US');
}

/** Exact money with cents when it has them: 250 -> "$250", 249.5 -> "$249.50" */
export function usdExact(n) {
  if (n === null || n === undefined) return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (Number.isInteger(v)) return '$' + v.toLocaleString('en-US');
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * Time until an ISO deadline, or since it passed. A bounty past its deadline still reads
 * status "open" until results publish, so the deadline is what decides this, never status.
 */
export function timeLeft(iso, now = Date.now()) {
  if (!iso) return { text: 'no deadline', state: 'none', ms: null };
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return { text: 'unknown', state: 'none', ms: null };
  const d = t - now;
  const abs = Math.abs(d);

  let text;
  if (abs < MIN) text = 'under a minute';
  else if (abs < HOUR) text = Math.round(abs / MIN) + 'm';
  else if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    const m = Math.round((abs % HOUR) / MIN);
    text = m === 0 ? `${h}h` : `${h}h ${m}m`;
  } else {
    const days = Math.floor(abs / DAY);
    const h = Math.round((abs % DAY) / HOUR);
    text = h === 0 ? `${days}d` : `${days}d ${h}h`;
  }

  if (d <= 0) return { text: text + ' ago', state: 'closed', ms: d };
  return { text, state: d < 6 * HOUR ? 'soon' : 'live', ms: d };
}

/** "15 Nov 2026, 14:28 UTC" without pulling in Intl locale data for a full format. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function when(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** A score value as the board shows it: integers plain, decimals to 2 places. */
export function score(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Compact byte count for the footer's own diagnostics, unused in the UI by default. */
export function bytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KiB';
  return (n / 1024 / 1024).toFixed(2) + ' MiB';
}
