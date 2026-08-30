const FEEDS = [
  {
    name: "G1",
    url: "https://g1.globo.com/rss/g1/"
  },
  {
    name: "G1 Espírito Santo",
    url: "https://g1.globo.com/dynamo/espirito-santo/rss2.xml"
  },
  {
    name: "Agência Brasil",
    url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml"
  },
  {
    name: "BBC News Brasil",
    url: "https://feeds.bbci.co.uk/portuguese/rss.xml"
  }
];

const MAX_ITEMS_PER_FEED = 14;
const MAX_OUTPUT_ITEMS = 48;
const FETCH_TIMEOUT_MS = 8000;

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
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " "
  };

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

function extractImage(block, description = "") {
  const mediaTags = block.match(/<(?:media:content|media:thumbnail)\b[^>]*>/gi) || [];
  for (const tag of mediaTags) {
    const url = attr(tag, "url");
    const type = attr(tag, "type");
    if (url && (!type || type.startsWith("image/"))) return url;
  }

  const enclosureTags = block.match(/<enclosure\b[^>]*>/gi) || [];
  for (const tag of enclosureTags) {
    const url = attr(tag, "url");
    const type = attr(tag, "type");
    if (url && (!type || type.startsWith("image/"))) return url;
  }

  const html = decodeEntities(description || firstTag(block, ["content:encoded", "description", "summary", "content"]));
  const img = html.match(/<img\b[^>]*src=["']([^"']+)["']/i);
  return img ? decodeEntities(img[1]) : "";
}

function parseDate(value) {
  if (!value) return null;
  const ms = Date.parse(stripHtml(value));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
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

    return {
      title: stripHtml(rawTitle),
      description: stripHtml(rawDescription),
      link,
      pubDate,
      image: extractImage(block, rawDescription),
      source: feed.name,
      sourceDomain: (() => {
        try { return new URL(link || feed.url).hostname.replace(/^www\./, ""); }
        catch { return feed.name; }
      })()
    };
  }).filter((item) => item.title && item.link);
}

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": "PontoView-RSS/1.0 (+https://pontoview.com.br)",
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
    const key = (item.link || item.title).toLowerCase().replace(/\?.*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out
    .sort((a, b) => {
      const da = a.pubDate ? Date.parse(a.pubDate) : 0;
      const db = b.pubDate ? Date.parse(b.pubDate) : 0;
      return db - da;
    })
    .slice(0, MAX_OUTPUT_ITEMS);
}

async function buildNewsResponse() {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const xml = await fetchWithTimeout(feed.url);
      return { feed, items: parseFeed(xml, feed) };
    })
  );

  const items = [];
  const feeds = [];

  results.forEach((result, index) => {
    const feed = FEEDS[index];
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      feeds.push({ name: feed.name, url: feed.url, ok: true, items: result.value.items.length });
    } else {
      feeds.push({ name: feed.name, url: feed.url, ok: false, items: 0 });
    }
  });

  const news = dedupeAndSort(items);

  return {
    ok: news.length > 0,
    generatedAt: new Date().toISOString(),
    count: news.length,
    feeds,
    items: news
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return json({ ok: false, error: "Method not allowed" }, { status: 405 });
    }

    if (url.pathname === "/api/news") {
      try {
        const data = await buildNewsResponse();
        return json(data, { status: data.ok ? 200 : 503 });
      } catch (error) {
        return json({
          ok: false,
          generatedAt: new Date().toISOString(),
          count: 0,
          items: [],
          error: error instanceof Error ? error.message : "RSS aggregation failed"
        }, { status: 500, headers: { "cache-control": "no-store" } });
      }
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "PontoView News RSS Worker", feeds: FEEDS.length });
    }

    return json({
      ok: true,
      service: "PontoView News RSS Worker",
      endpoints: ["/api/news", "/health"]
    });
  }
};
