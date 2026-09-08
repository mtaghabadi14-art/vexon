package ir.pgame.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
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

import java.util.Locale;

public class MainActivity extends BridgeActivity {

    private static final long STARTUP_TIMEOUT = 15000L;
    private static final long TRANSITION_MS = 280L;

    private WebView webView;
    private FrameLayout rootLayout;

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

        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        enableFullscreen();

        rootLayout = new FrameLayout(this);
        rootLayout.setLayoutParams(
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );

        setContentView(rootLayout);

        webView = getBridge().getWebView();

        if (webView != null) {
            setupWebView();
            attachWebViewToRoot();
            createSplashOverlay();
            createOfflineOverlay();
            createErrorOverlay();
            showSplash();

            startStartupTimeout();
        }
    }

    private void attachWebViewToRoot() {
        if (webView == null || rootLayout == null) {
            return;
        }

        if (webView.getParent() != null) {
            try {
                ((android.view.ViewGroup) webView.getParent()).removeView(webView);
            } catch (Exception ignored) {
            }
        }

        FrameLayout.LayoutParams params =
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                );

        rootLayout.addView(webView, params);
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
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
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

                injectPGameAppMode();

                handler.postDelayed(
                        MainActivity.this::finishStartupIfNeeded,
                        80L
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
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
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

    private void createSplashOverlay() {
        if (rootLayout == null) {
            return;
        }

        FrameLayout splash = new FrameLayout(this);

        splash.setLayoutParams(
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );

        splash.setBackgroundColor(
                Color.rgb(3, 4, 10)
        );

        TextView glow = new TextView(this);

        glow.setText("P");
        glow.setTextColor(
                Color.rgb(0, 255, 157)
        );
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

        splash.addView(
                glow,
                glowParams
        );

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

        splash.addView(
                title,
                titleParams
        );

        TextView subtitle = new TextView(this);

        subtitle.setText(
                "PLAY • COMPETE • LEVEL UP."
        );

        subtitle.setTextColor(
                Color.rgb(116, 77, 255)
        );

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

        splash.addView(
                subtitle,
                subtitleParams
        );

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

        overlay.setLayoutParams(
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );

        overlay.setBackgroundColor(
                Color.rgb(3, 4, 10)
        );

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

        overlay.addView(
                text,
                textParams
        );

        rootLayout.addView(overlay);

        offlineOverlay = overlay;

        overlay.setVisibility(View.GONE);
    }

    private void createErrorOverlay() {
        if (rootLayout == null) {
            return;
        }

        FrameLayout overlay = new FrameLayout(this);

        overlay.setLayoutParams(
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );

        overlay.setBackgroundColor(
                Color.rgb(3, 4, 10)
        );

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

        overlay.addView(
                text,
                textParams
        );

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
                            getSystemService(
                                    CONNECTIVITY_SERVICE
                            );

            if (connectivityManager == null) {
                return true;
            }

            android.net.Network network =
                    connectivityManager.getActiveNetwork();

            if (network == null) {
                return true;
            }

            android.net.NetworkCapabilities capabilities =
                    connectivityManager.getNetworkCapabilities(
                            network
                    );

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
     * Injects the native-app layer into the local PGame web UI.
     *
     * Important:
     * - No remote server URL is used by Capacitor.
     * - The UI is loaded from the APK's local www folder.
     * - Dynamic account/API data still goes to the Worker from script.js.
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

                        /* -----------------------------
                           Footer / website-only UI
                           ----------------------------- */

                        "var hideFooter=function(){" +
                        "document.querySelectorAll('footer').forEach(function(el){" +
                        "el.style.display='none';" +
                        "});" +
                        "};" +

                        "hideFooter();" +

                        /* -----------------------------
                           Disable heavy effects
                           ----------------------------- */

                        "var heavyStyle=document.getElementById('pgame-native-runtime-style');" +
                        "if(!heavyStyle){" +

                        "heavyStyle=document.createElement('style');" +
                        "heavyStyle.id='pgame-native-runtime-style';" +

                        "heavyStyle.textContent=" +

                        "\"html.pgame-app,html.pgame-app body{\" +" +
                        "\"overscroll-behavior-y:none!important;\" +" +
                        "\"overscroll-behavior-x:none!important;\" +" +
                        "\"-webkit-user-select:none!important;\" +" +
                        "\"user-select:none!important;\" +" +
                        "\"-webkit-tap-highlight-color:transparent!important;\" +" +
                        "\"}\" +" +

                        "\"body.pgame-app footer,html.pgame-app footer{\" +" +
                        "\"display:none!important;\" +" +
                        "\"}\" +" +

                        "\"html.pgame-app *{-webkit-tap-highlight-color:transparent;}\" +" +

                        "\"html.pgame-app img{\" +" +
                        "\"-webkit-user-drag:none;\" +" +
                        "\"user-select:none;\" +" +
                        "\"}\" +" +

                        "\"html.pgame-app .backdrop-filter,html.pgame-app [style*='backdrop-filter']{\" +" +
                        "\"backdrop-filter:none!important;\" +" +
                        "\"-webkit-backdrop-filter:none!important;\" +" +
                        "\"}\" +" +

                        "\"html.pgame-app .vexon-global-menu-trigger{\" +" +
                        "\"display:none!important;\" +" +
                        "\"}\" +" +

                        "\"html.pgame-app .mobile-bottom-nav{\" +" +
                        "\"display:none!important;\" +" +
                        "\"}\" +" +

                        "\"html.pgame-app .pgame-page-transition{\" +" +
                        "\"animation:pgameNativePageIn 280ms cubic-bezier(.22,.61,.36,1);\" +" +
                        "\"}\" +" +

                        "\"@keyframes pgameNativePageIn{\" +" +
                        "\"from{opacity:0;transform:translateY(5px);}\" +" +
                        "\"to{opacity:1;transform:translateY(0);}\" +" +
                        "\"}\";" +

                        "document.head.appendChild(heavyStyle);" +
                        "}" +

                        /* -----------------------------
                           Page transition
                           ----------------------------- */

                        "var appRoot=document.getElementById('app')||document.body;" +

                        "if(appRoot){" +
                        "appRoot.classList.remove('pgame-page-transition');" +
                        "void appRoot.offsetWidth;" +
                        "appRoot.classList.add('pgame-page-transition');" +
                        "}" +

                        /* -----------------------------
                           Edge swipe hint zone
                           ----------------------------- */

                        "var edge=document.getElementById('pgame-edge-zone');" +
                        "if(!edge){" +
                        "edge=document.createElement('div');" +
                        "edge.id='pgame-edge-zone';" +
                        "edge.style.position='fixed';" +
                        "edge.style.left='0';" +
                        "edge.style.top='0';" +
                        "edge.style.bottom='0';" +
                        "edge.style.width='24px';" +
                        "edge.style.zIndex='9998';" +
                        "edge.style.pointerEvents='none';" +
                        "document.body.appendChild(edge);" +
                        "}" +

                        /* -----------------------------
                           Account cache bridge
                           ----------------------------- */

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
                        "return;" +
                        "}" +
                        "localStorage.setItem('pgame_account_cache_v1',JSON.stringify(account));" +
                        "}catch(e){}" +
                        "};" +

                        /* -----------------------------
                           Session bridge
                           ----------------------------- */

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

                        /* -----------------------------
                           Fast native-like navigation
                           ----------------------------- */

                        "window.PGameNativeApp.navigate=function(url){" +
                        "try{" +
                        "if(!url)return;" +
                        "document.documentElement.classList.add('pgame-navigating');" +
                        "setTimeout(function(){" +
                        "window.location.href=url;" +
                        "},30);" +
                        "}catch(e){" +
                        "window.location.href=url;" +
                        "}" +
                        "};" +

                        /* -----------------------------
                           Hide website hamburger
                           ----------------------------- */

                        "var trigger=document.getElementById('vexon-menu-trigger');" +
                        "if(trigger){" +
                        "trigger.style.display='none';" +
                        "trigger.setAttribute('aria-hidden','true');" +
                        "}" +

                        /* -----------------------------
                           Remove horizontal overflow
                           ----------------------------- */

                        "document.documentElement.style.overflowX='hidden';" +
                        "if(document.body){" +
                        "document.body.style.overflowX='hidden';" +
                        "}" +

                        /* -----------------------------
                           Install one-time click feedback
                           ----------------------------- */

                        "if(!window.__pgameNativeTouchFX){" +

                        "window.__pgameNativeTouchFX=true;" +

                        "document.addEventListener('click',function(ev){" +

                        "var el=ev.target&&ev.target.closest?" +
                        "ev.target.closest('button,a,.nav-item,.card,.game-card'):" +
                        "null;" +

                        "if(!el)return;" +

                        "el.classList.add('pgame-pressing');" +

                        "setTimeout(function(){" +
                        "el.classList.remove('pgame-pressing');" +
                        "},120);" +

                        "},{passive:true});" +

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
                        "if(window.PGameNavigation&&window.PGameNavigation.isOpen&&window.PGameNavigation.isOpen()){" +
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

        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    public void onPause() {
        if (webView != null) {
            webView.onPause();
        }

        super.onPause();
    }

    @Override
    public void onDestroy() {
        if (startupTimeoutRunnable != null) {
            handler.removeCallbacks(
                    startupTimeoutRunnable
            );
        }

        if (webView != null) {
            try {
                webView.stopLoading();
                webView.setWebChromeClient(null);
                webView.setWebViewClient(null);
                webView.destroy();
            } catch (Exception ignored) {
            }

            webView = null;
        }

        super.onDestroy();
    }
}