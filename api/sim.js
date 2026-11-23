// Fliff Pro prototype — Simulator data for Sunday Nov 22, 2026.
//   /api/sim?id=<game>             core: Kalshi's minute-by-minute home win price + ESPN's play-by-play (real wall clocks,
//                                  field position, down and distance) + every player's stats as they built up
//   /api/sim?id=<game>&part=props  Kalshi's spread, total and player-prop ladders, minute by minute
// Runs on the server so the browser doesn't need cross-origin access. The day is over, so responses are cached hard.
const B = 'https://external-api.kalshi.com/trade-api/v2';
const ES = 'https://site.api.espn.com/apis/site/v2/sports/';
// id: [series, event suffix, home market code, milestone id, scheduled start (UTC)]
const G = {
  'nfl-TEN-DAL': ['KXNFLGAME', '26NOV22TENDAL', 'DAL', '70982ff2-9584-40dd-ba9d-d0fac5233e5e', '2026-11-22T18:00:00Z'],
  'nfl-PIT-PHI': ['KXNFLGAME', '26NOV22PITPHI', 'PHI', '1250f335-504d-4df3-b404-a13a702adde9', '2026-11-22T18:00:00Z'],
  'nfl-NO-CHI': ['KXNFLGAME', '26NOV22NOCHI', 'CHI', '3548ea00-dfd6-44d2-94c6-cd4a749b63de', '2026-11-22T18:00:00Z'],
  'nfl-MIA-BUF': ['KXNFLGAME', '26NOV22MIABUF', 'BUF', '03e5b565-9aed-40ac-9f7e-abcb245cb681', '2026-11-22T18:00:00Z'],
  'nfl-ARI-KC': ['KXNFLGAME', '26NOV22ARIKC', 'KC', '2716afe3-cab3-4394-a938-fc9bee8e8838', '2026-11-22T18:00:00Z'],
  'nfl-TB-DET': ['KXNFLGAME', '26NOV22TBDET', 'DET', 'b47bf109-186c-4c0f-b02b-7322d32e9aa3', '2026-11-22T18:00:00Z'],
  'nfl-BAL-CAR': ['KXNFLGAME', '26NOV22BALCAR', 'CAR', '1138d54f-23e9-4bd2-a2cd-c7a65663ec0e', '2026-11-22T18:00:00Z'],
  'nfl-NYJ-LAC': ['KXNFLGAME', '26NOV22NYJLAC', 'LAC', '5fa32a20-6cce-4108-be50-f9e7f1d5986a', '2026-11-22T21:05:00Z'],
  'nfl-LV-DEN': ['KXNFLGAME', '26NOV22LVDEN', 'DEN', '9c8f4085-3870-46bb-9411-a817c8ef9fc2', '2026-11-22T21:25:00Z'],
  'nfl-JAX-NYG': ['KXNFLGAME', '26NOV22JACNYG', 'NYG', 'a642279b-6969-43d1-97c2-aa34e66cf372', '2026-11-22T21:25:00Z'],
  'nfl-MIN-SF': ['KXNFLGAME', '26NOV22MINSF', 'SF', 'd6f63d84-3aa7-47cb-8495-0f409ea0cb43', '2026-11-23T01:20:00Z'],
  'nba-DET-ATL': ['KXNBAGAME', '26NOV22DETATL', 'ATL', '0d63d630-a906-50b2-97cf-e48eddb8b09a', '2026-11-22T20:30:00Z'],
  'nba-OKC-MIA': ['KXNBAGAME', '26NOV22OKCMIA', 'MIA', '7bfb23f2-55b7-545b-a6ef-15435320ab3a', '2026-11-22T23:00:00Z'],
  'nba-ORL-WSH': ['KXNBAGAME', '26NOV22ORLWAS', 'WAS', 'b11bd296-67c3-54f3-9841-8260df3029f4', '2026-11-23T00:00:00Z'],
  'nba-DEN-CHI': ['KXNBAGAME', '26NOV22DENCHI', 'CHI', 'caf324ab-c7ec-5619-b788-54386469d012', '2026-11-23T00:00:00Z'],
  'nba-DAL-UTA': ['KXNBAGAME', '26NOV22DALUTA', 'UTA', '5cb748c9-95e6-5b35-b35d-d46c5fabdc5d', '2026-11-23T00:00:00Z'],
  'nba-IND-NY': ['KXNBAGAME', '26NOV22INDNYK', 'NYK', 'dbd6f04b-9739-513d-8ca0-9d3a01b30840', '2026-11-23T01:00:00Z'],
  'nba-BOS-GS': ['KXNBAGAME', '26NOV22BOSGSW', 'GSW', 'cdb6453f-a1ed-52e2-a0e4-37d021de63f2', '2026-11-23T01:30:00Z'],
};
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
async function j(u) {
  for (let n = 0; ; n++) {
    const r = await fetch(B + u, { headers: { accept: 'application/json' } });
    if (r.ok) return r.json();
    if (r.status !== 429 || n >= 5) { const e = new Error(u.split('?')[0] + ' ' + r.status); e.status = r.status; throw e; }
    await sleep(450 * (n + 1) + Math.random() * 400);   // Kalshi rate limit: wait and try again
  }
}
async function je(u) {
  const r = await fetch(ES + u, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('espn ' + u.split('?')[0] + ' ' + r.status);
  return r.json();
}
const cents = v => (v == null || v === '' ? null : Math.round(parseFloat(v) * 100));
const ok99 = p => p != null && p >= 1 && p <= 99;

// ---------- core: win price ----------
function winPx(candles) {
  const px = []; let vol = 0, last = null;
  ((candles && candles.candlesticks) || []).slice().sort((a, b) => a.end_period_ts - b.end_period_ts).forEach(c => {
    const p = cents(c.price && c.price.close_dollars) ?? cents(c.yes_bid && c.yes_bid.close_dollars);
    vol += parseFloat(c.volume_fp || 0) || 0;
    if (ok99(p) && p !== last) { px.push([c.end_period_ts, p]); last = p; }   // an empty minute after settlement reports 0
  });
  return { px, vol: Math.round(vol) };
}
// Kalshi's own play feed (fallback when ESPN has nothing)
function kalshiPlays(id, start, stats, px) {
  const plays = [];
  ((stats && stats.pbp && stats.pbp.periods) || []).forEach(per => (per.events || []).forEach(ev => {
    (Array.isArray(ev.plays) ? ev.plays : [ev]).forEach(p => {
      if (!p || !p.wall_clock || !p.description) return;
      plays.push([p.wall_clock, per.period_number || 0, p.clock || '', p.away_points || 0, p.home_points || 0, p.play_type || p.event_type || '', p.description, p.down || 0, p.yfd || 0, p.sequence || 0]);
    });
  }));
  plays.sort((a, b) => a[9] - b[9] || a[0] - b[0]); plays.forEach(p => p.pop());
  if (plays.length > 20 && px.length > 1) {
    const nfl = /^nfl/.test(id), lastW = plays[plays.length - 1][0], span = lastW - plays[0][0];
    const end = nfl ? (lastW - start > 9900 && lastW - start < 13800 ? lastW : start + 11400) : px[px.length - 1][0];
    if (nfl || (end - start > 5400 && span < 0.6 * (end - start))) {
      const Q = nfl ? 900 : 720, half = 780, t0 = start + 240, live = Math.max(3600, end - t0 - half);
      plays.forEach(p => {
        const m = /^(\d+):(\d+)/.exec(p[2] || ''), left = m ? +m[1] * 60 + +m[2] : Q;
        const el = Math.min(4 * Q, (Math.min(p[1] || 1, 4) - 1) * Q + (Q - Math.min(Q, left)) + (p[1] > 4 ? Q : 0));
        p[0] = Math.round(t0 + (el / (4 * Q)) * live + (p[1] >= 3 ? half : 0));
      });
      for (let i = 1; i < plays.length; i++) if (plays[i][0] < plays[i - 1][0]) plays[i][0] = plays[i - 1][0];
    }
  }
  return plays;
}

// ---------- core: ESPN ----------
const EAB = { UTAH: 'UTA', WAS: 'WSH', JAC: 'JAX', NYK: 'NY', GSW: 'GS', SAS: 'SA', NOP: 'NO' };
const ab = a => EAB[a] || a;
const SB = {};
async function espnEvent(id) {
  const nfl = /^nfl/.test(id), sp = nfl ? 'football/nfl' : 'basketball/nba', [, A, H] = id.split('-');
  if (!SB[sp]) SB[sp] = je(sp + '/scoreboard?dates=20261122&limit=100').catch(e => { delete SB[sp]; throw e; });
  const sb = await SB[sp];
  const ev = (sb.events || []).find(e => { const c = ((e.competitions || [])[0] || {}).competitors || []; const h = c.find(x => x.homeAway === 'home'), a = c.find(x => x.homeAway === 'away'); return h && a && ab(h.team.abbreviation) === H && ab(a.team.abbreviation) === A; });
  if (!ev) throw new Error('espn: no event for ' + id);
  return je(sp + '/summary?event=' + ev.id);
}
const ts = w => { const t = Date.parse(w || ''); return isFinite(t) ? Math.floor(t / 1000) : 0; };
const SUF = /\s+(Jr\.?|Sr\.?|II|III|IV|V)$/i;
const nkey = s => s.replace(SUF, '').replace(/[.\s]/g, '').toLowerCase();
const NM = "[A-Z][A-Za-z'\\-]*\\.\\s?(?:St\\.\\s?|De\\s|Van\\s)?[A-Z][A-Za-z'\\-]+";
function espnParse(id, sum) {
  const nfl = /^nfl/.test(id), comp = sum.header.competitions[0];
  const home = comp.competitors.find(c => c.homeAway === 'home'), away = comp.competitors.find(c => c.homeAway === 'away');
  const hid = String(home.id), aid = String(away.id), [, A, H] = id.split('-');
  // players from the box score, with final stats
  const players = [], byId = {}, byKey = { a: {}, h: {} }, fin = [];
  const P = (ath, side) => { const k = String(ath.id); if (byId[k] == null) { byId[k] = players.length; players.push([ath.displayName, side === 'h' ? H : A, ath.jersey || '', (ath.position && ath.position.abbreviation) || '']); fin.push({});
      const nm = ath.displayName.replace(SUF, ''), sp = nm.split(' '); byKey[side][nkey(sp[0][0] + sp.slice(1).join(''))] = byId[k]; byKey[side][nkey(sp[0][0] + sp[sp.length - 1])] = byId[k]; } return byId[k]; };
  ((sum.boxscore && sum.boxscore.players) || []).forEach(tm => { const side = String(tm.team.id) === hid ? 'h' : 'a';
    (tm.statistics || []).forEach(st => { const keys = st.keys || st.names || st.labels || []; const ix = n => keys.indexOf(n);
      (st.athletes || []).forEach(a => { if (!a.athlete) return; const i = P(a.athlete, side), s = a.stats || [], v = n => { const k = ix(n); return k < 0 ? null : parseFloat(s[k]) || 0; }, f = fin[i];
        if (nfl) {
          if (st.name === 'passing') { f.py = v('passingYards'); f.ptd = v('passingTouchdowns'); }
          if (st.name === 'rushing') { f.ry = v('rushingYards'); f.td = (f.td || 0) + (v('rushingTouchdowns') || 0); }
          if (st.name === 'receiving') { f.cy = v('receivingYards'); f.rc = v('receptions'); f.td = (f.td || 0) + (v('receivingTouchdowns') || 0); }
        } else {
          const lab = st.labels || st.names || keys, g = n => { const k = lab.indexOf(n); return k < 0 ? null : parseFloat(s[k]) || 0; };
          if (g('PTS') != null && s.length) { f.pts = g('PTS'); f.reb = g('REB'); f.ast = g('AST'); }
        } }); }); });
  // plays
  const raw = nfl ? ((sum.drives && sum.drives.previous) || []).flatMap(d => d.plays || []) : (sum.plays || []);
  const plays = [], ev = [], acc = players.map(() => ({})), lastT = players.map(() => ({}));
  const add = (t, i, k, n) => { if (i == null || !n) return; ev.push([t, i, k, n]); acc[i][k] = (acc[i][k] || 0) + n; lastT[i][k] = t; };
  let prevT = 0;
  raw.forEach(p => {
    let t = ts(p.wallclock); if (!t || t < prevT) t = prevT; prevT = t; if (!t) return;
    const ty = (p.type && p.type.text) || '', txt = p.text || '';
    if (nfl) {
      const s = p.start || {}, e = p.end || {}, side = s.team && String(s.team.id) === hid ? 'h' : s.team && String(s.team.id) === aid ? 'a' : '';
      plays.push([t, (p.period && p.period.number) || 0, (p.clock && p.clock.displayValue) || '', p.awayScore || 0, p.homeScore || 0, ty, txt, s.down || 0, s.distance || 0,
        s.yardsToEndzone == null ? -1 : s.yardsToEndzone, e.yardsToEndzone == null ? -1 : e.yardsToEndzone, side, p.statYardage || 0, p.scoringPlay ? 1 : 0, s.downDistanceText || '']);
      if (!side || /No Play/i.test(txt)) return;
      const c = txt.replace(/\([^)]*\)/g, ' '), who = n => n == null ? null : (byKey[side][nkey(n)] ?? byKey[side === 'h' ? 'a' : 'h'][nkey(n)]);
      const first = (new RegExp('(' + NM + ')').exec(c) || [])[1], y = p.statYardage || 0;
      if (/^(Pass Reception|Passing Touchdown)$/i.test(ty)) { const to = (new RegExp(' to (' + NM + ')').exec(c) || [])[1], pi = who(first), ri = who(to);
        add(t, pi, 'py', y); add(t, ri, 'cy', y); add(t, ri, 'rc', 1); if (/Touchdown/i.test(ty)) { add(t, pi, 'ptd', 1); add(t, ri, 'td', 1); } }
      else if (/^(Rush|Rushing Touchdown)$/i.test(ty)) { const ri = who(first); add(t, ri, 'ry', y); if (/Touchdown/i.test(ty)) add(t, ri, 'td', 1); }
    } else {
      plays.push([t, (p.period && p.period.number) || 0, (p.clock && p.clock.displayValue) || '', p.awayScore || 0, p.homeScore || 0, ty, txt, 0, 0]);
      const pa = (p.participants || []).map(x => x.athlete && byId[String(x.athlete.id)]);
      if (p.scoringPlay && pa[0] != null) { add(t, pa[0], 'pts', p.scoreValue || 0); if (/assist/i.test(txt) && pa[1] != null) add(t, pa[1], 'ast', 1); }
      else if (/rebound/i.test(ty) && pa[0] != null) add(t, pa[0], 'reb', 1);
    }
  });
  // make every running total land exactly on the box score
  let fix = 0; const endT = plays.length ? plays[plays.length - 1][0] : 0;
  fin.forEach((f, i) => Object.keys(f).forEach(k => { if (f[k] == null) return; const d = f[k] - (acc[i][k] || 0); if (d) { fix++; ev.push([lastT[i][k] || endT, i, k, d]); } }));
  ev.sort((a, b) => a[0] - b[0]);
  return { plays, players, ev, fix, score: [+away.score || 0, +home.score || 0] };
}

async function core(id) {
  const [ser, evt, home, ms, iso] = G[id]; const s = Math.floor(Date.parse(iso) / 1000);
  const tk = `${ser}-${evt}-${home}`, q = `?start_ts=${s - 7200}&end_ts=${s + 6 * 3600}&period_interval=1`;
  const [candles, esp] = await Promise.all([
    j(`/series/${ser}/markets/${tk}/candlesticks${q}`).catch(() => j(`/historical/markets/${tk}/candlesticks${q}`)),
    espnEvent(id).then(x => espnParse(id, x)).catch(e => ({ err: String(e && e.message || e) })),
  ]);
  const w = winPx(candles), out = { id, start: s, px: w.px, vol: w.vol, src: 'espn' };
  if (esp.plays && esp.plays.length > 20) Object.assign(out, { plays: esp.plays, players: esp.players, ev: esp.ev, fix: esp.fix, score: esp.score });
  else { const st = await j(`/live_data/milestone/${ms}/game_stats`).catch(() => null); out.plays = kalshiPlays(id, s, st, w.px); out.src = 'kalshi'; out.err = esp.err || 'espn: no plays'; }
  return out;
}

// ---------- props: Kalshi ladders ----------
const PROPS = {
  nfl: [['KXNFLPASSYDS', 'py', 2, 12], ['KXNFLPASSTDS', 'ptd', 2, 5], ['KXNFLRSHYDS', 'ry', 4, 12], ['KXNFLRECYDS', 'cy', 6, 12], ['KXNFLTD', 'td', 6, 1]],
  nba: [['KXNBAPTS', 'pts', 8, 12], ['KXNBAREB', 'reb', 5, 10], ['KXNBAAST', 'ast', 5, 10]],
};
function series(cs, s) {   // candles -> [[minutes from start, cents]] on change
  const out = []; let last = null;
  (cs || []).slice().sort((a, b) => a.end_period_ts - b.end_period_ts).forEach(c => {
    const b = cents(c.yes_bid && c.yes_bid.close_dollars), a = cents(c.yes_ask && c.yes_ask.close_dollars), t = cents(c.price && c.price.close_dollars);
    let p = null;
    if (b != null && a != null && a > b && a - b <= 15 && !(b <= 0 && a >= 100)) p = Math.round((a + b) / 2);
    else if (ok99(t)) p = t;
    else if (b != null && a != null && a >= 99 && b >= 90) p = 99; else if (b != null && a != null && a <= 10 && b <= 1) p = 1;
    if (p == null) return; p = Math.max(1, Math.min(99, p));
    if (p !== last) { out.push([Math.round((c.end_period_ts - s) / 60), p]); last = p; }
  });
  return out;
}
async function batch(tickers, a, b, dbg) {
  if (!tickers.length) return {};
  try {
    const r = await j(`/markets/candlesticks?market_tickers=${tickers.join(',')}&start_ts=${a}&end_ts=${b}&period_interval=1&include_latest_before_start=true`);
    const o = {}; (r.markets || []).forEach(m => { o[m.market_ticker] = m.candlesticks || []; }); return o;
  } catch (e) {
    if (tickers.length === 1 || e.status === 429) { dbg.push(String(e.message)); return {}; }
    const h = tickers.length >> 1; return Object.assign(await batch(tickers.slice(0, h), a, b, dbg), await batch(tickers.slice(h), a, b, dbg));
  }
}
async function props(id) {
  const nfl = /^nfl/.test(id), lg = nfl ? 'nfl' : 'nba', [, evt, hK, , iso] = G[id], s = Math.floor(Date.parse(iso) / 1000);
  const aK = evt.slice(7, evt.length - hK.length), [, A, H] = id.split('-'), pre = nfl ? 'KXNFL' : 'KXNBA', dbg = [];
  const want = [['SPREAD', 'sp'], ['TOTAL', 'tot']].map(([x, k]) => [pre + x, k]).concat(PROPS[lg]);
  const evs = [];
  for (const w of want) { evs.push(await j(`/events/${w[0]}-${evt}?with_nested_markets=true`).then(r => (r.event && r.event.markets) || []).catch(e => { dbg.push(String(e.message)); return []; })); }
  const vol = m => parseFloat(m.volume_fp || 0) || 0, pick = [];           // [ticker, where it goes]
  const out = { id, part: 'props', start: s, sp: [], tot: [], pl: [] };
  evs[0].forEach(m => { const tail = m.ticker.split('-').pop(), x = +m.floor_strike; if (!isFinite(x)) return; const isH = tail.indexOf(hK) === 0;
    const row = [isH ? -x : x, [], isH ? 0 : 1]; out.sp.push(row); pick.push([m.ticker, row]); });
  evs[1].forEach(m => { const x = +m.floor_strike; if (!isFinite(x)) return; const row = [x, []]; out.tot.push(row); pick.push([m.ticker, row]); });
  PROPS[lg].forEach(([, code, maxP, maxL], k) => { const by = {};
    evs[2 + k].forEach(m => { const seg = m.ticker.split('-'), tag = seg[seg.length - 2] || '', nm = (m.yes_sub_title || '').split(':')[0].trim(), x = +m.floor_strike; if (!nm || !isFinite(x)) return;
      const tm = tag.indexOf(hK) === 0 ? H : tag.indexOf(aK) === 0 ? A : '', num = (/(\d+)$/.exec(tag) || [])[1] || '';
      (by[tag] = by[tag] || { nm, tm, num, k: code, vol: 0, ms: [] }).ms.push([x, m.ticker, vol(m)]); by[tag].vol += vol(m); });
    Object.values(by).filter(p => p.tm).sort((a, b) => b.vol - a.vol).slice(0, maxP).forEach(p => {
      p.ms.sort((a, b) => a[0] - b[0]); let ms = p.ms;
      if (code === 'td') ms = ms.slice(0, 1);
      else if (ms.length > maxL) { let bi = 0; ms.forEach((m, i) => { if (m[2] > ms[bi][2]) bi = i; }); const lo = Math.max(0, Math.min(ms.length - maxL, bi - (maxL >> 1))); ms = ms.slice(lo, lo + maxL); }
      const lad = ms.map(m => { const row = [m[0], []]; pick.push([m[1], row]); return row; });
      out.pl.push({ nm: p.nm, tm: p.tm, num: p.num, k: code, vol: Math.round(p.vol), lad });
    }); });
  const a = s - 1800, b = s + (nfl ? 4 * 3600 : 3.25 * 3600), per = Math.max(8, Math.floor(9500 / ((b - a) / 60 + 2)));
  for (let i = 0; i < pick.length; i += per) { const part = pick.slice(i, i + per), got = await batch(part.map(p => p[0]), a, b, dbg);
    part.forEach(([tk, row]) => { let sr = series(got[tk], s); if (row.length === 3 && row[2]) sr = sr.map(x => [x[0], 100 - x[1]]); row[1] = sr; }); }
  out.sp = out.sp.map(r => [r[0], r[1]]).filter(r => r[1].length).sort((x, y) => x[0] - y[0]);
  out.tot = out.tot.filter(r => r[1].length).sort((x, y) => x[0] - y[0]);
  out.pl.forEach(p => { p.lad = p.lad.filter(r => r[1].length); }); out.pl = out.pl.filter(p => p.lad.length);
  out.n = pick.length; if (dbg.length) out.dbg = dbg.slice(0, 6);
  return out;
}

module.exports = async (req, res) => {
  const q = (req.query && req.query.id) ? req.query : Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const id = q.id, send = (code, body, cache) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('Cache-Control', cache ? 'public, max-age=0, s-maxage=604800, stale-while-revalidate=2592000' : 'no-store'); res.end(JSON.stringify(body)); };
  if (!G[id]) return send(404, { error: 'unknown game', ids: Object.keys(G) });
  try {
    if (q.part === 'props') { const o = await props(id); return send(200, o, o.sp.length + o.tot.length + o.pl.length > 0 && !o.dbg); }
    const o = await core(id); return send(200, o, o.px.length > 0 && o.src === 'espn');
  } catch (e) { send(502, { error: String(e && e.message || e) }); }
};
Object.assign(module.exports, { G, espnParse, series, winPx, kalshiPlays });
