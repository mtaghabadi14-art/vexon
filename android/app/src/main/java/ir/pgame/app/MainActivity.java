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
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {


private static final long STARTUP_TIMEOUT = 15000L;

private WebView webView;
private ViewGroup rootLayout;

private View splashOverlay;
private View offlineOverlay;
private View errorOverlay;

private final Handler handler = new Handler(Looper.getMainLooper());

private boolean pageLoaded = false;
private boolean startupFinished = false;
private boolean startupTimeoutTriggered = false;

private Runnable startupTimeoutRunnable;

@Override
protected void onCreate(@Nullable Bundle savedInstanceState) {
    SplashScreen.installSplashScreen(this);

    super.onCreate(savedInstanceState);

    enableFullscreen();

    /*
     * IMPORTANT:
     * Do NOT call setContentView() here.
     * Capacitor already created and owns the WebView/container.
     */
    rootLayout = findViewById(android.R.id.content);

    webView = getBridge().getWebView();

    if (webView != null) {
        setupWebView();

        createSplashOverlay();
        createOfflineOverlay();
        createErrorOverlay();

        showSplash();
        startStartupTimeout();
    }
}

@SuppressLint("SetJavaScriptEnabled")
private void setupWebView() {
    if (webView == null) {
        return;
    }

    WebSettings settings = webView.getSettings();

    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setJavaScriptCanOpenWindowsAutomatically(true);
    settings.setLoadsImagesAutomatically(true);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    settings.setSupportZoom(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
    settings.setLoadWithOverviewMode(false);
    settings.setUseWideViewPort(false);
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
    settings.setMediaPlaybackRequiresUserGesture(false);

    try {
        settings.setMixedContentMode(
                WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        );
    } catch (Exception ignored) {
    }

    webView.setBackgroundColor(Color.TRANSPARENT);
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    webView.setVerticalScrollBarEnabled(false);
    webView.setHorizontalScrollBarEnabled(false);
    webView.setHapticFeedbackEnabled(false);

    CookieManager cookieManager = CookieManager.getInstance();
    cookieManager.setAcceptCookie(true);

    try {
        cookieManager.setAcceptThirdPartyCookies(webView, true);
    } catch (Exception ignored) {
    }

    webView.setWebChromeClient(new WebChromeClient());

    webView.setWebViewClient(new WebViewClient() {

        @Override
        public void onPageStarted(
                WebView view,
                String url,
                android.graphics.Bitmap favicon
        ) {
            super.onPageStarted(view, url, favicon);

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
            super.onPageFinished(view, url);

            pageLoaded = true;

            enableFullscreen();

            /*
             * Native app enhancements are applied AFTER the real
             * local PGame page has finished loading.
             */
            injectPGameAppMode();

            handler.postDelayed(
                    MainActivity.this::finishStartupIfNeeded,
                    150L
            );
        }

        @Override
        public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
        ) {
            super.onReceivedError(view, request, error);

            if (request != null && request.isForMainFrame()) {
                showOfflineOrError();
            }
        }

        @Override
        public void onReceivedHttpError(
                WebView view,
                WebResourceRequest request,
                WebResourceResponse errorResponse
        ) {
            super.onReceivedHttpError(
                    view,
                    request,
                    errorResponse
            );

            if (
                    request != null &&
                    request.isForMainFrame() &&
                    errorResponse != null
            ) {
                int statusCode = errorResponse.getStatusCode();

                if (statusCode >= 500) {
                    showError();
                }
            }
        }
    });
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
                    WindowInsets.Type.statusBars() |
                            WindowInsets.Type.navigationBars()
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
        handler.removeCallbacks(startupTimeoutRunnable);
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

    if (!pageLoaded && !startupTimeoutTriggered) {
        return;
    }

    startupFinished = true;

    if (startupTimeoutRunnable != null) {
        handler.removeCallbacks(startupTimeoutRunnable);
    }

    hideOffline();
    hideError();

    if (splashOverlay != null) {
        splashOverlay.animate()
                .alpha(0f)
                .setDuration(220L)
                .withEndAction(() -> {
                    if (splashOverlay != null) {
                        splashOverlay.setVisibility(View.GONE);
                    }
                })
                .start();
    }
}

private FrameLayout.LayoutParams fullScreenParams() {
    return new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
    );
}

private void createSplashOverlay() {
    if (rootLayout == null) {
        return;
    }

    FrameLayout splash = new FrameLayout(this);
    splash.setLayoutParams(fullScreenParams());
    splash.setBackgroundColor(Color.rgb(3, 4, 10));

    TextView glow = new TextView(this);

    glow.setText("P");
    glow.setTextColor(Color.rgb(0, 255, 157));
    glow.setTextSize(86f);
    glow.setGravity(Gravity.CENTER);
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

    glowParams.gravity = Gravity.CENTER;

    splash.addView(glow, glowParams);

    TextView title = new TextView(this);

    title.setText("PGAME");
    title.setTextColor(Color.WHITE);
    title.setTextSize(24f);
    title.setGravity(Gravity.CENTER);
    title.setLetterSpacing(.22f);
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

    titleParams.gravity = Gravity.CENTER;
    titleParams.topMargin = 115;

    splash.addView(title, titleParams);

    TextView subtitle = new TextView(this);

    subtitle.setText("PLAY • COMPETE • LEVEL UP.");
    subtitle.setTextColor(Color.rgb(116, 77, 255));
    subtitle.setTextSize(10f);
    subtitle.setGravity(Gravity.CENTER);
    subtitle.setLetterSpacing(.12f);

    FrameLayout.LayoutParams subtitleParams =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    subtitleParams.gravity = Gravity.CENTER;
    subtitleParams.topMargin = 175;

    splash.addView(subtitle, subtitleParams);

    rootLayout.addView(splash);

    splashOverlay = splash;

    splash.setAlpha(1f);
    splash.setVisibility(View.VISIBLE);
}

private void createOfflineOverlay() {
    if (rootLayout == null) {
        return;
    }

    FrameLayout overlay = new FrameLayout(this);
    overlay.setLayoutParams(fullScreenParams());
    overlay.setBackgroundColor(Color.rgb(3, 4, 10));

    TextView text = new TextView(this);

    text.setText(
            "اتصال به PGame برقرار نشد.\nلطفاً اینترنت را بررسی کنید."
    );

    text.setTextColor(Color.WHITE);
    text.setTextSize(17f);
    text.setGravity(Gravity.CENTER);
    text.setLineSpacing(8f, 1f);

    FrameLayout.LayoutParams textParams =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    textParams.gravity = Gravity.CENTER;
    textParams.leftMargin = 35;
    textParams.rightMargin = 35;

    overlay.addView(text, textParams);

    rootLayout.addView(overlay);

    offlineOverlay = overlay;

    overlay.setVisibility(View.GONE);
}

private void createErrorOverlay() {
    if (rootLayout == null) {
        return;
    }

    FrameLayout overlay = new FrameLayout(this);
    overlay.setLayoutParams(fullScreenParams());
    overlay.setBackgroundColor(Color.rgb(3, 4, 10));

    TextView text = new TextView(this);

    text.setText(
            "یک خطای غیرمنتظره رخ داد.\nلطفاً دوباره PGame را باز کنید."
    );

    text.setTextColor(Color.WHITE);
    text.setTextSize(17f);
    text.setGravity(Gravity.CENTER);
    text.setLineSpacing(8f, 1f);

    FrameLayout.LayoutParams textParams =
            new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );

    textParams.gravity = Gravity.CENTER;
    textParams.leftMargin = 35;
    textParams.rightMargin = 35;

    overlay.addView(text, textParams);

    rootLayout.addView(overlay);

    errorOverlay = overlay;

    overlay.setVisibility(View.GONE);
}

private void showSplash() {
    if (splashOverlay == null) {
        return;
    }

    splashOverlay.setVisibility(View.VISIBLE);
    splashOverlay.setAlpha(1f);
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
        android.net.ConnectivityManager connectivityManager =
                (android.net.ConnectivityManager)
                        getSystemService(CONNECTIVITY_SERVICE);

        if (connectivityManager == null) {
            return true;
        }

        android.net.Network network =
                connectivityManager.getActiveNetwork();

        if (network == null) {
            return true;
        }

        android.net.NetworkCapabilities capabilities =
                connectivityManager.getNetworkCapabilities(network);

        if (capabilities == null) {
            return true;
        }

        return !capabilities.hasCapability(
                android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET
        );

    } catch (Exception ignored) {
        return false;
    }
}

private void showOffline() {
    hideError();

    if (offlineOverlay != null) {
        offlineOverlay.setVisibility(View.VISIBLE);
        offlineOverlay.setAlpha(0f);

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
        errorOverlay.setVisibility(View.VISIBLE);
        errorOverlay.setAlpha(0f);

        errorOverlay.animate()
                .alpha(1f)
                .setDuration(180L)
                .start();
    }

    hideSplash();
}

private void hideSplash() {
    if (splashOverlay != null) {
        splashOverlay.animate()
                .alpha(0f)
                .setDuration(160L)
                .withEndAction(() -> {
                    if (splashOverlay != null) {
                        splashOverlay.setVisibility(View.GONE);
                    }
                })
                .start();
    }
}

private void hideOffline() {
    if (offlineOverlay != null) {
        offlineOverlay.animate()
                .alpha(0f)
                .setDuration(100L)
                .withEndAction(() -> {
                    if (offlineOverlay != null) {
                        offlineOverlay.setVisibility(View.GONE);
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
                        errorOverlay.setVisibility(View.GONE);
                    }
                })
                .start();
    }
}

/**
 * Adds only native-app behavior to the already loaded PGame page.
 * It does not replace or reload the local page.
 */
private void injectPGameAppMode() {
    if (webView == null) {
        return;
    }

    String js =
            "(function(){" +
                    "try{" +

                    "document.documentElement.classList.add('pgame-app');" +

                    "if(document.body){" +
                    "document.body.classList.add('pgame-app');" +
                    "}" +

                    "var hideFooter=function(){" +
                    "document.querySelectorAll('footer').forEach(function(el){" +
                    "el.style.display='none';" +
                    "});" +
                    "};" +

                    "hideFooter();" +

                    "var style=document.getElementById('pgame-native-runtime-style');" +

                    "if(!style){" +

                    "style=document.createElement('style');" +
                    "style.id='pgame-native-runtime-style';" +

                    "style.textContent=" +
                    "\"html.pgame-app,html.pgame-app body{\" +" +
                    "\"overscroll-behavior:none!important;\" +" +
                    "\"-webkit-tap-highlight-color:transparent!important;\" +" +
                    "\"}\" +" +

                    "\"html.pgame-app footer{display:none!important;}\" +" +

                    "\"html.pgame-app img{-webkit-user-drag:none;}\" +" +

                    "\"html.pgame-app .mobile-bottom-nav{display:none!important;}\" +" +

                    "\"html.pgame-app .vexon-global-menu-trigger{display:none!important;}\";" +

                    "document.head.appendChild(style);" +
                    "}" +

                    "window.PGameNativeApp={isNative:true};" +

                    "window.PGameNativeApp.getCachedAccount=function(){" +
                    "try{" +
                    "var raw=localStorage.getItem('pgame_account_cache_v1');" +
                    "return raw?JSON.parse(raw):null;" +
                    "}catch(e){return null;}" +
                    "};" +

                    "window.PGameNativeApp.setCachedAccount=function(account){" +
                    "try{" +
                    "if(!account){" +
                    "localStorage.removeItem('pgame_account_cache_v1');" +
                    "}else{" +
                    "localStorage.setItem('pgame_account_cache_v1',JSON.stringify(account));" +
                    "}" +
                    "}catch(e){}" +
                    "};" +

                    "window.PGameNativeApp.getSession=function(){" +
                    "try{" +
                    "return localStorage.getItem('pgame_app_session')||'';" +
                    "}catch(e){return '';}" +
                    "};" +

                    "window.PGameNativeApp.setSession=function(value){" +
                    "try{" +
                    "if(value){" +
                    "localStorage.setItem('pgame_app_session',value);" +
                    "}else{" +
                    "localStorage.removeItem('pgame_app_session');" +
                    "}" +
                    "}catch(e){}" +
                    "};" +

                    "document.documentElement.style.overflowX='hidden';" +

                    "if(document.body){" +
                    "document.body.style.overflowX='hidden';" +
                    "}" +

                    "hideFooter();" +

                    "}catch(e){" +
                    "console.log('PGame native mode error',e);" +
                    "}" +
                    "})();";

    webView.evaluateJavascript(
            js,
            value -> {
            }
    );
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
                    "}catch(e){return 'normal';}" +
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
                    MainActivity.super.onBackPressed();
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
        handler.removeCallbacks(startupTimeoutRunnable);
    }

    /*
     * Capacitor owns the WebView lifecycle.
     * Do not manually destroy the Capacitor WebView here.
     */

    webView = null;

    super.onDestroy();
}


}
