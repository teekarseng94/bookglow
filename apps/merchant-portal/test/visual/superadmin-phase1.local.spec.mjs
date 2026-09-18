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
    await page.reload(); await expect(dialog.locator('.m-modal-desc')).toBeVisible();
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
  await search(page,f.identities.owner.email); await page.getByRole('option').first().click();
  await expect(page).toHaveURL(/inspectTab=accounts/);
  await expect(page.getByRole('dialog').getByText(f.identities.owner.email,{exact:false}).first()).toBeVisible();
  await page.keyboard.press('Escape');
  for(const [id,url] of [[f.caseId,/\/admin\/support\?case=/],[f.operation,/\/admin\/integrations-jobs\?tab=jobs&operation=/],[f.audit,/\/admin\/audit\?event=/]]) {
    await search(page,id); await page.getByRole('option').first().click(); await expect(page).toHaveURL(url); expect(page.url()).toContain(id);
  }
  await page.goto(`/admin?inspectOutlet=${f.other}&inspectTab=summary`);
  await expect(page.getByRole('dialog').locator('.m-modal-desc')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('No recent server-backed activity is available.')).toBeVisible();
  await page.goto(`/admin?inspectOutlet=${f.outlet}&inspectTab=summary`);
  await expect(page.getByRole('dialog').locator('.m-modal-desc')).toBeVisible();
  await page.goBack(); await expect(page.getByRole('dialog').locator('.m-modal-desc')).toBeVisible();
  await page.goto('/admin?inspectOutlet=phase1_missing&inspectTab=summary');
  await expect(page.getByRole('dialog').getByText(/could not be loaded|Outlet not found/i)).toBeVisible();
});
test('booking and sale open validated remote access',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  for(const [kind,route] of [['booking','schedule'],['sale','transactions']]) {
    await page.goto('/admin'); await search(page,`${f.prefix}_${kind}`); await page.getByRole('option').first().click();
    await expect(page).toHaveURL(new RegExp(`/${route}\\?record=${f.prefix}_${kind}`));
    await expect(page.getByText(/Remote access/i).first()).toBeVisible();
    await expect(page.getByText(`Phase1 Alpha ${f.suffix}`,{exact:false}).first()).toBeVisible();
  }
});
