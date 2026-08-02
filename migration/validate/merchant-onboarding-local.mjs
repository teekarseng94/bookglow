const apiUrl = process.env.BOOKGLOW_TEST_SUPABASE_URL;
const anonKey = process.env.BOOKGLOW_TEST_ANON_KEY;

if (!apiUrl || !anonKey) {
  throw new Error('Local Supabase test environment is incomplete.');
}

const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `BookGlow-${runId}!Aa9`;
const ownerEmail = `owner-${runId}@example.test`;
const memberEmail = `member-${runId}@example.test`;

async function request(path, { key = anonKey, token, method = 'GET', body, expected = 200 } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (response.status !== expected) {
    throw new Error(`${method} ${path}: expected ${expected}, received ${response.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

async function signUp(email) {
  const data = await request('/auth/v1/signup', { method: 'POST', body: { email, password } });
  if (!data?.access_token || !data?.user?.id) throw new Error(`Local signup did not return a session for ${email}.`);
  return { token: data.access_token, uid: data.user.id };
}

const validPayload = {
  accountType: 'create',
  businessName: `Phase 4 Wellness ${runId}`,
  website: 'https://phase4.example.test',
  businessCategories: ['Massage', 'Spa and wellness'],
  primaryBusinessCategory: 'Massage',
  serviceLocationType: 'physical',
  location: {
    addressDisplay: '12 Jalan Phase 4, Kuala Lumpur',
    country: 'Malaysia',
    timezone: 'Asia/Kuala_Lumpur',
  },
  teamSize: '2-5',
  previousSoftware: 'None',
  previousSoftwareOther: '',
};

const results = [];
const pass = (name) => results.push({ name, status: 'passed' });

// Unauthenticated completion must fail.
await request('/rest/v1/rpc/complete_merchant_onboarding', { method: 'POST', body: { payload: validPayload }, expected: 401 });
pass('unauthenticated completion rejected');

const owner = await signUp(ownerEmail);

await request('/rest/v1/merchant_onboarding_drafts', {
  token: owner.token, method: 'POST', expected: 201,
  body: { auth_user_id: owner.uid, current_step: 'categories', account_type: 'create', payload: validPayload },
});
const ownerDraft = await request(`/rest/v1/merchant_onboarding_drafts?auth_user_id=eq.${owner.uid}`, { token: owner.token });
if (ownerDraft?.length !== 1 || ownerDraft[0].current_step !== 'categories') throw new Error('Owner draft was not persisted.');
pass('authenticated draft save and resume');

const invalidPayload = { ...validPayload, businessName: '' };
await request('/rest/v1/rpc/complete_merchant_onboarding', { token: owner.token, method: 'POST', body: { payload: invalidPayload }, expected: 400 });
const invalidOutlets = await request(`/rest/v1/outlets?email=eq.${encodeURIComponent(ownerEmail)}`, { token: owner.token });
if (invalidOutlets.length !== 0) throw new Error('Invalid completion left a partial outlet.');
pass('invalid completion rolls back without partial outlet');

const completed = await request('/rest/v1/rpc/complete_merchant_onboarding', { token: owner.token, method: 'POST', body: { payload: { ...validPayload, outlet_id: 'attacker_selected' } } });
if (!completed?.outlet_id?.startsWith('outlet_') || completed.outlet_id === 'attacker_selected') throw new Error('Server did not generate Outlet_ID safely.');
pass('server-generated Outlet_ID ignores browser value');

const linkedUsers = await request(`/rest/v1/users?uid=eq.${owner.uid}`, { token: owner.token });
if (linkedUsers.length !== 1 || linkedUsers[0].outlet_id !== completed.outlet_id || linkedUsers[0].role !== 'admin') throw new Error('Owner mapping is incorrect.');
pass('owner linked to outlet as admin');

const outlets = await request(`/rest/v1/outlets?outlet_id=eq.${completed.outlet_id}`, { token: owner.token });
if (outlets.length !== 1 || outlets[0].settings?.primaryBusinessCategory !== 'Massage') throw new Error('Outlet onboarding values are incorrect.');
pass('outlet contains onboarding settings');

const retried = await request('/rest/v1/rpc/complete_merchant_onboarding', { token: owner.token, method: 'POST', body: { payload: validPayload } });
if (retried.outlet_id !== completed.outlet_id || retried.idempotent !== true) throw new Error('Completion retry was not idempotent.');
pass('completion is idempotent');

const member = await signUp(memberEmail);
const foreignDraft = await request(`/rest/v1/merchant_onboarding_drafts?auth_user_id=eq.${owner.uid}`, { token: member.token });
if (foreignDraft.length !== 0) throw new Error('Another user could read the owner draft.');
pass('draft RLS isolates users');

await request('/rest/v1/merchant_onboarding_drafts', {
  token: member.token, method: 'POST', body: { auth_user_id: owner.uid, current_step: 'software', payload: validPayload }, expected: 403,
});
pass('user cannot write another user draft');

await request('/rest/v1/rpc/accept_outlet_invitation', { token: member.token, method: 'POST', body: { invitation_token: 'invalid-token' }, expected: 400 });
pass('invalid invitation rejected');

const invitation = await request('/rest/v1/rpc/create_outlet_invitation', {
  token: owner.token, method: 'POST', body: { invitee_email: memberEmail, invitation_role: 'manager', valid_hours: 24 },
});
const accepted = await request('/rest/v1/rpc/accept_outlet_invitation', {
  token: member.token, method: 'POST', body: { invitation_token: invitation.invitation_token },
});
if (accepted.outlet_id !== completed.outlet_id || accepted.role !== 'manager') throw new Error('Invitation acceptance mapping is incorrect.');
pass('valid invitation assigns server-stored outlet and role');

await request('/rest/v1/rpc/accept_outlet_invitation', { token: member.token, method: 'POST', body: { invitation_token: invitation.invitation_token }, expected: 400 });
pass('invitation cannot be reused');

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
