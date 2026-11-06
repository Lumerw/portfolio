// Licznik kosztów asystenta w pluginie: jeden Durable Object (SQLite - działa też w planie Free Cloudflare), bo tylko on
// liczy spójnie przy równoległych zapytaniach. Wpisy na dzień (UTC): „2026-11-05:wojciech” i suma całego serwera „2026-11-05:*”.
export class FigmaUsage {
  constructor(state) { this.storage = state.storage; }
  async fetch(req) {
    const { op, user, usd = 0, mb = 0, limits = {} } = await req.json();
    const day = new Date().toISOString().slice(0, 10), mineKey = `${day}:${user}`, allKey = `${day}:*`;
    const got = await this.storage.get([mineKey, allKey]);
    const mine = got.get(mineKey) ?? { usd: 0, mb: 0 }, all = got.get(allKey) ?? { usd: 0, mb: 0 };
    if (op === 'add') {
      await this.storage.put({ [mineKey]: { usd: mine.usd + usd, mb: mine.mb + mb }, [allKey]: { usd: all.usd + usd, mb: all.mb + mb } });
      const old = await this.storage.list({ end: day, limit: 100 });   // wczorajsze i starsze wpisy nie są już potrzebne
      if (old.size) await this.storage.delete([...old.keys()]);
      return Response.json({ ok: true, usd: mine.usd + usd });
    }
    const over = mine.usd >= limits.usd || all.usd >= limits.total || mine.mb + mb > limits.mb;
    return Response.json({ ok: !over, usd: mine.usd, mb: mine.mb });
  }
}
