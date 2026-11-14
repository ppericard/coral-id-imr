#!/usr/bin/env node
// The sheet script's Timings tab, summed up for the integrator (the storage study of 2026-11-14, step 1; Pierre,
// 2026-11-14, Q352: the answer log moves to Cloudflare D1 only when a measured threshold is crossed). The tab (Code.gs
// TIM: Time, Op, Ms, Rows, Cols, Version, Weight) holds no player data; read it read-only through the Google Sheets
// connector (range "Timings!A1:G", saved as the JSON it returns) or as a CSV download, then:
//
//   node tools/timings.js timings.json            per operation, the trend by day (by week past 45 days), the quota lines
//   node tools/timings.js timings.csv --json      the same as JSON
//
// Each row stands for Weight calls (1 in Code.gs TIM.EVERY requests is kept whole at that weight, every slow operation
// at weight 1; the trigger's trimming doubles the weight of the old rows it keeps), so counts are sums of weights and the
// median and p90 are weighted. The quota lines: Apps Script's 6 minutes per execution (the slowest call), its 90 minutes
// of triggers a day (the weighted trigger time per day). The 20,000 URL fetches a day are not measured here.
const fs = require('fs');

const LIMIT = {EXEC_MS: 6 * 60 * 1000, TRIGGER_MIN_DAY: 90};

// A Time cell as an export gives it: a Date, epoch ms, a Sheets serial day number, "2026-11-12 20:35[:07]", ISO, or
// "11/12/2026 20:35:07". Returns epoch ms (a time without zone read as UTC: only days and order matter here), or NaN.
function parseTime(x) {
  if (x instanceof Date) return x.getTime();
  if (typeof x === 'number' || (typeof x === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(x))) {
    const v = Number(x);
    return v > 1e11 ? v : v > 0 ? Math.round((v - 25569) * 864e5) : NaN; // a serial day: 25569 is 1970-01-01
  }
  const t = String(x == null ? '' : x).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.exec(t);
  if (m) return m[7] ? Date.parse(t.replace(' ', 'T')) : Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (m) return Date.UTC(+m[3], +m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = Date.parse(t);
  return isFinite(d) ? d : NaN;
}

// A CSV text as rows of cells (quotes and doubled quotes; no other dialect).
function parseCsv(text) {
  const out = [];
  let row = [],
    cell = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), out.push(row), (row = []), (cell = '');
    } else cell += c;
  }
  if (cell !== '' || row.length) row.push(cell), out.push(row);
  return out;
}

// The tab's rows from a file's text: JSON (an array of rows, or the connector's {values: [...]}) or CSV. The header row,
// when there, is dropped; rows with no op or no ms are skipped.
function rowsOf(text) {
  let v;
  try {
    v = JSON.parse(text);
    if (v && !Array.isArray(v)) v = v.values || v.content?.values || [];
  } catch (e) {
    v = parseCsv(text);
  }
  return v
    .filter(r => Array.isArray(r) && r.length >= 3 && String(r[1] || '').trim() && String(r[1]) !== 'Op')
    .map(r => ({
      t: parseTime(r[0]),
      op: String(r[1]).trim(),
      ms: Number(r[2]),
      rows: r[3] === '' || r[3] == null ? null : Number(r[3]),
      cols: r[4] === '' || r[4] == null ? null : Number(r[4]),
      v: r[5] === '' || r[5] == null ? null : Number(r[5]),
      w: Number(r[6]) > 0 ? Number(r[6]) : 1
    }))
    .filter(r => isFinite(r.ms));
}

// The weighted q-quantile of ms (q in 0..1): the smallest ms whose cumulated weight reaches q of the total.
function quantile(L, q) {
  if (!L.length) return null;
  const s = L.slice().sort((a, b) => a.ms - b.ms),
    tot = s.reduce((t, r) => t + r.w, 0);
  let c = 0;
  for (const r of s) if ((c += r.w) >= q * tot - 1e-9) return r.ms;
  return s[s.length - 1].ms;
}
const maxOf = (L, k) => L.reduce((m, r) => (r[k] != null && isFinite(r[k]) && (m == null || r[k] > m) ? r[k] : m), null);
const isoDay = t => new Date(t).toISOString().slice(0, 10);
// The Monday of t's week, as a day.
const isoWeek = t => {
  const d = new Date(t),
    k = (d.getUTCDay() + 6) % 7;
  return isoDay(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - k));
};
function stat(L) {
  return {
    logged: L.length,
    calls: Math.round(L.reduce((t, r) => t + r.w, 0)),
    median: quantile(L, 0.5),
    p90: quantile(L, 0.9),
    max: maxOf(L, 'ms'),
    maxRows: maxOf(L, 'rows'),
    maxCols: maxOf(L, 'cols')
  };
}

// The summary: per operation (count, median, p90, max ms, the most rows read), the trend per operation by day (by week
// when the rows span more than 45 days), and the quota lines.
function summary(rows, opts = {}) {
  const R = rows.filter(r => isFinite(r.t)).sort((a, b) => a.t - b.t);
  const ops = [...new Set(R.map(r => r.op))].sort();
  const t0 = R.length ? R[0].t : NaN,
    t1 = R.length ? R[R.length - 1].t : NaN,
    days = R.length ? Math.max(1, (t1 - t0) / 864e5) : 0;
  const byWeek = opts.week != null ? !!opts.week : days > 45,
    key = byWeek ? isoWeek : isoDay;
  const per = {};
  ops.forEach(op => (per[op] = stat(R.filter(r => r.op === op))));
  const trend = [];
  ops.forEach(op => {
    const by = new Map();
    R.filter(r => r.op === op).forEach(r => {
      const k = key(r.t);
      by.set(k, (by.get(k) || []).concat([r]));
    });
    by.forEach((L, k) => trend.push(Object.assign({op, at: k}, stat(L))));
  });
  // Each trigger run's time, weighted, over the span: minutes a day against the 90 of a consumer account.
  const trig = R.filter(r => r.op === 'trigger'),
    trigMin = days ? trig.reduce((t, r) => t + r.w * r.ms, 0) / 60000 / days : 0;
  const slowest = R.reduce((m, r) => (!m || r.ms > m.ms ? r : m), null);
  return {
    from: R.length ? new Date(t0).toISOString() : null,
    to: R.length ? new Date(t1).toISOString() : null,
    days: Math.round(days * 10) / 10,
    by: byWeek ? 'week' : 'day',
    versions: [...new Set(R.map(r => r.v).filter(v => v != null))].sort((a, b) => a - b),
    ops: per,
    trend,
    quota: {
      execMs: LIMIT.EXEC_MS,
      slowest: slowest ? {op: slowest.op, ms: slowest.ms, at: new Date(slowest.t).toISOString()} : null,
      slowestShare: slowest ? Math.round((1000 * slowest.ms) / LIMIT.EXEC_MS) / 10 : 0,
      triggerMinDay: Math.round(trigMin * 10) / 10,
      triggerMinLimit: LIMIT.TRIGGER_MIN_DAY,
      triggerShare: Math.round((1000 * trigMin) / LIMIT.TRIGGER_MIN_DAY) / 10,
      fetches: 'not measured'
    }
  };
}

const pad = (x, n) => String(x == null ? '-' : x).padStart(n);
function text(S) {
  const out = [];
  out.push(`Timings ${S.from || '-'} .. ${S.to || '-'} (${S.days} days), script versions ${S.versions.join(', ') || '-'}`);
  out.push('');
  out.push(`${'op'.padEnd(20)}${pad('logged', 8)}${pad('calls', 8)}${pad('median', 9)}${pad('p90', 9)}${pad('max ms', 9)}${pad('max rows', 10)}`);
  Object.entries(S.ops).forEach(([op, s]) =>
    out.push(`${op.padEnd(20)}${pad(s.logged, 8)}${pad(s.calls, 8)}${pad(s.median, 9)}${pad(s.p90, 9)}${pad(s.max, 9)}${pad(s.maxRows, 10)}`)
  );
  out.push('');
  out.push(`Trend by ${S.by} (median and p90 ms, the most rows read)`);
  out.push(`${'op'.padEnd(20)}${S.by.padEnd(12)}${pad('calls', 8)}${pad('median', 9)}${pad('p90', 9)}${pad('max ms', 9)}${pad('max rows', 10)}`);
  S.trend.forEach(s =>
    out.push(`${s.op.padEnd(20)}${s.at.padEnd(12)}${pad(s.calls, 8)}${pad(s.median, 9)}${pad(s.p90, 9)}${pad(s.max, 9)}${pad(s.maxRows, 10)}`)
  );
  const q = S.quota;
  out.push('');
  out.push(`Quota: slowest call ${q.slowest ? `${q.slowest.op} ${q.slowest.ms} ms (${q.slowestShare}% of the 6 min limit)` : '-'}`);
  out.push(`       trigger ${q.triggerMinDay} min/day (${q.triggerShare}% of 90 min/day); URL fetches: not measured`);
  return out.join('\n');
}

if (require.main === module) {
  const args = process.argv.slice(2),
    file = args.find(a => !a.startsWith('--'));
  if (!file) {
    console.error('usage: node tools/timings.js <Timings tab as JSON or CSV> [--json] [--week|--day]');
    process.exit(2);
  }
  const S = summary(rowsOf(fs.readFileSync(file, 'utf8')), {week: args.includes('--week') ? true : args.includes('--day') ? false : null});
  console.log(args.includes('--json') ? JSON.stringify(S, null, 2) : text(S));
}

module.exports = {parseTime, parseCsv, rowsOf, quantile, summary, text, LIMIT};
