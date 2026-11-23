// Fliff Pro prototype — Simulator data.
// Returns one Nov 22, 2026 game as recorded by Kalshi: the home team's minute-by-minute price and the play-by-play.
// Runs on the server so the browser doesn't need cross-origin access to Kalshi. The day is over, so responses are cached hard.
const B = 'https://external-api.kalshi.com/trade-api/v2';
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

async function j(u) {
  const r = await fetch(B + u, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(u.split('?')[0] + ' ' + r.status);
  return r.json();
}
const cents = v => (v == null || v === '' ? null : Math.round(parseFloat(v) * 100));

// Kalshi shapes -> compact arrays. px: [unix, home cents] only when the price changes. plays: oldest first.
function reduce(id, start, candles, stats) {
  const px = []; let vol = 0, last = null;
  ((candles && candles.candlesticks) || []).slice().sort((a, b) => a.end_period_ts - b.end_period_ts).forEach(c => {
    const p = cents(c.price && c.price.close_dollars) ?? cents(c.yes_bid && c.yes_bid.close_dollars);
    vol += parseFloat(c.volume_fp || 0) || 0;
    if (p != null && p !== last) { px.push([c.end_period_ts, p]); last = p; }
  });
  const plays = [];
  const periods = (stats && stats.pbp && stats.pbp.periods) || [];
  periods.forEach(per => (per.events || []).forEach(ev => {
    const list = Array.isArray(ev.plays) ? ev.plays : [ev];          // football: drives hold plays; basketball: flat events
    list.forEach(p => {
      if (!p || !p.wall_clock || !p.description) return;
      plays.push([p.wall_clock, per.period_number || 0, p.clock || '', p.away_points || 0, p.home_points || 0,
        p.play_type || p.event_type || '', p.description, p.down || 0, p.yfd || 0, p.sequence || 0]);
    });
  }));
  plays.sort((a, b) => a[9] - b[9] || a[0] - b[0]);
  plays.forEach(p => p.pop());
  return { id, start, px, vol: Math.round(vol), plays };
}

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id');
  const g = G[id];
  if (!g) { res.statusCode = 404; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ error: 'unknown game', ids: Object.keys(G) })); return; }
  const [ser, ev, home, ms, iso] = g; const s = Math.floor(Date.parse(iso) / 1000);
  const tk = `${ser}-${ev}-${home}`, q = `?start_ts=${s - 7200}&end_ts=${s + 6 * 3600}&period_interval=1`;
  try {
    const [candles, stats] = await Promise.all([
      j(`/series/${ser}/markets/${tk}/candlesticks${q}`).catch(() => j(`/historical/markets/${tk}/candlesticks${q}`)),
      j(`/live_data/milestone/${ms}/game_stats`).catch(() => null),
    ]);
    const out = reduce(id, s, candles, stats);
    res.statusCode = 200; res.setHeader('content-type', 'application/json');
    res.setHeader('Cache-Control', out.px.length ? 'public, s-maxage=604800, stale-while-revalidate=2592000' : 'no-store');
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 502; res.setHeader('content-type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
};
module.exports.reduce = reduce;
module.exports.G = G;
