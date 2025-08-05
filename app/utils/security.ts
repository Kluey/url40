// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const clientData = rateLimiter.get(ip);

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (clientData.count >= maxRequests) {
    return false;
  }

  clientData.count++;
  return true;
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
