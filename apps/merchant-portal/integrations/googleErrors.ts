const UNAVAILABLE =
  "Google Reviews could not be reached right now. Please try again in a moment.";

/** Maps Google / transport failures to merchant-safe copy. Never surfaces raw API JSON. */
export function merchantGoogleError(message: string | null | undefined, fallback = UNAVAILABLE): string {
  const raw = String(message || "").trim();
  if (!raw) return fallback;
  if (/GOOGLE_PLACES_API_KEY|Places is not configured/i.test(raw)) {
    return "Google Places is not configured yet. An administrator needs to add GOOGLE_PLACES_API_KEY on the BookGlow server.";
  }
  if (
    /Places is not available|Places API key and billing|Places API \(New\) has not been used|places\.googleapis\.com/i.test(
      raw,
    )
  ) {
    return "Google Places API (New) is not enabled yet. Enable it in Google Cloud for this project, wait a few minutes, then try again.";
  }
  if (
    /[{[]/.test(raw) ||
    /quota|PERMISSION_DENIED|SERVICE_DISABLED|insufficient|not configured|\b429\b|\b403\b|\b502\b|\b503\b/i.test(raw)
  ) {
    return UNAVAILABLE;
  }
  if (/cancelled|access_denied|access was denied/i.test(raw)) return "Google connection was cancelled.";
  if (/expired|reconnect/i.test(raw)) return "Google authorization expired. Reconnect to keep showing reviews.";
  if (/no business|no location|were found/i.test(raw)) {
    return "No Google Business Profiles were found for this account.";
  }
  return raw;
}

export function googleRedirectNotice(status: string | null, detail: string | null): {
  notice?: string;
  error?: string;
  openSelector?: boolean;
} {
  if (!status) return {};
  if (status === "select_location") {
    return { notice: "Google is authorized. Choose the business location to show.", openSelector: true };
  }
  if (status === "cancelled") {
    return { error: "Google connection was cancelled." };
  }
  if (status === "setup_required") {
    return { error: detail || "Google Business Profile is not configured on the server yet." };
  }
  return { error: merchantGoogleError(detail, "Google authorization did not complete.") };
}
