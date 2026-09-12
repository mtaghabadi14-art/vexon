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

    /*
     * =========================================================
     * PGAME APP CONFIG
     * =========================================================
     */

    private static final String PGAME_API_BASE =
            "https://s.vexongame.workers.dev";

    private static final long STARTUP_TIMEOUT = 15000L;
    private static final long STARTUP_FINISH_DELAY = 180L;
    private static final long APP_MODE_DELAY = 250L;


    /*
     * =========================================================
     * VIEWS
     * =========================================================
     */

    private WebView webView;
    private ViewGroup rootLayout;

    private View splashOverlay;
    private View offlineOverlay;
    private View errorOverlay;


    /*
     * =========================================================
     * HANDLER / STARTUP STATE
     * =========================================================
     */

    private final Handler handler =
            new Handler(Looper.getMainLooper());

    private boolean pageLoaded = false;
    private boolean startupFinished = false;
    private boolean startupTimeoutTriggered = false;

    private Runnable startupTimeoutRunnable;


    /*
     * =========================================================
     * CREATE
     * =========================================================
     */

    @Override
    protected void onCreate(
            @Nullable Bundle savedInstanceState
    ) {

        SplashScreen.installSplashScreen(this);

        /*
         * IMPORTANT:
         *
         * Capacitor owns its own WebView and layout.
         *
         * We do NOT call setContentView().
         * We do NOT create another WebView.
         * We do NOT detach Capacitor's WebView.
         */
        super.onCreate(savedInstanceState);

        enableFullscreen();

        webView = getBridge().getWebView();

        /*
         * android.R.id.content is used only for
         * temporary native overlays.
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

            handler.postDelayed(
                    this::initializePGameAppMode,
                    APP_MODE_DELAY
            );
        }
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

        /*
         * Keep compatibility with external API resources.
         */
        try {

            settings.setMixedContentMode(
                    WebSettings
                            .MIXED_CONTENT_COMPATIBILITY_MODE
            );

        } catch (Exception ignored) {
        }


        /*
         * WebView appearance.
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
         * IMPORTANT:
         *
         * Do NOT replace Capacitor's WebChromeClient.
         *
         * We only subclass BridgeWebViewClient.
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
                         * Re-apply app mode on every local page.
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
                         * Preserve Capacitor behavior.
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
                         *
                         * IMPORTANT:
                         * Only horizontal overflow is hidden.
                         * Vertical scrolling remains completely normal.
                         * -------------------------------------------------
                         */

                        "document.documentElement.style.overflowX=" +
                        "'hidden';" +

                        "if(document.body){" +
                        "document.body.style.overflowX='hidden';" +
                        "}" +


                        /*
                         * -------------------------------------------------
                         * HIDE WEBSITE FOOTER
                         * -------------------------------------------------
                         */

                        "document.querySelectorAll('footer')" +
                        ".forEach(function(el){" +
                        "el.style.display='none';" +
                        "});" +


                        /*
                         * -------------------------------------------------
                         * HIDE WEBSITE HAMBURGER
                         * -------------------------------------------------
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
                         * -------------------------------------------------
                         * HIDE WEBSITE MOBILE BOTTOM NAV
                         * -------------------------------------------------
                         */

                        "document.querySelectorAll(" +
                        "'.mobile-bottom-nav'" +
                        ").forEach(function(el){" +
                        "el.style.display='none';" +
                        "});" +


                        /*
                         * -------------------------------------------------
                         * RUNTIME STYLE
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

                        "\"html.pgame-app img{" +
                        "-webkit-user-drag:none;" +
                        "}\" +" +

                        "\"html.pgame-app .mobile-bottom-nav{" +
                        "display:none!important;" +
                        "}\"; " +

                        "document.head.appendChild(style);" +

                        "}" +


                        /*
                         * =================================================
                         * NATIVE APP OBJECT
                         * =================================================
                         */

                        "window.PGameNativeApp=" +
                        "window.PGameNativeApp||{};" +

                        "window.PGameNativeApp.isNative=true;" +


                        /*
                         * -------------------------------------------------
                         * ACCOUNT CACHE
                         * -------------------------------------------------
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
                         * -------------------------------------------------
                         * SESSION
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
                         * =================================================
                         * GLOBAL API FETCH PATCH
                         *
                         * This is the important fix.
                         *
                         * fetch('/api/...')
                         *      ↓
                         * https://s.vexongame.workers.dev/api/...
                         *
                         * Only active inside the Android app.
                         * =================================================
                         */

                        "if(!window.__PGAME_API_FETCH_PATCHED__){" +

                        "window.__PGAME_API_FETCH_PATCHED__=true;" +

                        "var PGAME_NATIVE_API_BASE=" +
                        "'" + PGAME_API_BASE + "';" +

                        "var PGAME_NATIVE_ORIGINAL_FETCH=" +
                        "window.fetch.bind(window);" +


                        "window.fetch=function(input,init){" +

                        "try{" +

                        "var url='';" +

                        "var originalRequest=null;" +

                        /*
                         * Detect Request objects safely.
                         */
                        "if(typeof Request!=='undefined'&&" +
                        "input instanceof Request){" +

                        "originalRequest=input;" +
                        "url=input.url;" +

                        "}else{" +

                        "url=String(input||'');" +

                        "}" +


                        /*
                         * Only rewrite relative /api requests.
                         *
                         * Absolute Worker URLs are left alone.
                         */
                        "var isRelativeApi=" +
                        "(url==='/api'||url.indexOf('/api/')===0);" +

                        "if(!isRelativeApi){" +

                        "return PGAME_NATIVE_ORIGINAL_FETCH(" +
                        "input,init" +
                        ");" +

                        "}" +


                        /*
                         * Build Worker URL.
                         */
                        "var targetUrl=" +
                        "PGAME_NATIVE_API_BASE+url;" +


                        /*
                         * Headers.
                         */
                        "var headers;" +

                        "if(init&&init.headers){" +

                        "headers=new Headers(init.headers);" +

                        "}else if(originalRequest){" +

                        "headers=new Headers(" +
                        "originalRequest.headers" +
                        ");" +

                        "}else{" +

                        "headers=new Headers();" +

                        "}" +


                        /*
                         * Tell Worker that request comes from app.
                         */
                        "headers.set(" +
                        "'X-PGame-App'," +
                        "'1'" +
                        ");" +


                        /*
                         * Session.
                         */
                        "var session='';" +

                        "try{" +

                        "session=" +
                        "localStorage.getItem(" +
                        "'pgame_app_session'" +
                        ")||'';" +

                        "}catch(sessionError){}" +


                        /*
                         * Add Bearer token if one exists.
                         */
                        "if(session&&" +
                        "!headers.has('Authorization')){" +

                        "headers.set(" +
                        "'Authorization'," +
                        "'Bearer '+session" +
                        ");" +

                        "}" +


                        /*
                         * -------------------------------------------------
                         * NORMAL STRING FETCH
                         * -------------------------------------------------
                         */

                        "if(!originalRequest){" +

                        "var nextInit={" +
                        "...(init||{})," +
                        "headers:headers," +
                        "credentials:'omit'" +
                        "};" +

                        "return PGAME_NATIVE_ORIGINAL_FETCH(" +
                        "targetUrl," +
                        "nextInit" +
                        ");" +

                        "}" +


                        /*
                         * -------------------------------------------------
                         * REQUEST OBJECT FETCH
                         *
                         * Preserve method/body/options.
                         * -------------------------------------------------
                         */

                        "var requestInit={" +

                        "method:originalRequest.method," +

                        "headers:headers," +

                        "credentials:'omit'," +

                        "cache:originalRequest.cache," +

                        "redirect:originalRequest.redirect," +

                        "referrer:originalRequest.referrer," +

                        "referrerPolicy:" +
                        "originalRequest.referrerPolicy," +

                        "integrity:originalRequest.integrity," +

                        "keepalive:originalRequest.keepalive" +

                        "};" +


                        /*
                         * Body cannot be sent with GET/HEAD.
                         */
                        "if(" +
                        "originalRequest.method!=='GET'&&" +
                        "originalRequest.method!=='HEAD'" +
                        "){" +

                        "try{" +
                        "requestInit.body=" +
                        "originalRequest.clone().body;" +
                        "}catch(bodyError){}" +

                        "}" +


                        "var rewrittenRequest=" +
                        "new Request(" +
                        "targetUrl," +
                        "requestInit" +
                        ");" +

                        "return PGAME_NATIVE_ORIGINAL_FETCH(" +
                        "rewrittenRequest" +
                        ");" +


                        "}catch(fetchError){" +

                        /*
                         * Never break normal fetch behavior.
                         */
                        "return PGAME_NATIVE_ORIGINAL_FETCH(" +
                        "input,init" +
                        ");" +

                        "}" +

                        "};" +

                        "}" +


                        /*
                         * =================================================
                         * APP NAVIGATION
                         * =================================================
                         */

                        "window.PGameApp=" +
                        "window.PGameApp||{};" +

                        "window.PGameApp.isApp=true;" +


                        "window.PGameApp.navigate=" +
                        "function(url){" +

                        "try{" +

                        "if(!url)return;" +


                        /*
                         * Convert section paths to root-relative paths.
                         *
                         * Example:
                         * sections/news.html
                         *
                         * always becomes:
                         * /sections/news.html
                         */
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
                         * =================================================
                         * NAVIGATION MODULE
                         * =================================================
                         */

                        "if(window.PGameNavigation&&" +
                        "typeof window.PGameNavigation." +
                        "initializeAppMode==='function'){" +

                        "window.PGameNavigation." +
                        "initializeAppMode();" +

                        "}" +


                        /*
                         * =================================================
                         * TOUCH FEEDBACK
                         * =================================================
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
                         * Footer can be injected dynamically.
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
     * FULLSCREEN
     * =========================================================
     */

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


    /*
     * =========================================================
     * STARTUP TIMEOUT
     * =========================================================
     */

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

        splash.setBackgroundColor(
                Color.rgb(3, 4, 10)
        );


        /*
         * P logo.
         */
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


        /*
         * PGAME title.
         */
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


        /*
         * Subtitle.
         */
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


    /*
     * =========================================================
     * OFFLINE OVERLAY
     * =========================================================
     */

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


    /*
     * =========================================================
     * SPLASH CONTROL
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
     * OFFLINE / ERROR
     * =========================================================
     */

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


    /*
     * =========================================================
     * BACK BUTTON
     * =========================================================
     */

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


    /*
     * =========================================================
     * RESUME
     * =========================================================
     */

    @Override
    public void onResume() {

        super.onResume();

        enableFullscreen();

        /*
         * Re-check app mode whenever the app
         * comes back to foreground.
         */
        if (webView != null) {

            handler.postDelayed(
                    this::initializePGameAppMode,
                    120L
            );
        }
    }


    /*
     * =========================================================
     * PAUSE
     * =========================================================
     */

    @Override
    public void onPause() {

        super.onPause();
    }


    /*
     * =========================================================
     * DESTROY
     * =========================================================
     */

    @Override
    public void onDestroy() {

        if (startupTimeoutRunnable != null) {

            handler.removeCallbacks(
                    startupTimeoutRunnable
            );
        }


        /*
         * Capacitor owns WebView lifecycle.
         *
         * DO NOT call webView.destroy().
         */
        webView = null;

        super.onDestroy();
    }
}