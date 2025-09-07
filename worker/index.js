// filepath: worker/index.js
// Script: Cloudflare Worker — aggregator and cache for provider service metadata
// Purpose: fetch provider endpoints (env) -> normalize -> cache -> return JSON
addEventListener('fetch', event => event.respondWith(handle(event.request)))

const CACHE_TTL = 15 * 60 // seconds
const PROVIDERS = {
  aws: { envKey: 'AWS_ENDPOINT' },
  azure: { envKey: 'AZURE_ENDPOINT' },
  gcp: { envKey: 'GCP_ENDPOINT' },
  oracle: { envKey: 'ORACLE_ENDPOINT' },
  alibaba: { envKey: 'ALIBABA_ENDPOINT' }
}

async function handle(req) {
  const url = new URL(req.url)
  if (url.pathname.startsWith('/api/providers')) return handleProviders(req, url)
  return new Response('Not found', { status: 404 })
}

async function handleProviders(req, url) {
  const cache = caches.default
  const cacheKey = new Request(new URL('/api/providers', 'https://example.com').toString(), {method:'GET'})
  // try cache
  const cached = await cache.match(cacheKey)
  if (cached && !url.searchParams.has('refresh')) return cached

  // build providers by calling configured endpoints or return sample fallback
  const out = { lastUpdated: new Date().toISOString(), providers: {} }
  for (const [key, meta] of Object.entries(PROVIDERS)) {
    try {
      const ep = (globalThis[meta.envKey] || '').toString()
      let fetched = null
      if (ep) {
        const r = await fetch(ep, {method:'GET', headers: {'Accept':'application/json'}})
        if (r.ok) fetched = await r.json()
      }
      out.providers[toTitle(key)] = normalizeProvider(key, fetched)
    } catch (e) {
      out.providers[toTitle(key)] = fallbackSample(key)
    }
  }

  const res = new Response(JSON.stringify(out), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `max-age=${CACHE_TTL}` }
  })
  // store in edge cache
  eventWaitUntilSafe(cache.put(cacheKey, res.clone()))
  return res
}

function toTitle(s){ return s.charAt(0).toUpperCase()+s.slice(1) }

function normalizeProvider(name, src) {
  // src shape is vendor-specific; attempt to map common fields
  if (!src) return fallbackSample(name)
  return {
    compute: {
      name: src.compute?.name || src.instance?.family || null,
      price_usd_per_hour: coerceNumber(src.compute?.price_hour || src.compute?.price_usd || src.instance?.price)
    },
    storage: { gb_month_usd: coerceNumber(src.storage?.gb_month || src.storage?.price_gb) },
    network: { bandwidth_gb_price_usd: coerceNumber(src.network?.price_gb) },
    database: { managed: !!(src.database?.managed), engines: src.database?.engines || src.engines || [] },
    kubernetes: { managed: !!(src.kubernetes?.managed) },
    regions: src.regions_count || src.regions || (Array.isArray(src.region_list) ? src.region_list.length : null),
    region_list: src.region_list || [],
    sla: coerceNumber(src.sla),
    free_tier: !!src.free_tier
  }
}

function fallbackSample(name) {
  // conservative sample so UI never crashes
  const sample = {
    compute: { name: 'generic', price_usd_per_hour: null },
    storage: { gb_month_usd: null },
    network: { bandwidth_gb_price_usd: null },
    database: { managed: false, engines: [] },
    kubernetes: { managed: false },
    regions: null,
    region_list: [],
    sla: null,
    free_tier: false
  }
  // tweak per vendor for nicer defaults
  if (name === 'aws') sample.compute.price_usd_per_hour = 0.096
  if (name === 'azure') sample.compute.price_usd_per_hour = 0.1
  if (name === 'gcp') sample.compute.price_usd_per_hour = 0.094
  if (name === 'oracle') sample.compute.price_usd_per_hour = 0.07
  if (name === 'alibaba') sample.compute.price_usd_per_hour = 0.065
  return sample
}

function coerceNumber(v) {
  if (v == null) return null
  const n = Number(String(v).replace(/[^0-9.\-eE]/g, ''))
  return Number.isFinite(n) ? n : null
}

// ensure cache.put runs without blocking response
function eventWaitUntilSafe(p) {
  try { if (typeof event !== 'undefined' && event.waitUntil) event.waitUntil(p) } catch (e) { /* best-effort */ }
}
