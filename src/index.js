const FEEDS = [
  { name: "G1", url: "https://g1.globo.com/rss/g1/" },
  { name: "G1 Espírito Santo", url: "https://g1.globo.com/dynamo/espirito-santo/rss2.xml" },
  { name: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml" },
  { name: "Agência Brasil • Economia", url: "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml" },
  { name: "Agência Brasil • Educação", url: "https://agenciabrasil.ebc.com.br/rss/educacao/feed.xml" },
  { name: "Agência Brasil • Saúde", url: "https://agenciabrasil.ebc.com.br/rss/saude/feed.xml" },
  { name: "Agência Brasil • Esportes", url: "https://agenciabrasil.ebc.com.br/rss/esportes/feed.xml" },
  { name: "BBC News Brasil", url: "https://feeds.bbci.co.uk/portuguese/rss.xml" },
  { name: "CNN Brasil", url: "https://www.cnnbrasil.com.br/feed/" },
  { name: "Poder360", url: "https://www.poder360.com.br/feed/" },
  { name: "DW Brasil", url: "https://rss.dw.com/rdf/rss-br-all" }
];

const MAX_ITEMS_PER_FEED = 16;
const MAX_OUTPUT_ITEMS = 64;
const FETCH_TIMEOUT_MS = 8500;
const MAX_AGE_HOURS = 72;

const HEAVY_HARD_BLOCK = [
  "estupro", "violência sexual", "abuso sexual", "pedofilia", "pornografia infantil",
  "suicídio", "suicidio", "feminicídio", "feminicidio", "chacina", "massacre",
  "decapitado", "decapitada", "esquartejado", "esquartejada", "cadáver", "cadaver",
  "tortura", "torturado", "torturada", "corpo carbonizado", "corpo encontrado",
  "criança morta", "crianca morta", "bebê morto", "bebe morto"
];

const HEAVY_SOFT_BLOCK = [
  "assassinato", "assassinado", "assassinada", "homicídio", "homicidio", "morto", "morta",
  "morte", "baleado", "baleada", "tiroteio", "arma de fogo", "facada", "esfaqueado",
  "acidente fatal", "tragédia", "tragedia", "desastre", "explosão", "explosao",
  "ataque matou", "guerra", "bombardeio", "vítimas fatais", "vitimas fatais"
];

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "content-type": "application/json; charset=utf-8"
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "cache-control": "public, max-age=180, s-maxage=300",
      ...(init.headers || {})
    }
  });
}

function decodeEntities(value = "") {
  const named = { amp:"&", lt:"<", gt:">", quot:'"', apos:"'", nbsp:" " };
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value = "") {
  return stripHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstTag(xml, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
    const match = xml.match(re);
    if (match) return decodeEntities(match[1]).trim();
  }
  return "";
}

function attr(tag, name) {
  if (!tag) return "";
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = tag.match(re);
  return match ? decodeEntities(match[1]).trim() : "";
}

function extractLink(block) {
  const direct = firstTag(block, ["link"]);
  if (/^https?:\/\//i.test(stripHtml(direct))) return stripHtml(direct);
  const atomLinks = block.match(/<link\b[^>]*>/gi) || [];
  for (const tag of atomLinks) {
    const href = attr(tag, "href");
    const rel = attr(tag, "rel");
    if (href && (!rel || rel === "alternate")) return href;
  }
  return "";
}

function resolveUrl(value, base) {
  let url = decodeEntities(value || "").trim();
  if (!url || /^data:/i.test(url) || /^javascript:/i.test(url)) return "";
  try {
    if (url.startsWith("//")) url = "https:" + url;
    const resolved = new URL(url, base).href;
    if (!/^https?:\/\//i.test(resolved)) return "";
    if (/\.svg(?:[?#]|$)/i.test(resolved)) return "";
    return resolved;
  } catch {
    return "";
  }
}

function bestFromSrcset(srcset = "", base = "") {
  const candidates = decodeEntities(srcset)
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const bits = part.split(/\s+/);
      const url = resolveUrl(bits[0], base);
      const descriptor = bits[1] || "";
      const width = /^(\d+)w$/i.test(descriptor) ? Number(descriptor.slice(0, -1)) : 0;
      return { url, width };
    })
    .filter(x => x.url);
  candidates.sort((a,b) => b.width - a.width);
  return candidates[0]?.url || "";
}

function extractImage(block, baseUrl = "") {
  const mediaTags = block.match(/<(?:media:content|media:thumbnail)\b[^>]*>/gi) || [];
  for (const tag of mediaTags) {
    const type = attr(tag, "type");
    const medium = attr(tag, "medium");
    const url = resolveUrl(attr(tag, "url"), baseUrl);
    if (url && (!type || type.startsWith("image/") || medium === "image")) return url;
  }

  const enclosureTags = block.match(/<enclosure\b[^>]*>/gi) || [];
  for (const tag of enclosureTags) {
    const type = attr(tag, "type");
    const url = resolveUrl(attr(tag, "url"), baseUrl);
    if (url && (!type || type.startsWith("image/"))) return url;
  }

  const htmlSources = [
    firstTag(block, ["content:encoded"]),
    firstTag(block, ["content"]),
    firstTag(block, ["description"]),
    firstTag(block, ["summary"])
  ].filter(Boolean);

  for (const html of htmlSources) {
    const decoded = decodeEntities(html);
    const imgTags = decoded.match(/<img\b[^>]*>/gi) || [];
    for (const tag of imgTags) {
      const srcset = attr(tag, "srcset") || attr(tag, "data-srcset");
      const fromSet = bestFromSrcset(srcset, baseUrl);
      if (fromSet) return fromSet;
      const src = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-lazy-src") || attr(tag, "data-original");
      const url = resolveUrl(src, baseUrl);
      if (url) return url;
    }
  }

  const genericImageTags = block.match(/<(?:image|media:group)\b[\s\S]*?<\/\1>/gi) || [];
  for (const chunk of genericImageTags) {
    const url = resolveUrl(firstTag(chunk, ["url"]), baseUrl);
    if (url) return url;
  }

  return "";
}

function parseDate(value) {
  if (!value) return null;
  const ms = Date.parse(stripHtml(value));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function isHeavyNews(item) {
  const text = normalize(`${item.title || ""} ${item.description || ""}`);
  if (HEAVY_HARD_BLOCK.some(term => text.includes(normalize(term)))) return true;
  const softHits = HEAVY_SOFT_BLOCK.reduce((n, term) => n + (text.includes(normalize(term)) ? 1 : 0), 0);
  return softHits >= 2;
}

function isRecent(item) {
  if (!item.pubDate) return true;
  const age = Date.now() - Date.parse(item.pubDate);
  return !Number.isFinite(age) || age <= MAX_AGE_HOURS * 60 * 60 * 1000;
}

function parseFeed(xml, feed) {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const entryBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  return blocks.slice(0, MAX_ITEMS_PER_FEED).map((block) => {
    const rawTitle = firstTag(block, ["title"]);
    const rawDescription = firstTag(block, ["description", "summary", "content", "content:encoded"]);
    const link = extractLink(block);
    const pubDate = parseDate(firstTag(block, ["pubDate", "published", "updated", "dc:date"]));
    const image = extractImage(block, link || feed.url);
    return {
      title: stripHtml(rawTitle),
      description: stripHtml(rawDescription),
      link,
      pubDate,
      image,
      hasImage: Boolean(image),
      source: feed.name,
      sourceDomain: (() => {
        try { return new URL(link || feed.url).hostname.replace(/^www\./, ""); }
        catch { return feed.name; }
      })()
    };
  }).filter(item => item.title && item.link && isRecent(item) && !isHeavyNews(item));
}

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": "PontoView-RSS/1.2 (+https://pontoview.com.br)",
        "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function dedupeAndSort(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const canonical = (item.link || "").replace(/[?#].*$/, "").toLowerCase();
    const titleKey = normalize(item.title).replace(/[^a-z0-9 ]/g, "").slice(0, 110);
    const key = canonical || titleKey;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((a,b) => (Date.parse(b.pubDate || 0) || 0) - (Date.parse(a.pubDate || 0) || 0)).slice(0, MAX_OUTPUT_ITEMS);
}

async function buildNewsResponse() {
  const results = await Promise.allSettled(FEEDS.map(async feed => {
    const xml = await fetchWithTimeout(feed.url);
    return { feed, items: parseFeed(xml, feed) };
  }));

  const items = [];
  const feeds = [];
  results.forEach((result, index) => {
    const feed = FEEDS[index];
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      const withImages = result.value.items.filter(item => item.hasImage).length;
      feeds.push({ name:feed.name, url:feed.url, ok:true, items:result.value.items.length, withImages });
    } else {
      feeds.push({ name:feed.name, url:feed.url, ok:false, items:0, withImages:0 });
    }
  });

  const news = dedupeAndSort(items);
  return {
    ok: news.length > 0,
    generatedAt: new Date().toISOString(),
    count: news.length,
    withImages: news.filter(item => item.hasImage).length,
    filtering: { heavyContent:true, maxAgeHours:MAX_AGE_HOURS },
    feeds,
    items: news
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status:204, headers:CORS_HEADERS });
    if (request.method !== "GET") return json({ ok:false, error:"Method not allowed" }, { status:405 });

    if (url.pathname === "/api/news") {
      try {
        const data = await buildNewsResponse();
        return json(data, { status:data.ok ? 200 : 503 });
      } catch (error) {
        return json({ ok:false, generatedAt:new Date().toISOString(), count:0, items:[], error:error instanceof Error ? error.message : "RSS aggregation failed" }, { status:500, headers:{ "cache-control":"no-store" } });
      }
    }

    if (url.pathname === "/health") {
      return json({ ok:true, service:"PontoView News RSS Worker", feeds:FEEDS.length, heavyFilter:true, imageExtraction:"media+enclosure+content+lazy-src+srcset" });
    }

    return json({ ok:true, service:"PontoView News RSS Worker", endpoints:["/api/news", "/health"] });
  }
};