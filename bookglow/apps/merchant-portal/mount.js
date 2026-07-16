/**
 * Zero static imports. Only dynamic imports of react, react-dom, appShell.
 * Guard against double mount; use flushSync; remove #loading after first paint.
 */
function showError(el, err) {
  if (!el) return;
  el.innerHTML =
    '<div style="height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;text-align:center">' +
    '<h1 style="color:#dc2626;margin-bottom:16px">Application Error</h1>' +
    '<p style="color:#64748b;margin-bottom:24px">' + (err && err.message ? err.message : String(err)) + '</p>' +
    '<button onclick="window.location.reload()" style="padding:10px 20px;background:#0d9488;color:white;border:none;border-radius:8px;cursor:pointer">Reload Page</button>' +
    '</div>';
}

export function mount() {
  var rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Critical Error: Could not find root element in index.html');
  }
  // Prevent double mount (e.g. script running twice)
  if (rootElement._reactRoot) return;

  Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./appShell')
  ]).then(function (arr) {
    var React = arr[0].default;
    var ReactDOM = arr[1].default;
    var AppShell = arr[2].default;
    if (rootElement._reactRoot) return;
    var root = ReactDOM.createRoot(rootElement);
    rootElement._reactRoot = root;
    // Synchronous commit to avoid concurrent DOM updates that can trigger removeChild errors
    if (ReactDOM.flushSync) {
      ReactDOM.flushSync(function () {
        root.render(React.createElement(AppShell, null));
      });
    } else {
      root.render(React.createElement(AppShell, null));
    }
    // Remove loading overlay after first paint so DOM changes don't race with React
    requestAnimationFrame(function () {
      var loading = document.getElementById('loading');
      if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    });
  }).catch(function (err) {
    console.error('Mounting Error', err);
    showError(document.getElementById('root'), err);
  });
}

try {
  mount();
} catch (error) {
  console.error('Mounting Error', error);
  showError(document.getElementById('root'), error);
}
