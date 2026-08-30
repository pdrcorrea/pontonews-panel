const FEEDS = [
  {
    name: "G1",
    home: "https://g1.globo.com/",
    urls: [
      "https://g1.globo.com/rss/g1/",
      "https://g1.globo.com/dynamo/rss2.xml"
    ]
  },
  { name: "G1 • Espírito Santo", home: "https://g1.globo.com/es/espirito-santo/", urls: ["https://g1.globo.com/dynamo/espirito-santo/rss2.xml"] },
  { name: "G1 • Economia", home: "https://g1.globo.com/economia/", urls: ["https://g1.globo.com/rss/g1/economia", "https://g1.globo.com/dynamo/economia/rss2.xml"] },
  { name: "G1 • Educação", home: "https://g1.globo.com/educacao/", urls: ["https://g1.globo.com/rss/g1/educacao", "https://g1.globo.com/dynamo/educacao/rss2.xml"] },
  { name: "G1 • Ciência e Saúde", home: "https://g1.globo.com/ciencia-e-saude/", urls: ["https://g1.globo.com/rss/g1/ciencia-e-saude"] },
  { name: "G1 • Mundo", home: "https://g1.globo.com/mundo/", urls: ["https://g1.globo.com/rss/g1/mundo", "https://g1.globo.com/dynamo/mundo/rss2.xml"] },
  { name: "G1 • Turismo", home: "https://g1.globo.com/turismo-e-viagem/", urls: ["https://g1.globo.com/rss/g1/turismo-e-viagem", "https://g1.globo.com/dynamo/turismo-e-viagem/rss2.xml"] },

  { name: "UOL", home: "https://www.uol.com.br/", urls: ["https://rss.home.uol.com.br/index.xml", "http://rss.home.uol.com.br/index.xml"] },
  { name: "Folha de S.Paulo", home: "https://www.folha.uol.com.br/", urls: ["https://feeds.folha.uol.com.br/emcimadahora/rss091.xml"] },
  {
    name: "Estadão",
    home: "https://www.estadao.com.br/",
    urls: [
      "https://www.estadao.com.br/arc/outboundfeeds/rss/?outputType=xml",
      "https://www.estadao.com.br/rss/ultimas.xml",
      "http://www.estadao.com.br/rss/ultimas.xml"
    ]
  },
  { name: "R7 Notícias", home: "https://noticias.r7.com/", urls: ["https://noticias.r7.com/feed.xml"] },
  { name: "CNN Brasil", home: "https://www.cnnbrasil.com.br/", urls: ["https://www.cnnbrasil.com.br/feed/"] },
  { name: "Poder360", home: "https://www.poder360.com.br/", urls: ["https://www.poder360.com.br/feed/"] },
  { name: "DW Brasil", home: "https://www.dw.com/pt-br/", urls: ["https://rss.dw.com/rdf/rss-br-all"] },
  { name: "BBC News Brasil", home: "https://www.bbc.com/portuguese", urls: ["https://feeds.bbci.co.uk/portuguese/rss.xml"] },
  { name: "Agência Brasil", home: "https://agenciabrasil.ebc.com.br/", urls: ["https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml"] },
  { name: "Agência Brasil • Economia", home: "https://agenciabrasil.ebc.com.br/economia", urls: ["https://agenciabrasil.ebc.com.br/rss/economia/feed.xml"] },
  { name: "Agência Brasil • Educação", home: "https://agenciabrasil.ebc.com.br/educacao", urls: ["https://agenciabrasil.ebc.com.br/rss/educacao/feed.xml"] },
  { name: "Agência Brasil • Saúde", home: "https://agenciabrasil.ebc.com.br/saude", urls: ["https://agenciabrasil.ebc.com.br/rss/saude/feed.xml"] },
  { name: "Agência Brasil • Esportes", home: "https://agenciabrasil.ebc.com.br/esportes", urls: ["https://agenciabrasil.ebc.com.br/rss/esportes/feed.xml"] },
  { name: "InfoMoney", home: "https://www.infomoney.com.br/", urls: ["https://www.infomoney.com.br/feed/"] },
  { name: "Jornal de Brasília", home: "https://jornaldebrasilia.com.br/", urls: ["https://jornaldebrasilia.com.br/feed/"] }
];

const MAX_ITEMS_PER_FEED = 18;
const MAX_OUTPUT_ITEMS = 90;
const MAX_PER_SOURCE = 12;
const FETCH_TIMEOUT_MS = 9000;
const MAX_AGE_HOURS = 96;

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
  const direct = stripHtml(firstTag(block, ["link"]));
  if (/^https?:\/\//i.test(direct)) return direct;

  const atomLinks = block.match(/<link\b[^>]*>/gi) || [];
  for (const tag of atomLinks) {
    const href = attr(tag, "href");
    const rel = attr(tag, "rel");
    if (href && (!rel || rel === "alternate")) return href;
  }

  const guid = stripHtml(firstTag(block, ["guid", "id"]));
  return /^https?:\/\//i.test(guid) ? guid : "";
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
  const time = Date.parse(item.pubDate);
  if (!Number.isFinite(time)) return true;
  return Date.now() - time <= MAX_AGE_HOURS * 60 * 60 * 1000;
}

function parseFeed(xml, feed, usedUrl) {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const entryBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  return blocks.slice(0, MAX_ITEMS_PER_FEED).map((block) => {
    const rawTitle = firstTag(block, ["title"]);
    const rawDescription = firstTag(block, ["description", "summary", "content", "content:encoded"]);
    const link = extractLink(block);
    const pubDate = parseDate(firstTag(block, ["pubDate", "published", "updated", "dc:date"]));
    const image = extractImage(block, link || feed.home || usedUrl);
    const sourceDomain = (() => {
      try { return new URL(link || feed.home || usedUrl).hostname.replace(/^www\./, ""); }
      catch { return ""; }
    })();

    return {
      title: stripHtml(rawTitle),
      description: stripHtml(rawDescription),
      link,
      hasLink: Boolean(link),
      pubDate,
      image,
      hasImage: Boolean(image),
      source: feed.name,
      sourceHome: feed.home || "",
      sourceDomain
    };
  }).filter(item => item.title && isRecent(item) && !isHeavyNews(item));
}

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "PontoView-RSS/2.0 (+https://pontoview.com.br)",
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

async function fetchFeed(feed) {
  const errors = [];
  for (const url of feed.urls) {
    try {
      const xml = await fetchWithTimeout(url);
      const items = parseFeed(xml, feed, url);
      if (items.length) return { items, usedUrl:url, errors };
      errors.push(`${url}: sem itens válidos`);
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : "falha"}`);
    }
  }
  return { items:[], usedUrl:feed.urls[0], errors };
}

function dedupe(items) {
  const seenLinks = new Set();
  const seenTitles = new Set();
  const out = [];

  for (const item of items) {
    const canonical = (item.link || "").replace(/[?#].*$/, "").toLowerCase();
    const titleKey = normalize(item.title).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
    if (canonical && seenLinks.has(canonical)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;
    if (canonical) seenLinks.add(canonical);
    if (titleKey) seenTitles.add(titleKey);
    out.push(item);
  }
  return out;
}

function balancedSort(items) {
  const sorted = [...items].sort((a,b) => (Date.parse(b.pubDate || 0) || 0) - (Date.parse(a.pubDate || 0) || 0));
  const groups = new Map();

  for (const item of sorted) {
    if (!groups.has(item.source)) groups.set(item.source, []);
    const group = groups.get(item.source);
    if (group.length < MAX_PER_SOURCE) group.push(item);
  }

  const queues = [...groups.values()].filter(q => q.length);
  const out = [];
  while (queues.length && out.length < MAX_OUTPUT_ITEMS) {
    queues.sort((a,b) => (Date.parse(b[0]?.pubDate || 0) || 0) - (Date.parse(a[0]?.pubDate || 0) || 0));
    for (let i = 0; i < queues.length && out.length < MAX_OUTPUT_ITEMS; i++) {
      const item = queues[i].shift();
      if (item) out.push(item);
    }
    for (let i = queues.length - 1; i >= 0; i--) if (!queues[i].length) queues.splice(i, 1);
  }
  return out;
}

async function buildNewsResponse() {
  const results = await Promise.allSettled(FEEDS.map(async feed => ({ feed, ...(await fetchFeed(feed)) })));
  const items = [];
  const feeds = [];

  results.forEach((result, index) => {
    const feed = FEEDS[index];
    if (result.status === "fulfilled") {
      const feedItems = result.value.items;
      items.push(...feedItems);
      feeds.push({
        name: feed.name,
        ok: feedItems.length > 0,
        usedUrl: result.value.usedUrl,
        items: feedItems.length,
        withImages: feedItems.filter(item => item.hasImage).length,
        withLinks: feedItems.filter(item => item.hasLink).length,
        errors: result.value.errors
      });
    } else {
      feeds.push({ name:feed.name, ok:false, usedUrl:feed.urls[0], items:0, withImages:0, withLinks:0, errors:["falha inesperada"] });
    }
  });

  const news = balancedSort(dedupe(items));
  return {
    ok: news.length > 0,
    generatedAt: new Date().toISOString(),
    count: news.length,
    sources: new Set(news.map(item => item.source)).size,
    withImages: news.filter(item => item.hasImage).length,
    withLinks: news.filter(item => item.hasLink).length,
    filtering: { heavyContent:true, maxAgeHours:MAX_AGE_HOURS, balancedSources:true },
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
      return json({
        ok:true,
        service:"PontoView News RSS Worker",
        feeds:FEEDS.length,
        heavyFilter:true,
        acceptsItemsWithoutLink:true,
        imageExtraction:"media+enclosure+content+lazy-src+srcset"
      });
    }

    return json({ ok:true, service:"PontoView News RSS Worker", endpoints:["/api/news", "/health"] });
  }
};