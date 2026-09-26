const QUERY = 'bg-debug-viewport';

function readMedia(query: string): boolean {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;
}

function collectViewportSnapshot() {
  const root = document.documentElement;
  const body = document.body;
  const vv = window.visualViewport;
  const computedRoot = window.getComputedStyle(root);
  const computedBody = window.getComputedStyle(body);
  return {
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
    mq379: readMedia('(max-width: 379.98px)'),
    mq380: readMedia('(min-width: 380px)'),
    mq412: readMedia('(max-width: 412px)'),
    mq479: readMedia('(max-width: 479px)'),
    mq640: readMedia('(min-width: 640px)'),
    mq768: readMedia('(min-width: 768px)'),
    pointerCoarse: readMedia('(pointer: coarse)'),
    hoverNone: readMedia('(hover: none)'),
    orientation: readMedia('(orientation: portrait)') ? 'portrait' : 'landscape',
    displayMode: readMedia('(display-mode: standalone)') ? 'standalone' : 'browser',
    rootFontSize: computedRoot.fontSize,
    bodyFontSize: computedBody.fontSize,
    bodyZoom: computedBody.zoom || 'n/a',
    textSizeAdjust: computedRoot.getPropertyValue('text-size-adjust') || computedRoot.getPropertyValue('-webkit-text-size-adjust'),
    safeTop: computedRoot.getPropertyValue('--safe-top').trim(),
    safeBottom: computedRoot.getPropertyValue('--safe-bottom').trim(),
    shellHeaderOffset: computedRoot.getPropertyValue('--shell-header-offset').trim(),
    envSafeTop: computedRoot.getPropertyValue('--mobile-safe-area-top').trim(),
  };
}

function mountProbe(snapshot: ReturnType<typeof collectViewportSnapshot>) {
  if (document.getElementById('bg-viewport-probe')) return;
  const node = document.createElement('pre');
  node.id = 'bg-viewport-probe';
  node.setAttribute('data-bg-debug', 'viewport');
  node.style.cssText =
    'position:fixed;z-index:99999;left:8px;right:8px;bottom:8px;max-height:40vh;overflow:auto;margin:0;padding:8px;border-radius:8px;background:#111;color:#9f9;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;';
  node.textContent = JSON.stringify(snapshot, null, 2);
  document.body.appendChild(node);
}

export function installViewportProbe() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const enabled = params.get(QUERY) === '1' || hash.includes(`${QUERY}=1`);
  if (!enabled) return;
  const report = () => {
    const snapshot = collectViewportSnapshot();
    console.info('[BookGlow viewport]', snapshot);
    mountProbe(snapshot);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', report, { once: true });
  } else {
    report();
  }
}
