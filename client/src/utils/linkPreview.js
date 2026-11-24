const safeHttpUrl = (value) => {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

// Metadata is fetched from the browser so LinkBoard's API never fetches
// arbitrary user URLs. Preview failure is non-fatal; the saved link still works.
export async function fetchLinkPreview(url) {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return {};

  const params = new URLSearchParams({
    url: safeUrl,
    filter: 'title,description,image.url,logo.url',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    // YouTube's own oEmbed is free and CORS-enabled, so video titles don't depend on Microlink's rate limit.
    if (getYouTubeId(safeUrl)) {
      const response = await fetch(`https://www.youtube.com/oembed?${new URLSearchParams({ url: safeUrl, format: 'json' })}`, { signal: controller.signal });
      const data = response.ok ? await response.json() : {};
      if (typeof data.title === 'string') return { siteTitle: data.title.slice(0, 300), description: null, previewImageUrl: safeHttpUrl(data.thumbnail_url), faviconUrl: 'https://www.youtube.com/favicon.ico' };
    }
    const response = await fetch(`https://api.microlink.io/?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) return {};
    const result = await response.json();
    if (result.status !== 'success' || !result.data) return {};

    return {
      siteTitle: typeof result.data.title === 'string' ? result.data.title.slice(0, 300) : null,
      description: typeof result.data.description === 'string' ? result.data.description.slice(0, 1000) : null,
      previewImageUrl: safeHttpUrl(result.data.image?.url),
      faviconUrl: safeHttpUrl(result.data.logo?.url),
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

// Turns what people type ("github.com", "https://x.dev/a") into the same http(s) URL string the API stores.
// Returns null for anything that is not a web address with a dotted host.
export function normalizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

// YouTube serves thumbnails at a fixed address, so video links get a preview without any lookup service.
export function getYouTubeId(url) {
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    const host = hostname.replace(/^(www\.|m\.|music\.)/, '');
    let id = null;
    if (host === 'youtu.be') id = pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = searchParams.get('v') || pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1] || null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const getYouTubeThumbnail = (url) => {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
};

export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// "www.taxumo.com" -> "Taxumo", "docs.google.com" -> "Google", "bbc.co.uk" -> "Bbc"
export function getSiteName(url) {
  const labels = getDomain(url).split('.');
  if (labels.length < 2) return labels[0] || '';
  labels.pop();
  // Drop second-level suffixes like the "co" in .co.uk or the "edu" in .edu.ph.
  if (labels.length > 1 && /^(co|com|edu|gov|ac|org|net)$/.test(labels.at(-1))) labels.pop();
  const name = labels.at(-1);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getFaviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}
