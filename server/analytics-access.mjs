function allowlist(){
  return new Set(String(process.env.ANALYTICS_EMAILS||'').split(/[,;\s]+/).map(value=>value.trim().toLowerCase()).filter(Boolean));
}

export function canViewAnalytics(email){
  return allowlist().has(String(email||'').trim().toLowerCase());
}
