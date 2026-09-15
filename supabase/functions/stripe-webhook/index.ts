import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() =>
  new Response(
    JSON.stringify({ error: "Stripe billing has been replaced by HitPay. Use /functions/v1/hitpay-webhook." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
