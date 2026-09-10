const ANALYTICS_EMAILS=new Set(['owner@example.com','ops@example.com']);

export function canViewAnalytics(email){
  return ANALYTICS_EMAILS.has(String(email||'').trim().toLowerCase());
}
