export function normalizeNavigationUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  // Block dangerous URI schemes that could execute scripts
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Allow localhost and IP addresses without dots
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) {
    return `http://${trimmed}`;
  }
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function tabTitleFromUrl(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url || "Loading…";
  }
}

export function urlsEquivalent(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}
