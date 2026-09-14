-- Edge Functions use the service role client. Table owners kept DML, and RLS
-- policies named service_role, but privilege GRANT was never applied on these
-- tables. Without GRANT, service_role cannot read users/platform_admins and
-- platform-admin checks collapse into 403s that look like authorization failures.

GRANT ALL ON TABLE
  public.users,
  public.platform_admins,
  public.outlets,
  public.outlet_members,
  public.profiles,
  public.outlet_subscriptions,
  public.billing_customers,
  public.billing_events,
  public.platform_audit_events,
  public.platform_monitoring_events,
  public.marketing_campaigns,
  public.marketing_audiences,
  public.clients,
  public.outlet_invitations,
  public.audit_logs
TO service_role;
