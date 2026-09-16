/**
 * Minimal build entry: no static imports (no CSS, no React, no JSX).
 * Mount the UI before native plugin work. Waiting on Capacitor Preferences /
 * App.getLaunchUrl deadlocks Android WebView and leaves testers on Initializing.
 */
import('./src/native/androidShell')
  .then(function (shell) {
    try {
      shell.prepareNativeAuth();
    } catch (error) {
      console.error('[BookGlow Auth] Native auth client setup failed.', error);
    }
    var mounted = import('./main').then(function (m) {
      m.mount();
    });
    void Promise.resolve()
      .then(function () {
        return shell.initAndroidShell();
      })
      .catch(function (error) {
        console.error('[BookGlow Auth] Android shell initialization failed.', error);
      });
    return mounted;
  })
  .catch(function (error) {
    console.error('[BookGlow Auth] Android shell initialization failed.', error);
    return import('./main').then(function (m) {
      m.mount();
    });
  });
