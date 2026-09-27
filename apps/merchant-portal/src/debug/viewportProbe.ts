import { BOOKGLOW_BUILD } from './buildInfo';

const QUERY_KEYS = ['bg-debug-viewport', 'bg-debug-build'] as const;

function readMedia(query: string): boolean {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;
}

function px(value: string): number {
  return Number.parseFloat(value) || 0;
}

function debugEnabled(): boolean {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
  const hashParams = new URLSearchParams(hashQuery.startsWith('?') ? hashQuery : '');
  return QUERY_KEYS.some(
    (key) => params.get(key) === '1' || hashParams.get(key) === '1' || hash.includes(`${key}=1`),
  );
}

function collectViewportSnapshot() {
  const root = document.documentElement;
  const body = document.body;
  const vv = window.visualViewport;
  const computedRoot = window.getComputedStyle(root);
  const computedBody = window.getComputedStyle(body);
  const headerInner = document.querySelector<HTMLElement>('.bookglow-mobile-header__inner');
  const nav = document.querySelector<HTMLElement>('.bookglow-mobile-nav');
  const navInner = document.querySelector<HTMLElement>('.bookglow-mobile-nav__inner');
  const pageTitle = document.querySelector<HTMLElement>('.ui-page-title, .dashboard-mobile-topbar h1, .merchant-onboarding__content h1');
  const button = document.querySelector<HTMLElement>('.m-btn--md, .merchant-onboarding__continue');
  const input = document.querySelector<HTMLElement>('.m-settings-control, .merchant-onboarding__field input, input:not([type="hidden"])');
  const card = document.querySelector<HTMLElement>('.m-card, .dashboard-kpi-card, .merchant-onboarding__choices button');
  const fonts = document.fonts;
  let interLoaded = false;
  if (fonts) {
    fonts.forEach((face) => {
      if (/inter/i.test(face.family) && face.status === 'loaded') interLoaded = true;
    });
  }
  return {
    build: BOOKGLOW_BUILD,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: root.clientWidth,
    clientHeight: root.clientHeight,
    devicePixelRatio: window.devicePixelRatio,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    visualViewportWidth: vv?.width ?? null,
    visualViewportHeight: vv?.height ?? null,
    visualViewportScale: vv?.scale ?? null,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    mq320: readMedia('(max-width: 320px)'),
    mq360: readMedia('(max-width: 360px)'),
    mq375: readMedia('(max-width: 375px)'),
    mq390: readMedia('(max-width: 390px)'),
    mq412: readMedia('(max-width: 412px)'),
    mq427: readMedia('(max-width: 427px)'),
    mq599: readMedia('(max-width: 599.98px)'),
    mq640: readMedia('(min-width: 640px)'),
    mq768: readMedia('(min-width: 768px)'),
    pointerCoarse: readMedia('(pointer: coarse)'),
    hoverNone: readMedia('(hover: none)'),
    orientation: readMedia('(orientation: portrait)') ? 'portrait' : 'landscape',
    displayMode: readMedia('(display-mode: standalone)') ? 'standalone' : 'browser',
    densityMode: computedRoot.getPropertyValue('--density-mode').trim(),
    densityVersion: computedRoot.getPropertyValue('--density-version').trim(),
    rootFontSize: computedRoot.fontSize,
    bodyFontSize: computedBody.fontSize,
    bodyFontFamily: computedBody.fontFamily,
    interLoaded,
    bodyZoom: computedBody.zoom || 'n/a',
    textSizeAdjust: computedRoot.getPropertyValue('text-size-adjust') || computedRoot.getPropertyValue('-webkit-text-size-adjust'),
    safeTop: computedRoot.getPropertyValue('--safe-top').trim(),
    safeBottom: computedRoot.getPropertyValue('--safe-bottom').trim(),
    shellHeaderOffset: computedRoot.getPropertyValue('--shell-header-offset').trim(),
    envSafeTop: computedRoot.getPropertyValue('--mobile-safe-area-top').trim(),
    headerInnerHeight: headerInner?.getBoundingClientRect().height ?? null,
    navHeight: nav?.getBoundingClientRect().height ?? null,
    navInnerHeight: navInner?.getBoundingClientRect().height ?? null,
    pageTitleFontSize: pageTitle ? window.getComputedStyle(pageTitle).fontSize : null,
    buttonHeight: button?.getBoundingClientRect().height ?? null,
    inputHeight: input?.getBoundingClientRect().height ?? null,
    cardPadding: card ? window.getComputedStyle(card).padding : null,
    controlHeightToken: computedRoot.getPropertyValue('--control-height').trim(),
    fontPageTitleToken: computedRoot.getPropertyValue('--font-page-title').trim(),
    fontBodyTokenPx: px(computedRoot.getPropertyValue('--font-body')),
  };
}

function mountProbe(snapshot: ReturnType<typeof collectViewportSnapshot>) {
  const existing = document.getElementById('bg-viewport-probe');
  const node = existing ?? document.createElement('pre');
  node.id = 'bg-viewport-probe';
  node.setAttribute('data-bg-debug', 'viewport');
  node.style.cssText =
    'position:fixed;z-index:99999;left:8px;right:8px;bottom:8px;max-height:40vh;overflow:auto;margin:0;padding:8px;border-radius:8px;background:#111;color:#9f9;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;';
  const build = snapshot.build;
  node.textContent = [
    `${build.name}`,
    `commit: ${build.commit}`,
    `built: ${build.built}`,
    `density: ${build.density}`,
    '',
    JSON.stringify(snapshot, null, 2),
  ].join('\n');
  if (!existing) document.body.appendChild(node);
}

export function installViewportProbe() {
  if (typeof window === 'undefined') return;
  if (!debugEnabled()) return;
  (window as Window & { __BOOKGLOW_BUILD__?: typeof BOOKGLOW_BUILD }).__BOOKGLOW_BUILD__ = BOOKGLOW_BUILD;
  const report = () => {
    const snapshot = collectViewportSnapshot();
    console.info('[BookGlow frontend]', snapshot.build);
    console.info('[BookGlow viewport]', snapshot);
    mountProbe(snapshot);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', report, { once: true });
  } else {
    report();
  }
}
