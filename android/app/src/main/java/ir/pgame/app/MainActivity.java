package ir.pgame.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {


private static final long STARTUP_TIMEOUT = 15000L;
private static final long STARTUP_FINISH_DELAY = 180L;
private static final long APP_MODE_DELAY = 250L;

private WebView webView;
private ViewGroup rootLayout;

private View splashOverlay;
private View offlineOverlay;
private View errorOverlay;

private final Handler handler =
        new Handler(Looper.getMainLooper());

private boolean pageLoaded = false;
private boolean startupFinished = false;
private boolean startupTimeoutTriggered = false;

private Runnable startupTimeoutRunnable;

@Override
protected void onCreate(
        @Nullable Bundle savedInstanceState
) {
    SplashScreen.installSplashScreen(this);

    /*
     * Capacitor must initialize its own layout and WebView.
     */
    super.onCreate(savedInstanceState);

    enableFullscreen();

    /*
     * IMPORTANT:
     *
     * We do NOT call setContentView().
     * We do NOT detach the WebView.
     * We do NOT create a second WebView container.
     *
     * Capacitor owns the WebView.
     */
    webView = getBridge().getWebView();

    /*
     * android.R.id.content is used only as the parent
     * for the temporary native overlays.
     */
    rootLayout = findViewById(
            android.R.id.content
    );

    if (webView != null) {
        setupWebView();

        createSplashOverlay();
        createOfflineOverlay();
        createErrorOverlay();

        showSplash();
        startStartupTimeout();

        /*
         * The main PGame page is initialized by Capacitor.
         * App-mode navigation is attached shortly afterward.
         */
        handler.postDelayed(
                this::initializePGameAppMode,
                APP_MODE_DELAY
        );
    }
}

@SuppressLint("SetJavaScriptEnabled")
private void setupWebView() {
    if (webView == null) {
        return;
    }

    WebSettings settings =
            webView.getSettings();

    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);

    settings.setJavaScriptCanOpenWindowsAutomatically(
            true
    );

    settings.setLoadsImagesAutomatically(
            true
    );

    settings.setAllowFileAccess(
            true
    );

    settings.setAllowContentAccess(
            true
    );

    settings.setSupportZoom(
            false
    );

    settings.setBuiltInZoomControls(
            false
    );

    settings.setDisplayZoomControls(
            false
    );

    settings.setLoadWithOverviewMode(
            false
    );

    settings.setUseWideViewPort(
            false
    );

    settings.setCacheMode(
            WebSettings.LOAD_DEFAULT
    );

    settings.setMediaPlaybackRequiresUserGesture(
            false
    );

    try {
        settings.setMixedContentMode(
                WebSettings
                        .MIXED_CONTENT_COMPATIBILITY_MODE
        );
    } catch (Exception ignored) {
    }

    webView.setBackgroundColor(
            Color.TRANSPARENT
    );

    webView.setOverScrollMode(
            View.OVER_SCROLL_NEVER
    );

    webView.setVerticalScrollBarEnabled(
            false
    );

    webView.setHorizontalScrollBarEnabled(
            false
    );

    webView.setHapticFeedbackEnabled(
            false
    );

    CookieManager cookieManager =
            CookieManager.getInstance();

    cookieManager.setAcceptCookie(
            true
    );

    try {
        cookieManager.setAcceptThirdPartyCookies(
                webView,
                true
        );
    } catch (Exception ignored) {
    }

    /*
     * DO NOT replace Capacitor's WebChromeClient.
     *
     * Capacitor installs its own BridgeWebChromeClient
     * during Bridge initialization.
     *
     * We leave it untouched.
     *
     * For WebViewClient we subclass BridgeWebViewClient
     * so local asset interception remains intact.
     */
    webView.setWebViewClient(
            new BridgeWebViewClient(
                    getBridge()
            ) {

                @Override
                public void onPageStarted(
                        WebView view,
                        String url,
                        android.graphics.Bitmap favicon
                ) {
                    super.onPageStarted(
                            view,
                            url,
                            favicon
                    );

                    pageLoaded = false;

                    if (!startupFinished) {
                        showSplash();
                    }
                }

                @Override
                public void onPageFinished(
                        WebView view,
                        String url
                ) {
                    /*
                     * Preserve Capacitor behavior first.
                     */
                    super.onPageFinished(
                            view,
                            url
                    );

                    pageLoaded = true;

                    enableFullscreen();

                    /*
                     * Initialize native PGame mode after
                     * the real local page is loaded.
                     */
                    handler.post(
                            MainActivity.this
                                    ::initializePGameAppMode
                    );

                    handler.postDelayed(
                            MainActivity.this
                                    ::finishStartupIfNeeded,
                            STARTUP_FINISH_DELAY
                    );
                }

                @Override
                public void onReceivedError(
                        WebView view,
                        WebResourceRequest request,
                        WebResourceError error
                ) {
                    /*
                     * Preserve Capacitor error handling.
                     */
                    super.onReceivedError(
                            view,
                            request,
                            error
                    );

                    if (
                            request != null &&
                            request.isForMainFrame()
                    ) {
                        handler.post(
                                MainActivity.this
                                        ::showOfflineOrError
                        );
                    }
                }

                @Override
                public void onReceivedHttpError(
                        WebView view,
                        WebResourceRequest request,
                        WebResourceResponse response
                ) {
                    /*
                     * Preserve Capacitor error handling.
                     */
                    super.onReceivedHttpError(
                            view,
                            request,
                            response
                    );

                    if (
                            request != null &&
                            request.isForMainFrame() &&
                            response != null
                    ) {
                        int statusCode =
                                response.getStatusCode();

                        if (statusCode >= 500) {
                            handler.post(
                                    MainActivity.this
                                            ::showError
                            );
                        }
                    }
                }
            }
    );
}

private void initializePGameAppMode() {
    if (webView == null) {
        return;
    }

    String js =
            "(function(){" +
                    "try{" +

                    /*
                     * Mark the page as the Android app.
                     */
                    "document.documentElement.classList.add(" +
                    "'pgame-app'" +
                    ");" +

                    "if(document.body){" +
                    "document.body.classList.add(" +
                    "'pgame-app'" +
                    ");" +
                    "}" +

                    /*
                     * Make sure normal vertical page scrolling
                     * remains available.
                     */
                    "document.documentElement.style.overflowX=" +
                    "'hidden';" +

                    "document.documentElement.style.overflowX=" +
                    "'hidden';" +

                    "if(document.body){" +
                    "document.body.style.overflowX='hidden';" +
                    "}" +

                    /*
                     * Website-only footer.
                     */
                    "document.querySelectorAll('footer')" +
                    ".forEach(function(el){" +
                    "el.style.display='none';" +
                    "});" +

                    /*
                     * Website hamburger is not needed in app mode.
                     */
                    "var trigger=" +
                    "document.getElementById(" +
                    "'vexon-menu-trigger'" +
                    ");" +

                    "if(trigger){" +
                    "trigger.style.display='none';" +
                    "trigger.setAttribute(" +
                    "'aria-hidden','true'" +
                    ");" +
                    "}" +

                    /*
                     * Website mobile bottom navigation.
                     */
                    "document.querySelectorAll(" +
                    "'.mobile-bottom-nav'" +
                    ").forEach(function(el){" +
                    "el.style.display='none';" +
                    "});" +

                    /*
                     * Native runtime style.
                     */
                    "var style=" +
                    "document.getElementById(" +
                    "'pgame-native-runtime-style'" +
                    ");" +

                    "if(!style){" +

                    "style=document.createElement('style');" +

                    "style.id=" +
                    "'pgame-native-runtime-style';" +

                    "style.textContent=" +

                    "\"html.pgame-app,html.pgame-app body{" +
                    "overflow-x:hidden!important;" +
                    س"}\" +" +

                    "\"html.pgame-app footer{" +
                    "display:none!important;" +
                    "}\" +" +

                    "\"html.pgame-app img{" +
                    "-webkit-user-drag:none;" +
                    "}\" +" +

                    "\"html.pgame-app .mobile-bottom-nav{" +
                    "display:none!important;" +
                    "}\";" +

                    "document.head.appendChild(style);" +

                    "}" +

                    /*
                     * Native app bridge.
                     */
                    "window.PGameNativeApp=" +
                    "window.PGameNativeApp||{};" +

                    "window.PGameNativeApp.isNative=true;" +

                    /*
                     * Account cache.
                     */
                    "window.PGameNativeApp.getCachedAccount=" +
                    "function(){" +
                    "try{" +
                    "var raw=localStorage.getItem(" +
                    "'pgame_account_cache_v1'" +
                    ");" +

                    "return raw?" +
                    "JSON.parse(raw):null;" +

                    "}catch(e){" +
                    "return null;" +
                    "}" +
                    "};" +

                    "window.PGameNativeApp.setCachedAccount=" +
                    "function(account){" +
                    "try{" +

                    "if(!account){" +
                    "localStorage.removeItem(" +
                    "'pgame_account_cache_v1'" +
                    ");" +

                    "}else{" +
                    "localStorage.setItem(" +
                    "'pgame_account_cache_v1'," +
                    "JSON.stringify(account)" +
                    ");" +
                    "}" +

                    "}catch(e){}" +
                    "};" +

                    /*
                     * Persistent app session.
                     */
                    "window.PGameNativeApp.getSession=" +
                    "function(){" +
                    "try{" +
                    "return localStorage.getItem(" +
                    "'pgame_app_session'" +
                    ")||'';" +
                    "}catch(e){" +
                    "return '';" +
                    "}" +
                    "};" +

                    "window.PGameNativeApp.setSession=" +
                    "function(value){" +
                    "try{" +

                    "if(value){" +
                    "localStorage.setItem(" +
                    "'pgame_app_session'," +
                    "value" +
                    ");" +

                    "}else{" +

                    "localStorage.removeItem(" +
                    "'pgame_app_session'" +
                    ");" +

                    "}" +

                    "}catch(e){}" +
                    "};" +

                    /*
                     * Navigation bridge.
                     *
                     * Prefer normal browser navigation so
                     * Capacitor's local server continues to
                     * control the page.
                     */
                    "window.PGameApp=" +
                    "window.PGameApp||{};" +

                    "window.PGameApp.isApp=true;" +

                    "window.PGameApp.navigate=" +
                    "function(url){" +

                    "try{" +

                    "if(!url)return;" +

                    "window.location.href=url;" +

                    "}catch(e){" +

                    "window.location.href=url;" +

                    "}" +

                    "};" +

                    /*
                     * Explicitly initialize the navigation module
                     * because pgame-app is added after vexon-nav.js
                     * may already have executed.
                     */
                    "if(window.PGameNavigation&&" +
                    "typeof window.PGameNavigation." +
                    "initializeAppMode==='function'){" +

                    "window.PGameNavigation." +
                    "initializeAppMode();" +

                    "}" +

                    /*
                     * Small click feedback.
                     */
                    "if(!window.__pgameNativeTouchFX){" +

                    "window.__pgameNativeTouchFX=true;" +

                    "document.addEventListener(" +
                    "'click'," +
                    "function(ev){" +

                    "var el=null;" +

                    "if(ev.target&&ev.target.closest){" +

                    "el=ev.target.closest(" +
                    "'button,a,.nav-item,.card,.game-card'" +
                    ");" +

                    "}" +

                    "if(!el)return;" +

                    "el.classList.add(" +
                    "'pgame-pressing'" +
                    ");" +

                    "setTimeout(function(){" +

                    "el.classList.remove(" +
                    "'pgame-pressing'" +
                    ");" +

                    "},120);" +

                    "}," +
                    "{passive:true}" +
                    ");" +

                    "}" +

                    /*
                     * Footer may be added dynamically,
                     * therefore perform one additional pass.
                     */
                    "document.querySelectorAll('footer')" +
                    ".forEach(function(el){" +
                    "el.style.display='none';" +
                    "});" +

                    "}catch(e){" +

                    "console.log(" +
                    "'PGame native mode error'," +
                    "e" +
                    ");" +

                    "}" +
                    "})();";

    webView.evaluateJavascript(
            js,
            value -> {
            }
    );
}


private void enableFullscreen() {
    Window window = getWindow();

    if (window == null) {
        return;
    }

    try {
        WindowInsetsController controller =
                window.getInsetsController();

        if (controller != null) {
            controller.hide(
                    WindowInsets.Type.statusBars()
                            | WindowInsets.Type.navigationBars()
            );

            controller.setSystemBarsBehavior(
                    WindowInsetsController
                            .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
    } catch (Exception ignored) {
    }
}

private void startStartupTimeout() {
    if (startupTimeoutRunnable != null) {
        handler.removeCallbacks(
                startupTimeoutRunnable
        );
    }

    startupTimeoutRunnable = () -> {

        if (startupFinished) {
            return;
        }

        startupTimeoutTriggered = true;

        if (pageLoaded) {
            finishStartupIfNeeded();
        } else {
            showOfflineOrError();
        }
    };

    handler.postDelayed(
            startupTimeoutRunnable,
            STARTUP_TIMEOUT
    );
}

private void finishStartupIfNeeded() {
    if (startupFinished) {
        return;
    }

    if (
            !pageLoaded &&
            !startupTimeoutTriggered
    ) {
        return;
    }

    startupFinished = true;

    if (startupTimeoutRunnable != null) {
        handler.removeCallbacks(
                startupTimeoutRunnable
        );
    }

    hideOffline();
    hideError();

    hideSplash();
}

private void createSplashOverlay() {
    if (rootLayout == null) {
        return;
    }

    FrameLayout splash =
            new FrameLayout(this);

    splash.setLayoutParams(
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            )
    );

    splash.setBackgroundColor(
            Color.rgb(3, 4, 10)
    );

    TextView glow =
            new TextView(this);

    glow.setText("P");
    glow.setTextColor(
            Color.rgb(0, 255, 157)
    );
    glow.setTextSize(86f);
    glow.setGravity(
            Gravity.CENTER
    );

    glow.setTypeface(
            android.graphics.Typeface.create(
                    "sans-serif",
                    android.graphics.Typeface.BOLD
            )
    );

    FrameLayout.LayoutParams glowParams =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    glowParams.gravity =
            Gravity.CENTER;

    splash.addView(
            glow,
            glowParams
    );

    TextView title =
            new TextView(this);

    title.setText("PGAME");
    title.setTextColor(
            Color.WHITE
    );
    title.setTextSize(24f);
    title.setGravity(
            Gravity.CENTER
    );
    title.setLetterSpacing(
            .22f
    );

    title.setTypeface(
            android.graphics.Typeface.create(
                    "sans-serif",
                    android.graphics.Typeface.BOLD
            )
    );

    FrameLayout.LayoutParams titleParams =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    titleParams.gravity =
            Gravity.CENTER;

    titleParams.topMargin =
            115;

    splash.addView(
            title,
            titleParams
    );

    TextView subtitle =
            new TextView(this);

    subtitle.setText(
            "PLAY • COMPETE • LEVEL UP."
    );

    subtitle.setTextColor(
            Color.rgb(116, 77, 255)
    );

    subtitle.setTextSize(10f);
    subtitle.setGravity(
            Gravity.CENTER
    );
    subtitle.setLetterSpacing(
            .12f
    );

    FrameLayout.LayoutParams subtitleParams =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    subtitleParams.gravity =
            Gravity.CENTER;

    subtitleParams.topMargin =
            175;

    splash.addView(
            subtitle,
            subtitleParams
    );

    rootLayout.addView(
            splash
    );

    splashOverlay =
            splash;

    splash.setAlpha(1f);

    splash.setVisibility(
            View.VISIBLE
    );
}

private void createOfflineOverlay() {
    if (rootLayout == null) {
        return;
    }

    FrameLayout overlay =
            new FrameLayout(this);

    overlay.setLayoutParams(
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            )
    );

    overlay.setBackgroundColor(
            Color.rgb(3, 4, 10)
    );

    TextView text =
            new TextView(this);

    text.setText(
            "اتصال به PGame برقرار نشد.\n" +
            "لطفاً اینترنت را بررسی کنید."
    );

    text.setTextColor(
            Color.WHITE
    );

    text.setTextSize(17f);

    text.setGravity(
            Gravity.CENTER
    );

    text.setLineSpacing(
            8f,
            1f
    );

    FrameLayout.LayoutParams params =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    params.gravity =
            Gravity.CENTER;

    params.leftMargin =
            35;

    params.rightMargin =
            35;

    overlay.addView(
            text,
            params
    );

    rootLayout.addView(
            overlay
    );

    offlineOverlay =
            overlay;

    overlay.setVisibility(
            View.GONE
    );
}

private void createErrorOverlay() {
    if (rootLayout == null) {
        return;
    }

    FrameLayout overlay =
            new FrameLayout(this);

    overlay.setLayoutParams(
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            )
    );

    overlay.setBackgroundColor(
            Color.rgb(3, 4, 10)
    );

    TextView text =
            new TextView(this);

    text.setText(
            "یک خطای غیرمنتظره رخ داد.\n" +
            "لطفاً دوباره PGame را باز کنید."
    );

    text.setTextColor(
            Color.WHITE
    );

    text.setTextSize(17f);

    text.setGravity(
            Gravity.CENTER
    );

    text.setLineSpacing(
            8f,
            1f
    );

    FrameLayout.LayoutParams params =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    params.gravity =
            Gravity.CENTER;

    params.leftMargin =
            35;

    params.rightMargin =
            35;

    overlay.addView(
            text,
            params
    );

    rootLayout.addView(
            overlay
    );

    errorOverlay =
            overlay;

    overlay.setVisibility(
            View.GONE
    );
}

private void showSplash() {
    if (splashOverlay == null) {
        return;
    }

    splashOverlay.setVisibility(
            View.VISIBLE
    );

    splashOverlay.setAlpha(
            1f
    );
}

private void hideSplash() {
    if (splashOverlay == null) {
        return;
    }

    splashOverlay.animate()
            .alpha(0f)
            .setDuration(180L)
            .withEndAction(() -> {

                if (splashOverlay != null) {
                    splashOverlay.setVisibility(
                            View.GONE
                    );
                }

            })
            .start();
}

private void showOfflineOrError() {
    if (isProbablyOffline()) {
        showOffline();
    } else {
        showError();
    }
}

private boolean isProbablyOffline() {
    try {
        android.net.ConnectivityManager
                connectivityManager =
                (android.net.ConnectivityManager)
                        getSystemService(
                                CONNECTIVITY_SERVICE
                        );

        if (connectivityManager == null) {
            return true;
        }

        android.net.Network network =
                connectivityManager
                        .getActiveNetwork();

        if (network == null) {
            return true;
        }

        android.net.NetworkCapabilities
                capabilities =
                connectivityManager
                        .getNetworkCapabilities(
                                network
                        );

        if (capabilities == null) {
            return true;
        }

        return !capabilities.hasCapability(
                android.net.NetworkCapabilities
                        .NET_CAPABILITY_INTERNET
        );

    } catch (Exception ignored) {
        return false;
    }
}

private void showOffline() {
    hideError();

    if (offlineOverlay != null) {
        offlineOverlay.setVisibility(
                View.VISIBLE
        );

        offlineOverlay.setAlpha(
                0f
        );

        offlineOverlay.animate()
                .alpha(1f)
                .setDuration(180L)
                .start();
    }

    hideSplash();
}

private void showError() {
    hideOffline();

    if (errorOverlay != null) {
        errorOverlay.setVisibility(
                View.VISIBLE
        );

        errorOverlay.setAlpha(
                0f
        );

        errorOverlay.animate()
                .alpha(1f)
                .setDuration(180L)
                .start();
    }

    hideSplash();
}

private void hideOffline() {
    if (offlineOverlay != null) {
        offlineOverlay.animate()
                .alpha(0f)
                .setDuration(100L)
                .withEndAction(() -> {

                    if (offlineOverlay != null) {
                        offlineOverlay.setVisibility(
                                View.GONE
                        );
                    }

                })
                .start();
    }
}

private void hideError() {
    if (errorOverlay != null) {
        errorOverlay.animate()
                .alpha(0f)
                .setDuration(100L)
                .withEndAction(() -> {

                    if (errorOverlay != null) {
                        errorOverlay.setVisibility(
                                View.GONE
                        );
                    }

                })
                .start();
    }
}

@Override
public void onBackPressed() {
    if (webView == null) {
        super.onBackPressed();
        return;
    }

    String js =
            "(function(){" +
                    "try{" +

                    "if(window.PGameNavigation&&" +
                    "window.PGameNavigation.isOpen&&" +
                    "window.PGameNavigation.isOpen()){" +

                    "window.PGameNavigation.close();" +

                    "return 'drawer';" +

                    "}" +

                    "return 'normal';" +

                    "}catch(e){" +

                    "return 'normal';" +

                    "}" +

                    "})();";

    webView.evaluateJavascript(
            js,
            result -> {

                if ("\"drawer\"".equals(result)) {
                    return;
                }

                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    MainActivity.super
                            .onBackPressed();
                }
            }
    );
}

@Override
public void onResume() {
    super.onResume();

    enableFullscreen();
}

@Override
public void onPause() {
    super.onPause();
}

@Override
public void onDestroy() {
    if (startupTimeoutRunnable != null) {
        handler.removeCallbacks(
                startupTimeoutRunnable
        );
    }

    /*
     * Capacitor owns WebView lifecycle.
     * Do not call webView.destroy().
     */
    webView = null;

    super.onDestroy();
}


}
