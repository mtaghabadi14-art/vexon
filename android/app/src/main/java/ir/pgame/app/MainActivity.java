package ir.pgame.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.media.MediaPlayer;
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


/*
 * =========================================================
 * PGAME MAIN ACTIVITY
 *
 * Features:
 *
 * - Capacitor WebView
 * - Immersive fullscreen
 * - PGame app mode
 * - Native HTTP compatible
 * - Custom splash
 * - Offline top banner
 * - Automatic online/offline detection
 * - Native PGame theme music
 * - Persistent music between pages
 * - Drawer/navigation support
 * - Native touch feedback
 * =========================================================
 */

public class MainActivity extends BridgeActivity {


    /*
     * =========================================================
     * CONFIG
     * =========================================================
     */

    private static final String PGAME_API_BASE =
            "https://s.vexongame.workers.dev";

    private static final long STARTUP_TIMEOUT =
            15000L;

    private static final long STARTUP_FINISH_DELAY =
            180L;

    private static final long APP_MODE_DELAY =
            250L;

    private static final long NETWORK_CHECK_INTERVAL =
            3000L;


    /*
     * =========================================================
     * VIEWS
     * =========================================================
     */

    private WebView webView;

    private ViewGroup rootLayout;

    private View splashOverlay;

    private View errorOverlay;

    private TextView offlineBanner;


    /*
     * =========================================================
     * AUDIO
     * =========================================================
     */

    private MediaPlayer pgameThemePlayer;


    /*
     * =========================================================
     * HANDLER / STATE
     * =========================================================
     */

    private final Handler handler =
            new Handler(
                    Looper.getMainLooper()
            );

    private boolean pageLoaded = false;

    private boolean startupFinished = false;

    private boolean startupTimeoutTriggered = false;

    private Runnable startupTimeoutRunnable;


    /*
     * =========================================================
     * NETWORK MONITOR
     * =========================================================
     */

    private final Runnable networkMonitor =
            new Runnable() {

                @Override
                public void run() {

                    updateNetworkBanner();

                    handler.postDelayed(
                            this,
                            NETWORK_CHECK_INTERVAL
                    );
                }
            };


    /*
     * =========================================================
     * CREATE
     * =========================================================
     */

    @Override
    protected void onCreate(
            @Nullable Bundle savedInstanceState
    ) {

        SplashScreen.installSplashScreen(
                this
        );

        /*
         * Capacitor owns the WebView.
         */
        super.onCreate(
                savedInstanceState
        );

        enableFullscreen();

        webView =
                getBridge().getWebView();

        rootLayout =
                findViewById(
                        android.R.id.content
                );

        if (webView == null) {
            return;
        }


        /*
         * WebView.
         */
        setupWebView();


        /*
         * Native UI.
         */
        createSplashOverlay();

        createErrorOverlay();

        createOfflineBanner();


        /*
         * Initial state.
         */
        showSplash();

        updateNetworkBanner();


        /*
         * Startup timeout.
         */
        startStartupTimeout();


        /*
         * PGame native mode.
         */
        handler.postDelayed(
                this::initializePGameAppMode,
                APP_MODE_DELAY
        );


        /*
         * Start music.
         */
        startPGameTheme();


        /*
         * Start network monitor.
         */
        handler.removeCallbacks(
                networkMonitor
        );

        handler.post(
                networkMonitor
        );
    }


    /*
     * =========================================================
     * WEBVIEW SETUP
     * =========================================================
     */

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {

        if (webView == null) {
            return;
        }


        WebSettings settings =
                webView.getSettings();


        /*
         * JavaScript.
         */
        settings.setJavaScriptEnabled(
                true
        );


        /*
         * Local storage.
         */
        settings.setDomStorageEnabled(
                true
        );

        settings.setDatabaseEnabled(
                true
        );


        /*
         * Windows / media.
         */
        settings.setJavaScriptCanOpenWindowsAutomatically(
                true
        );

        settings.setMediaPlaybackRequiresUserGesture(
                false
        );


        /*
         * Images.
         */
        settings.setLoadsImagesAutomatically(
                true
        );


        /*
         * Local files.
         */
        settings.setAllowFileAccess(
                true
        );

        settings.setAllowContentAccess(
                true
        );


        /*
         * Zoom.
         */
        settings.setSupportZoom(
                false
        );

        settings.setBuiltInZoomControls(
                false
        );

        settings.setDisplayZoomControls(
                false
        );


        /*
         * Layout.
         */
        settings.setLoadWithOverviewMode(
                false
        );

        settings.setUseWideViewPort(
                false
        );


        /*
         * Cache.
         */
        settings.setCacheMode(
                WebSettings.LOAD_DEFAULT
        );


        /*
         * Mixed content compatibility.
         */
        try {

            settings.setMixedContentMode(
                    WebSettings
                            .MIXED_CONTENT_COMPATIBILITY_MODE
            );

        } catch (Exception ignored) {
        }


        /*
         * Appearance.
         */
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


        /*
         * Cookies.
         */
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
         * Keep Capacitor's bridge.
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

                        pageLoaded =
                                false;

                        if (!startupFinished) {
                            showSplash();
                        }
                    }


                    @Override
                    public void onPageFinished(
                            WebView view,
                            String url
                    ) {

                        super.onPageFinished(
                                view,
                                url
                        );

                        pageLoaded =
                                true;

                        enableFullscreen();

                        handler.post(
                                MainActivity.this
                                        ::initializePGameAppMode
                        );

                        handler.post(
                                MainActivity.this
                                        ::updateNetworkBanner
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

                        super.onReceivedError(
                                view,
                                request,
                                error
                        );

                        /*
                         * Only main-frame errors should
                         * affect startup UI.
                         */
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

                        super.onReceivedHttpError(
                                view,
                                request,
                                response
                        );

                        /*
                         * The bundled local page should never
                         * normally give us a 5xx main-frame error.
                         */
                        if (
                                request != null &&
                                request.isForMainFrame() &&
                                response != null
                        ) {

                            int status =
                                    response.getStatusCode();

                            if (status >= 500) {

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


    /*
     * =========================================================
     * PGAME APP MODE
     * =========================================================
     */

    private void initializePGameAppMode() {

        if (webView == null) {
            return;
        }


        String js =
                "(function(){" +

                        "try{" +


                        /*
                         * -------------------------------------------------
                         * APP CLASS
                         * -------------------------------------------------
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
                         * -------------------------------------------------
                         * SCROLL
                         * -------------------------------------------------
                         */

                        "document.documentElement.style.overflowX='hidden';" +

                        "if(document.body){" +
                        "document.body.style.overflowX='hidden';" +
                        "}" +


                        /*
                         * -------------------------------------------------
                         * HIDE WEB FOOTER
                         * -------------------------------------------------
                         */

                        "document.querySelectorAll('footer')" +
                        ".forEach(function(el){" +
                        "el.style.display='none';" +
                        "});" +


                        /*
                         * -------------------------------------------------
                         * HIDE OLD WEBSITE HAMBURGER
                         * -------------------------------------------------
                         */

                        "var trigger=" +
                        "document.getElementById(" +
                        "'vexon-menu-trigger'" +
                        ");" +

                        "if(trigger){" +

                        "trigger.style.display='none';" +

                        "trigger.setAttribute(" +
                        "'aria-hidden'," +
                        "'true'" +
                        ");" +

                        "}" +


                        /*
                         * -------------------------------------------------
                         * HIDE MOBILE BOTTOM NAV
                         * -------------------------------------------------
                         */

                        "document.querySelectorAll(" +
                        "'.mobile-bottom-nav'" +
                        ").forEach(function(el){" +

                        "el.style.display='none';" +

                        "});" +


                        /*
                         * -------------------------------------------------
                         * NATIVE STYLE
                         * -------------------------------------------------
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
                        "}\" +" +

                        "\"html.pgame-app footer{" +
                        "display:none!important;" +
                        "}\" +" +

                        "\"html.pgame-app .mobile-bottom-nav{" +
                        "display:none!important;" +
                        "}\" +" +

                        "\"html.pgame-app img{" +
                        "-webkit-user-drag:none;" +
                        "}\";" +

                        "document.head.appendChild(style);" +

                        "}" +


                        /*
                         * -------------------------------------------------
                         * NATIVE APP OBJECT
                         * -------------------------------------------------
                         */

                        "window.PGameNativeApp=" +
                        "window.PGameNativeApp||{};" +

                        "window.PGameNativeApp.isNative=true;" +


                        /*
                         * -------------------------------------------------
                         * SESSION HELPERS
                         * -------------------------------------------------
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
                         * -------------------------------------------------
                         * ACCOUNT CACHE
                         * -------------------------------------------------
                         */

                        "window.PGameNativeApp.getCachedAccount=" +
                        "function(){" +

                        "try{" +

                        "var raw=" +
                        "localStorage.getItem(" +
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

                        "if(account){" +

                        "localStorage.setItem(" +
                        "'pgame_account_cache_v1'," +
                        "JSON.stringify(account)" +
                        ");" +

                        "}else{" +

                        "localStorage.removeItem(" +
                        "'pgame_account_cache_v1'" +
                        ");" +

                        "}" +

                        "}catch(e){}" +

                        "};" +


                        /*
                         * -------------------------------------------------
                         * APP NAVIGATION
                         * -------------------------------------------------
                         */

                        "window.PGameApp=" +
                        "window.PGameApp||{};" +

                        "window.PGameApp.isApp=true;" +


                        "window.PGameApp.navigate=" +
                        "function(url){" +

                        "try{" +

                        "if(!url)return;" +


                        "if(url.indexOf('sections/')===0){" +

                        "url='/'+url;" +

                        "}" +


                        "if(url==='index.html'){" +

                        "url='/index.html';" +

                        "}" +


                        "window.location.href=url;" +

                        "}catch(e){" +

                        "window.location.href=url;" +

                        "}" +

                        "};" +


                        /*
                         * -------------------------------------------------
                         * NAVIGATION MODULE
                         * -------------------------------------------------
                         */

                        "if(window.PGameNavigation&&" +

                        "typeof window.PGameNavigation." +
                        "initializeAppMode==='function'){" +

                        "window.PGameNavigation." +
                        "initializeAppMode();" +

                        "}" +


                        /*
                         * -------------------------------------------------
                         * TOUCH EFFECT
                         * -------------------------------------------------
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
                         * -------------------------------------------------
                         * HIDE FOOTER AGAIN
                         * -------------------------------------------------
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


    /*
     * =========================================================
     * SPLASH
     * =========================================================
     */

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


        /*
         * Background.
         */
        splash.setBackgroundColor(
                Color.rgb(
                        3,
                        4,
                        10
                )
        );


        /*
         * Main title.
         */
        TextView title =
                new TextView(this);

        title.setText(
                "PGAME"
        );

        title.setTextColor(
                Color.WHITE
        );

        title.setTextSize(
                24f
        );

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


        /*
         * Subtitle.
         */
        TextView subtitle =
                new TextView(this);

        subtitle.setText(
                "PLAY • COMPETE • LEVEL UP."
        );

        subtitle.setTextColor(
                Color.rgb(
                        116,
                        77,
                        255
                )
        );

        subtitle.setTextSize(
                10f
        );

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


        splash.setVisibility(
                View.VISIBLE
        );

        splash.setAlpha(
                1f
        );
    }


    /*
     * =========================================================
     * ERROR OVERLAY
     * =========================================================
     */

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
                Color.rgb(
                        3,
                        4,
                        10
                )
        );


        TextView text =
                new TextView(this);

        text.setText(
                "ارتباط با PGame برقرار نشد."
        );

        text.setTextColor(
                Color.WHITE
        );

        text.setTextSize(
                17f
        );

        text.setGravity(
                Gravity.CENTER
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


        errorOverlay.setVisibility(
                View.GONE
        );
    }


    /*
     * =========================================================
     * OFFLINE BANNER
     * =========================================================
     */

    private void createOfflineBanner() {

        if (rootLayout == null) {
            return;
        }


        TextView banner =
                new TextView(this);


        banner.setText(
                "⚠️  اینترنت نداری • بعضی قابلیت‌های آنلاین در دسترس نیستند"
        );


        banner.setTextColor(
                Color.WHITE
        );


        banner.setTextSize(
                12f
        );


        banner.setGravity(
                Gravity.CENTER
        );


        banner.setPadding(
                18,
                12,
                18,
                12
        );


        /*
         * Semi-dark warning background.
         */
        banner.setBackgroundColor(
                Color.rgb(
                        72,
                        26,
                        45
                )
        );


        FrameLayout.LayoutParams params =
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                );


        params.gravity =
                Gravity.TOP;


        rootLayout.addView(
                banner,
                params
        );


        offlineBanner =
                banner;


        offlineBanner.setVisibility(
                View.GONE
        );
    }


    /*
     * =========================================================
     * NETWORK STATE
     * =========================================================
     */

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


    private void updateNetworkBanner() {

        if (offlineBanner == null) {
            return;
        }


        boolean offline =
                isProbablyOffline();


        if (offline) {

            offlineBanner.setText(
                    "⚠️  اینترنت نداری • بعضی قابلیت‌های آنلاین در دسترس نیستند"
            );


            if (
                    offlineBanner.getVisibility() !=
                    View.VISIBLE
            ) {

                offlineBanner.setAlpha(
                        0f
                );

                offlineBanner.setVisibility(
                        View.VISIBLE
                );

                offlineBanner.animate()
                        .alpha(1f)
                        .setDuration(180L)
                        .start();
            }

        } else {

            if (
                    offlineBanner.getVisibility() ==
                    View.VISIBLE
            ) {

                offlineBanner.animate()
                        .alpha(0f)
                        .setDuration(150L)
                        .withEndAction(() -> {

                            if (offlineBanner != null) {

                                offlineBanner.setVisibility(
                                        View.GONE
                                );
                            }

                        })
                        .start();
            }
        }
    }


    /*
     * =========================================================
     * AUDIO
     * =========================================================
     */

    private void startPGameTheme() {

        try {

            /*
             * Create only once.
             */
            if (pgameThemePlayer == null) {

                pgameThemePlayer =
                        MediaPlayer.create(
                                this,
                                R.raw.pgame_main_theme_v3
                        );


                if (pgameThemePlayer == null) {

                    return;
                }


                /*
                 * Loop forever.
                 */
                pgameThemePlayer.setLooping(
                        true
                );


                /*
                 * Reasonable initial volume.
                 */
                pgameThemePlayer.setVolume(
                        0.75f,
                        0.75f
                );
            }


            /*
             * Start only when needed.
             */
            if (
                    !pgameThemePlayer.isPlaying()
            ) {

                pgameThemePlayer.start();
            }


        } catch (Exception error) {

            error.printStackTrace();
        }
    }


    private void pausePGameTheme() {

        try {

            if (
                    pgameThemePlayer != null &&
                    pgameThemePlayer.isPlaying()
            ) {

                pgameThemePlayer.pause();
            }

        } catch (Exception error) {

            error.printStackTrace();
        }
    }


    private void releasePGameTheme() {

        try {

            if (pgameThemePlayer != null) {

                pgameThemePlayer.release();

                pgameThemePlayer =
                        null;
            }

        } catch (Exception error) {

            error.printStackTrace();

            pgameThemePlayer =
                    null;
        }
    }


    /*
     * =========================================================
     * STARTUP
     * =========================================================
     */

    private void startStartupTimeout() {

        startupTimeoutRunnable =
                () -> {

                    if (
                            !startupFinished
                    ) {

                        startupTimeoutTriggered =
                                true;

                        /*
                         * IMPORTANT:
                         *
                         * The PGame bundle is local.
                         *
                         * A startup timeout therefore means
                         * something unusual happened.
                         */
                        if (
                                isProbablyOffline()
                        ) {

                            hideSplash();

                            /*
                             * Do NOT cover the whole app.
                             * Only show the small banner.
                             */
                            updateNetworkBanner();

                        } else {

                            showError();
                        }
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


        startupFinished =
                true;


        pageLoaded =
                true;


        if (
                startupTimeoutRunnable !=
                null
        ) {

            handler.removeCallbacks(
                    startupTimeoutRunnable
            );
        }


        hideSplash();

        updateNetworkBanner();
    }


    /*
     * =========================================================
     * SPLASH VISIBILITY
     * =========================================================
     */

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


    /*
     * =========================================================
     * ERROR
     * =========================================================
     */

    private void showOfflineOrError() {

        if (isProbablyOffline()) {

            hideSplash();

            updateNetworkBanner();

        } else {

            showError();
        }
    }


    private void showError() {

        hideSplash();

        if (errorOverlay == null) {
            return;
        }


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


    private void hideError() {

        if (errorOverlay == null) {
            return;
        }


        errorOverlay.animate()
                .alpha(0f)
                .setDuration(120L)
                .withEndAction(() -> {

                    if (errorOverlay != null) {

                        errorOverlay.setVisibility(
                                View.GONE
                        );
                    }

                })
                .start();
    }


    /*
     * =========================================================
     * FULLSCREEN
     * =========================================================
     */

    private void enableFullscreen() {

        Window window =
                getWindow();


        if (window == null) {
            return;
        }


        if (
                android.os.Build.VERSION.SDK_INT >=
                android.os.Build.VERSION_CODES.R
        ) {

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

        } else {

            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            |
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            |
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }


    /*
     * =========================================================
     * RESUME
     * =========================================================
     */

    @Override
    protected void onResume() {

        super.onResume();


        enableFullscreen();


        updateNetworkBanner();


        /*
         * Resume theme.
         */
        startPGameTheme();


        /*
         * Restart network monitoring.
         */
        handler.removeCallbacks(
                networkMonitor
        );

        handler.post(
                networkMonitor
        );


        /*
         * Re-apply native mode.
         */
        handler.post(
                this::initializePGameAppMode
        );
    }


    /*
     * =========================================================
     * PAUSE / STOP
     * =========================================================
     */

    @Override
    protected void onStop() {

        handler.removeCallbacks(
                networkMonitor
        );


        /*
         * Pause music when app really leaves
         * foreground.
         */
        pausePGameTheme();


        super.onStop();
    }


    /*
     * =========================================================
     * BACK
     * =========================================================
     */

    @Override
    public void onBackPressed() {

        if (webView == null) {

            super.onBackPressed();

            return;
        }


        /*
         * First close PGame drawer.
         */
        String js =
                "(function(){" +
                        "try{" +

                        "if(window.PGameNavigation&&" +

                        "typeof window.PGameNavigation.isOpen===" +
                        "'function'&&" +

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

                    if (
                            "\"drawer\""
                                    .equals(result)
                    ) {

                        return;
                    }


                    /*
                     * Then WebView history.
                     */
                    if (
                            webView.canGoBack()
                    ) {

                        webView.goBack();

                    } else {

                        MainActivity.super
                                .onBackPressed();
                    }
                }
        );
    }


    /*
     * =========================================================
     * DESTROY
     * =========================================================
     */

    @Override
    protected void onDestroy() {

        handler.removeCallbacksAndMessages(
                null
        );


        releasePGameTheme();


        super.onDestroy();
    }
}

