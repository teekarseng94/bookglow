import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const api = 'http://127.0.0.1:55431';
const container = 'supabase_db_bookglow-local';
export function sql(query) {
  return execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: query, encoding: 'utf8' }).trim();
}
export function localConfig() {
  const executable = path.join(root, 'node_modules/@supabase/cli-windows-x64/bin/supabase.exe');
  const config = JSON.parse(execFileSync(executable, ['status', '--workdir', path.join(root, 'migration'), '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(config.API_URL, api, 'Refusing any non-local Supabase API');
  const db = new URL(config.DB_URL);
  assert.equal(db.hostname, '127.0.0.1');
  assert.equal(db.port, '55432');
  assert.equal(sql("select count(*) from auth.users where email not like '%@example.test';"), '0', 'Refusing a database with non-fixture identities');
  return config;
}
export async function makeFixture() {
  const config = localConfig();
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `Local-only-${randomUUID()}!aA9`;
  const prefix = `phase1_${suffix}`;
  const outlet = `${prefix}_a`, other = `${prefix}_b`;
  async function request(route, { token, method = 'GET', body, admin = false } = {}) {
    assert.ok(route.startsWith('/'));
    const response = await fetch(api + route, { method, headers: {
      apikey: config.ANON_KEY, Authorization: `Bearer ${admin ? config.SERVICE_ROLE_KEY : token || config.ANON_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    const raw = await response.text();
    return { status: response.status, data: raw ? JSON.parse(raw) : null };
  }
  const identities = {};
  for (const role of ['admin', 'owner', 'manager', 'customer']) {
    const email = `${prefix}-${role}@example.test`;
    const created = await request('/auth/v1/admin/users', { admin: true, method: 'POST', body: { email, password, email_confirm: true, user_metadata: { full_name: `Phase1 ${role} ${suffix}` } } });
    assert.equal(created.status, 200, `create ${role}: ${JSON.stringify(created.data)}`);
    const login = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    assert.equal(login.status, 200);
    identities[role] = { id: created.data.id, email, token: login.data.access_token };
  }
  const { admin, owner, manager } = identities;
  const caseId = randomUUID(), operation = randomUUID(), audit = randomUUID();
  sql(`begin;
    insert into public.platform_admins(user_id) values ('${admin.id}');
    insert into public.outlets(outlet_id,name,owner_user_id,onboarding_status,booking_slug,timezone,email,business_hours)
      values ('${outlet}','Phase1 Alpha ${suffix}','${owner.id}','complete','${outlet}','Asia/Kuala_Lumpur','${owner.email}','{"monday":{"isOpen":true,"open":"09:00","close":"18:00"}}'),
             ('${other}','Phase1 Beta ${suffix}',null,'complete','${other}','Asia/Kuala_Lumpur','${owner.email}',null);
    insert into public.outlet_members(outlet_id,user_id,role) values ('${outlet}','${owner.id}','owner'),('${outlet}','${manager.id}','manager');
    insert into public.users(uid,email,display_name,outlet_id,role) values
      ('${owner.id}','${owner.email}','Phase1 Owner ${suffix}','${outlet}','admin'),
      ('${manager.id}','${manager.email}','Phase1 Manager ${suffix}','${outlet}','manager')
      on conflict(uid) do update set outlet_id=excluded.outlet_id,role=excluded.role,display_name=excluded.display_name;
    insert into public.appointments(id,outlet_id,date,time,status) values ('${prefix}_booking','${outlet}','2026-09-18','10:00','scheduled');
    insert into public.transactions(id,outlet_id,type,status,amount) values ('${prefix}_sale','${outlet}','sale','completed',25);
    insert into public.platform_support_cases(id,outlet_id,category,priority,subject,description,created_by)
      values ('${caseId}','${outlet}','other','normal','Phase1 isolated case','private-fixture-description','${admin.id}');
    insert into public.platform_admin_operations(id,action,target_id,outlet_id,actor_uid,state,result)
      values ('${operation}','phase1 verification','${outlet}','${outlet}','${admin.id}','succeeded','{"private":"private-fixture-operation"}');
    insert into public.platform_audit_events(id,outlet_id,action,affected_target,actor_uid,metadata,source)
      values ('${audit}','${outlet}','phase1 verification','${outlet}','${admin.id}','{"private":"private-fixture-audit"}','local-test');
    insert into public.outlet_subscriptions(id,outlet_id,status,unit_amount,currency,recurring_interval,interval_count,quantity,mrr_reliable,hitpay_recurring_id)
      values ('${prefix}_sub','${outlet}','active',2500,'myr','month',1,1,true,'private-fixture-provider-id');
    commit;`);
  const rpc = (role, name, body = {}) => request(`/rest/v1/rpc/${name}`, { token: identities[role]?.token, method: 'POST', body });
  return { config, prefix, suffix, outlet, other, caseId, operation, audit, password, identities, request, rpc };
}

export async function verifyDatabase(f) {
  let assertions = 0;
  const check = (condition, message) => { assert.ok(condition, message); assertions++; };
  const search = await f.rpc('admin', 'platform_global_search', { p_query: f.prefix, p_limit_per_group: 10 });
  check(search.status === 200, `Admin search: ${JSON.stringify(search.data)}`);
  for (const type of ['outlet', 'booking', 'sale']) check(search.data.results.some(r => r.entity_type === type), `${type} found`);
  const inspector = await f.rpc('admin', 'platform_outlet_inspector', { p_outlet_id: f.outlet });
  check(inspector.status === 200 && inspector.data.summary.outlet_id === f.outlet, 'Inspector exact outlet');
  check(inspector.data.accounts.length === 2 && inspector.data.accounts.every(a => [f.identities.owner.id, f.identities.manager.id].includes(a.id)), 'Outlet-scoped accounts');
  check(inspector.data.billing.unit_amount === 2500, 'Authoritative billing');
  check(!JSON.stringify(inspector.data).includes('private-fixture'), 'Inspector provider/private metadata redacted');
  for (const [id, type] of [[f.caseId,'support_case'],[f.operation,'operation'],[f.audit,'audit']]) {
    const found = await f.rpc('admin','platform_global_search',{p_query:id});
    check(found.status === 200 && found.data.results.some(r => r.entity_type === type && r.entity_id === id && r.outlet_id === f.outlet), `${type} exact outlet`);
    check(!JSON.stringify(found.data).includes('private-fixture'), `${type} redacted`);
    check(found.data.results.every(r => Object.keys(r).sort().join(',') === ['entity_type','entity_id','title','matched_text','outlet_id','outlet_name','status','occurred_at'].sort().join(',')), 'Search allowlist');
  }
  for (const role of ['owner','manager','customer','anonymous']) {
    for (const [name, args] of [
      ['platform_global_search',{p_query:f.prefix}], ['platform_outlet_inspector',{p_outlet_id:f.outlet}],
      ['platform_support_case_detail',{p_case_id:f.caseId}], ['platform_support_cases_page',{}],
      ['platform_operations_overview',{p_start_date:'2026-09-01',p_end_date:'2026-09-30'}],
      ['platform_onboarding_page',{}], ['platform_integrations_page',{}], ['platform_jobs_page',{}],
      ['platform_set_outlet_access',{p_outlet_id:f.outlet,p_enabled:false,p_reason:'Unauthorized fixture attempt'}],
      ['platform_remote_access',{p_outlet_id:f.outlet,p_action:'enter'}],
      ['platform_update_support_case',{p_case_id:f.caseId,p_action:'note',p_note:'Unauthorized fixture note'}],
    ]) {
      const result = await f.rpc(role,name,args);
      check(result.status >= 400 && !['PGRST202','PGRST203'].includes(result.data?.code), `${role} denied ${name}: ${JSON.stringify(result.data)}`);
    }
    for (const table of ['platform_account_controls','platform_admin_operations','platform_audit_events','platform_support_cases','platform_support_case_events','billing_events']) {
      const result = await f.request(`/rest/v1/${table}?select=*`, {token:f.identities[role]?.token});
      check(result.status >= 400 || result.data.length === 0, `${role} private ${table}`);
    }
  }
  const limited = await f.rpc('admin','platform_global_search',{p_query:'Phase1',p_limit_per_group:1});
  check(limited.status === 200 && Object.values(Object.groupBy(limited.data.results,r=>r.entity_type)).every(rows=>rows.length<=1),'Per-group lower limit');
  const capped = await f.rpc('admin','platform_global_search',{p_query:'Phase1',p_limit_per_group:1000});
  check(capped.data.limit_per_group===10 && Object.values(Object.groupBy(capped.data.results,r=>r.entity_type)).every(rows=>rows.length<=10),'Upper limit clamp');
  const wildcard = await f.rpc('admin','platform_global_search',{p_query:'%%'});
  check(wildcard.data.results.length===0,'LIKE metacharacters escaped');
  const short = await f.rpc('admin','platform_global_search',{p_query:'a'});
  check(short.data.results.length===0,'Minimum search length');
  check(sql("select count(*) from pg_indexes where schemaname='public' and indexname in ('idx_outlets_name_trgm','idx_users_email_trgm','idx_users_display_name_trgm','idx_appointments_reference_prefix','idx_transactions_reference_prefix','idx_monitoring_correlation_prefix');")==='6','Six search indexes exist');
  const suspended = await f.rpc('admin','platform_set_outlet_access',{p_outlet_id:f.outlet,p_enabled:false,p_reason:'Local verification only'});
  check(suspended.status===200,'Admin outlet suspension');
  check((await f.rpc('owner','resolve_merchant_access')).data.state==='outlet_suspended','Existing session observes outlet suspension');
  await f.rpc('admin','platform_set_outlet_access',{p_outlet_id:f.outlet,p_enabled:true,p_reason:'Restore local fixture'});
  const missing = await f.rpc('admin','platform_remote_access',{p_outlet_id:'phase1_missing',p_action:'enter'});
  check(missing.status>=400,'Remote selection validated');
  const cross = await f.rpc('admin','platform_add_support_reference',{p_case_id:f.caseId,p_type:'booking',p_reference_id:'appt_local_authz_1'});
  check(cross.status>=400,'Cross-outlet support reference denied');
  const mutation = await f.request(`/rest/v1/platform_audit_events?id=eq.${f.audit}`,{token:f.identities.owner.token,method:'PATCH',body:{reason:'tamper'}});
  check(mutation.status>=400 || mutation.data.length===0,'Unauthorized audit mutation denied');
  check(sql(`select coalesce(reason,'')='tamper' from public.platform_audit_events where id='${f.audit}';`)==='f','Audit remains unchanged');
  console.log(`PASS: ${assertions} real local database authorization assertions (${f.prefix}); fixtures retained in disposable local database.`);
  return assertions;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyDatabase(await makeFixture());
}
