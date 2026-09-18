import { expect, test } from '@playwright/test';
import { makeFixture, verifyDatabase } from '../../../../migration/validate/superadmin-phase1-local.mjs';
let f;
test.beforeAll(async () => { f=await makeFixture(); await verifyDatabase(f); });
test.beforeEach(async ({context,page}) => {
  // Real local responses only. Never reuse production auth or contact hosted services.
  await context.route('**/*',route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill(f.identities.admin.email);
  await page.getByLabel('Password',{exact:true}).fill(f.password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/\/admin/,{timeout:30000});
});
async function search(page,query) {
  const opener=page.getByRole('button',{name:'Open global platform search'});
  if(page.viewportSize().width<640) await opener.click();
  const input=page.getByRole('searchbox',{name:'Global platform search'}).filter({visible:true});
  await input.fill(query); return input;
}
async function noOverflow(page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const dialog=page.getByRole('dialog');
  if(await dialog.count()) expect(await dialog.first().evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
}
for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,1000]]) {
  test(`authenticated search and inspector at ${width}x${height}`,async({page},info)=>{
    await page.setViewportSize({width,height}); await search(page,f.suffix);
    await expect(page.getByRole('heading',{name:'Outlets',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Merchant accounts',exact:true})).toBeVisible();
    await noOverflow(page); await page.screenshot({path:info.outputPath(`search-${width}.png`)});
    await page.getByRole('option',{name:new RegExp(`Phase1 Alpha ${f.suffix}`)}).first().click();
    const dialog=page.getByRole('dialog');
    await expect(dialog.locator('.m-modal-desc')).toBeVisible();
    await expect(dialog.getByText('Asia/Kuala_Lumpur',{exact:true})).toBeVisible();
    const box=await dialog.boundingBox(); expect(box.width).toBeLessThanOrEqual(width);
    if(width<640) {expect(box.y).toBe(0); expect(box.height).toBe(height);}
    else if(width===1440) expect(box.x).toBeGreaterThan(0);
    for(const tab of ['Onboarding','Accounts','Billing','Integrations','Support','Audit','Summary']) {
      await dialog.getByRole('tab',{name:tab,exact:true}).click();
      await expect(page).toHaveURL(new RegExp(`inspectTab=${tab.toLowerCase()}`)); await noOverflow(page);
    }
    await page.screenshot({path:info.outputPath(`inspector-${width}.png`)});
    await page.reload(); await expect(dialog.locator('.m-modal-desc')).toContainText(f.outlet);
    await dialog.getByRole('button',{name:'Close',exact:true}).focus(); await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await search(page,'no-matching-fixture-zzzz');
    await expect(page.getByText('No matching records were found.').filter({visible:true})).toBeVisible();
    await page.keyboard.press('Escape');
  });
}
test('exact destinations, outlet switching, back and error recovery',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await search(page,f.identities.owner.email); await page.getByRole('listbox',{name:'Global search results'}).filter({visible:true}).getByRole('option').first().click();
  await expect(page).toHaveURL(/inspectTab=accounts/);
  await expect(page.getByRole('dialog').getByText(f.identities.owner.email,{exact:false}).first()).toBeVisible();
  await page.keyboard.press('Escape');
  for(const [id,url] of [[f.caseId,/\/admin\/support\?case=/],[f.operation,/\/admin\/integrations-jobs\?tab=jobs&operation=/],[f.audit,/\/admin\/audit\?event=/]]) {
    await search(page,id); await page.getByRole('listbox',{name:'Global search results'}).filter({visible:true}).getByRole('option').first().click(); await expect(page).toHaveURL(url); expect(page.url()).toContain(id);
    if(id===f.caseId) {
      await expect(page.getByRole('dialog').locator('.m-modal-desc')).toContainText(f.caseId);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    if(id===f.operation) await expect(page.getByText(new RegExp(f.operation)).first()).toBeVisible();
  }
  await page.goto(`/admin/dashboard?inspectOutlet=${f.other}&inspectTab=summary`);
  await expect(page.getByRole('dialog').locator('.m-modal-desc')).toContainText(f.other);
  await expect(page.getByRole('dialog').getByText('No recent server-backed activity is available.')).toBeVisible();
  await page.goto(`/admin/dashboard?inspectOutlet=${f.outlet}&inspectTab=summary`);
  await expect(page.getByRole('dialog').locator('.m-modal-desc')).toContainText(f.outlet);
  await page.goBack(); await expect(page.getByRole('dialog').locator('.m-modal-desc')).toContainText(f.other);
  await page.goto('/admin/dashboard?inspectOutlet=phase1_missing&inspectTab=summary');
  await expect(page.getByRole('dialog').getByText(/could not be loaded|Outlet not found/i)).toBeVisible();
});
test('booking and sale open validated remote access',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  for(const [kind,route] of [['booking','schedule'],['sale','transactions']]) {
    await page.goto('/admin'); await search(page,`${f.prefix}_${kind}`); await page.getByRole('listbox',{name:'Global search results'}).filter({visible:true}).getByRole('option').first().click();
    await expect(page).toHaveURL(new RegExp(`/${route}\\?record=${f.prefix}_${kind}`));
    await expect(page.getByText(/Remote access/i).first()).toBeVisible();
    await expect(page.getByText(`Phase1 Alpha ${f.suffix}`,{exact:false}).first()).toBeVisible();
    if(kind==='sale') {
      await expect(page.getByRole('heading',{name:'Transaction Details',exact:true})).toBeVisible();
      await expect(page.getByText(`Transaction ID: ${f.prefix}_sale`,{exact:true})).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await page.getByRole('button',{name:'Exit to superadmin'}).click();
    await expect(page).toHaveURL(/\/admin/);
    expect(await page.evaluate(()=>sessionStorage.getItem('bookglow_platform_remote_outlet'))).toBeNull();
  }
});

test('real-response loading, failed search, focus restoration and busy confirmation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await search(page,f.suffix);
  const searchDialog=page.getByRole('dialog',{name:'Global platform search',exact:true});
  await expect(searchDialog).toBeVisible();
  await searchDialog.getByRole('button',{name:'Close global platform search'}).focus();
  await page.keyboard.press('Tab');
  await expect(searchDialog.getByRole('searchbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Open global platform search'})).toBeFocused();
  const searchRoute='**/rest/v1/rpc/platform_global_search';
  await page.route(searchRoute,route=>route.abort('failed'));
  await search(page,'network-failure');
  await expect(page.getByText('Search unavailable').filter({visible:true})).toBeVisible();
  await page.unroute(searchRoute);
  await page.keyboard.press('Escape');
  let releaseLoad;
  const loadGate=new Promise(resolve=>{releaseLoad=resolve;});
  const inspectorRoute='**/rest/v1/rpc/platform_outlet_inspector';
  await page.route(inspectorRoute,async route=>{await loadGate; await route.continue();});
  await page.goto(`/admin/subscribers?outlet=${f.outlet}`);
  await expect(page.getByRole('dialog').locator('[aria-busy="true"]')).toBeVisible();
  releaseLoad();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Suspend access',exact:true})).toBeVisible();
  await page.unroute(inspectorRoute);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('outlet')).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Outlets & access'})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(`/admin/dashboard?inspectOutlet=${f.outlet}&inspectTab=summary`);
  await page.getByRole('dialog').getByRole('button',{name:'Suspend access',exact:true}).click();
  const confirm=page.getByRole('dialog',{name:'Suspend portal access?',exact:true});
  await confirm.getByLabel('Reason',{exact:true}).fill('Isolated Phase1 busy-state verification');
  let releaseMutation;
  const mutationGate=new Promise(resolve=>{releaseMutation=resolve;});
  const mutationRoute='**/rest/v1/rpc/platform_set_outlet_access';
  await page.route(mutationRoute,async route=>{await mutationGate; await route.continue();});
  await confirm.getByRole('button',{name:'Suspend access',exact:true}).click();
  await expect(confirm.getByRole('button',{name:'Working…'})).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(confirm).toBeVisible();
  releaseMutation();
  await expect(confirm).toHaveCount(0);
  await expect(page.getByRole('dialog').getByText('Portal suspended',{exact:true})).toBeVisible();
  await page.unroute(mutationRoute);
  const restored=await f.rpc('admin','platform_set_outlet_access',{p_outlet_id:f.outlet,p_enabled:true,p_reason:'Restore isolated UI fixture'});
  expect(restored.status).toBe(200);
});
