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

export function getFaviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}
