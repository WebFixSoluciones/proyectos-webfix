/**
 * Microservicio de Dominio Backend — Seguridad de Correos y Anti-SSRF / Anti-XSS.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_ATTACHMENT_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com'
];

/**
 * Valida que una URL de adjunto o enlace sea HTTPS seguro y nunca apunte a IPs privadas,
 * localhost, metadatos cloud (169.254.169.254) ni esquemas peligrosos (`file://`, `javascript:`).
 */
export function isSafeExternalUrl(rawUrl, { restrictToStorage = false } = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:application/pdf;base64,') || trimmed.startsWith('data:text/xml;base64,')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    // Bloquear localhost e IPs privadas / metadata
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return false;
    }
    if (restrictToStorage) {
      return SAFE_ATTACHMENT_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
    }
    return true;
  } catch {
    return false;
  }
}
