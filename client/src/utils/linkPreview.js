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

  const embed = getVideoEmbed(safeUrl);
  if (embed) {
    clearTimeout(timeout);
    return { siteTitle: embed.title, description: null, previewImageUrl: null, faviconUrl: embed.faviconUrl };
  }

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

// TikTok, Instagram and Facebook give no title or cover without a lookup service or a Meta app token,
// so the title comes from the URL and the card shows the site's official embed player as the thumbnail.
// shortcut: vm.tiktok.com and instagram share short links carry no id, so they get the generic preview.
export function getVideoEmbed(url) {
  try {
    const { hostname, pathname, searchParams } = new URL(url);
    const isHost = (domain) => hostname === domain || hostname.endsWith(`.${domain}`);

    if (isHost('tiktok.com')) {
      const match = pathname.match(/^\/@([\w.-]+)\/video\/(\d+)/);
      if (!match) return null;
      return {
        site: 'tiktok',
        title: `@${match[1]} on TikTok`,
        src: `https://www.tiktok.com/player/v1/${match[2]}?controls=0&play_button=0&progress_bar=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0`,
        faviconUrl: 'https://www.tiktok.com/favicon.ico',
      };
    }

    if (isHost('instagram.com')) {
      // Also matches the newer /username/reel/CODE form.
      const match = pathname.match(/^\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)/);
      if (!match) return null;
      const kind = match[1] === 'p' ? 'p' : 'reel';
      return {
        site: 'instagram',
        title: kind === 'p' ? 'Instagram post' : 'Instagram reel',
        src: `https://www.instagram.com/${kind}/${match[2]}/embed/`,
        faviconUrl: 'https://www.instagram.com/favicon.ico',
      };
    }

    if (isHost('facebook.com') || isHost('fb.watch')) {
      const isVideo = isHost('fb.watch')
        || /^\/(reel|watch|share\/[rv])\b/.test(pathname)
        || /\/videos\//.test(pathname)
        || (pathname.startsWith('/watch') && searchParams.has('v'));
      if (!isVideo) return null;
      return {
        site: 'facebook',
        title: pathname.startsWith('/reel') || pathname.startsWith('/share/r') ? 'Facebook reel' : 'Facebook video',
        src: `https://www.facebook.com/plugins/video.php?${new URLSearchParams({ href: url, show_text: 'false' })}`,
        faviconUrl: 'https://www.facebook.com/favicon.ico',
      };
    }
    return null;
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

export function getOwnFaviconUrl(url) {
  try {
    return new URL('/favicon.ico', url).toString();
  } catch {
    return null;
  }
}

export function getFaviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}

// Saved on the user's profile; localStorage is a per-browser cache so cards render right before the profile loads.
export const SHOW_DOMAINS_KEY = "linkboard:show-domains";
export const readShowDomains = () => {
  try { return localStorage.getItem(SHOW_DOMAINS_KEY) !== "0"; } catch { return true; }
};
export const cacheShowDomains = (value) => {
  try { localStorage.setItem(SHOW_DOMAINS_KEY, value === false ? "0" : "1"); } catch { /* storage blocked */ }
};
