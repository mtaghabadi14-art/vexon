package ir.pgame.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "PGame";

    private static final long STARTUP_TIMEOUT = 15000L;
    private static final long TRANSITION_MS = 280L;

    private WebView webView;

    private FrameLayout root;

    private FrameLayout splashOverlay;
    private FrameLayout offlineOverlay;
    private FrameLayout errorOverlay;

    private boolean startupFinished = false;
    private boolean startupErrorShown = false;
    private boolean offlineShown = false;

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

    private final Handler handler =
            new Handler(Looper.getMainLooper());

    private final Runnable startupTimeoutRunnable =
            () -> {

                if (startupFinished || startupErrorShown) {
                    return;
                }

                if (webView == null) {
                    return;
                }

                if (!hasInternet()) {
                    hideSplash();
                    showOffline();
                    return;
                }

                showStartupError();
            };

    // =========================================================
    // CREATE
    // =========================================================

    @Override
    public void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        setupFullscreen();

        root = findViewById(android.R.id.content);

        webView =
                getBridge()
                        .getWebView();

        setupWebView();

        createSplash();

        createOfflineOverlay();

        createErrorOverlay();

        registerNetworkCallback();

        if (hasInternet()) {

            startStartupWatcher();

        } else {

            hideSplash();
            showOffline();

        }
    }

    // =========================================================
    // FULLSCREEN
    // =========================================================

    private void setupFullscreen() {

        WindowCompat.setDecorFitsSystemWindows(
                getWindow(),
                false
        );

        getWindow().setStatusBarColor(
                Color.TRANSPARENT
        );

        getWindow().setNavigationBarColor(
                Color.TRANSPARENT
        );

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(
                        getWindow(),
                        getWindow().getDecorView()
                );

        if (controller != null) {

            controller.hide(
                    WindowInsetsCompat.Type.systemBars()
            );

            controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat
                            .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );

            controller.setAppearanceLightStatusBars(
                    false
            );

            controller.setAppearanceLightNavigationBars(
                    false
            );
        }
    }

    private void keepFullscreen() {

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(
                        getWindow(),
                        getWindow().getDecorView()
                );

        if (controller != null) {

            controller.hide(
                    WindowInsetsCompat.Type.systemBars()
            );
        }
    }

    // =========================================================
    // WEBVIEW
    // =========================================================

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

        settings.setSaveFormData(true);

        settings.setAllowFileAccess(true);

        settings.setAllowContentAccess(true);

        settings.setLoadsImagesAutomatically(true);

        settings.setJavaScriptCanOpenWindowsAutomatically(false);

        settings.setSupportMultipleWindows(false);

        /*
         * حافظه و سرعت
         */
        settings.setCacheMode(
                WebSettings.LOAD_DEFAULT
        );

        /*
         * Splash و Background
         */
        webView.setBackgroundColor(
                Color.rgb(3, 4, 10)
        );

        /*
         * Cookie / Session
         */
        CookieManager cookieManager =
                CookieManager.getInstance();

        cookieManager.setAcceptCookie(true);

        cookieManager.setAcceptThirdPartyCookies(
                webView,
                true
        );

        cookieManager.flush();

        /*
         * Clients
         */
        webView.setWebChromeClient(
                new WebChromeClient()
        );

        webView.setWebViewClient(
                new WebViewClient() {

                    @Override
                    public void onPageFinished(
                            WebView view,
                            String url
                    ) {

                        super.onPageFinished(
                                view,
                                url
                        );

                        keepFullscreen();

                        injectPGameAppMode();

                        handler.postDelayed(
                                MainActivity.this::finishStartupIfNeeded,
                                180
                        );
                    }
                }
        );
    }

    // =========================================================
    // STARTUP WATCHER
    // =========================================================

    private void startStartupWatcher() {

        startupFinished = false;

        handler.postDelayed(
                startupTimeoutRunnable,
                STARTUP_TIMEOUT
        );

        handler.post(
                new Runnable() {

                    @Override
                    public void run() {

                        if (startupFinished ||
                                startupErrorShown) {
                            return;
                        }

                        if (webView == null) {
                            handler.postDelayed(
                                    this,
                                    200
                            );
                            return;
                        }

                        int progress =
                                webView.getProgress();

                        if (progress >= 100) {

                            finishStartupIfNeeded();

                            return;
                        }

                        if (!hasInternet()) {

                            hideSplash();
                            showOffline();

                            return;
                        }

                        handler.postDelayed(
                                this,
                                180
                        );
                    }
                }
        );
    }

    private void finishStartupIfNeeded() {

        if (startupFinished) {
            return;
        }

        startupFinished = true;

        handler.removeCallbacks(
                startupTimeoutRunnable
        );

        injectPGameAppMode();

        handler.postDelayed(
                this::hideSplash,
                180
        );
    }

    // =========================================================
    // PGAME APP MODE
    // =========================================================

    private void injectPGameAppMode() {

        if (webView == null) {
            return;
        }

        String script =
                "(function(){"

                + "if(window.__PGAME_APP_MODE__) return;"
                + "window.__PGAME_APP_MODE__=true;"

                + "document.documentElement.classList.add('pgame-app');"
                + "document.body.classList.add('pgame-app');"

                + "if(!document.getElementById('pgame-app-style')){"

                + "var s=document.createElement('style');"
                + "s.id='pgame-app-style';"

                + "s.textContent=`"

                // =================================================
                // BASE PERFORMANCE
                // =================================================

                + "html.pgame-app,body.pgame-app{"
                + "overscroll-behavior-x:none;"
                + "background:#03040a!important;"
                + "}"

                + "body.pgame-app *{"
                + "max-width:100%;"
                + "}"

                // =================================================
                // HIDE FOOTER
                // =================================================

                + "body.pgame-app footer,"
                + "body.pgame-app .footer,"
                + "body.pgame-app [class*='footer']{"
                + "display:none!important;"
                + "}"

                // =================================================
                // REMOVE HEAVY EFFECTS
                // =================================================

                + "body.pgame-app .nebula{"
                + "filter:none!important;"
                + "opacity:.16!important;"
                + "}"

                + "body.pgame-app .navbar,"
                + "body.pgame-app .pgame-feature-node,"
                + "body.pgame-app .feature-node{"
                + "backdrop-filter:none!important;"
                + "-webkit-backdrop-filter:none!important;"
                + "}"

                + "body.pgame-app .planet{"
                + "filter:none!important;"
                + "box-shadow:none!important;"
                + "}"

                + "body.pgame-app .pgame-road-line,"
                + "body.pgame-app .road-line{"
                + "animation:none!important;"
                + "filter:none!important;"
                + "}"

                + "body.pgame-app .pgame-road-point,"
                + "body.pgame-app .pgame-road-core{"
                + "animation:none!important;"
                + "filter:none!important;"
                + "}"

                + "body.pgame-app .pgame-core-glow{"
                + "filter:none!important;"
                + "}"

                + "body.pgame-app .header-xp-fill{"
                + "animation:none!important;"
                + "}"

                // =================================================
                // PAGE TRANSITIONS
                // =================================================

                + "body.pgame-app{"
                + "opacity:1;"
                + "transition:opacity .28s ease,transform .28s ease;"
                + "}"

                + "body.pgame-app.pgame-page-leaving{"
                + "opacity:0!important;"
                + "transform:translateY(5px)!important;"
                + "pointer-events:none!important;"
                + "}"

                // =================================================
                // EDGE SWIPE ZONE
                // =================================================

                + ".pgame-edge-zone{"
                + "position:fixed;"
                + "left:0;"
                + "top:0;"
                + "bottom:0;"
                + "width:22px;"
                + "z-index:999998;"
                + "background:transparent;"
                + "touch-action:none;"
                + "}"

                // =================================================
                // DRAWER OVERLAY
                // =================================================

                + ".pgame-app-overlay{"
                + "position:fixed;"
                + "inset:0;"
                + "z-index:999997;"
                + "background:rgba(0,0,0,.54);"
                + "opacity:0;"
                + "visibility:hidden;"
                + "pointer-events:none;"
                + "transition:opacity .24s ease,visibility .24s ease;"
                + "}"

                + ".pgame-app-overlay.open{"
                + "opacity:1;"
                + "visibility:visible;"
                + "pointer-events:auto;"
                + "}"

                // =================================================
                // DRAWER
                // =================================================

                + ".pgame-app-drawer{"
                + "position:absolute;"
                + "left:0;"
                + "top:0;"
                + "bottom:0;"
                + "width:min(300px,82vw);"
                + "background:#060a12;"
                + "border-right:1px solid rgba(116,77,255,.24);"
                + "box-shadow:18px 0 50px rgba(0,0,0,.48);"
                + "transform:translateX(-100%);"
                + "transition:transform .28s cubic-bezier(.22,.8,.24,1);"
                + "display:flex;"
                + "flex-direction:column;"
                + "padding:18px 12px 14px;"
                + "box-sizing:border-box;"
                + "}"

                + ".pgame-app-overlay.open .pgame-app-drawer{"
                + "transform:translateX(0);"
                + "}"

                // =================================================
                // DRAWER HEADER
                // =================================================

                + ".pgame-app-drawer-head{"
                + "display:flex;"
                + "align-items:center;"
                + "justify-content:space-between;"
                + "gap:10px;"
                + "padding:4px 6px 14px;"
                + "border-bottom:1px solid rgba(255,255,255,.06);"
                + "margin-bottom:8px;"
                + "}"

                + ".pgame-app-brand{"
                + "font-family:Orbitron,sans-serif;"
                + "font-size:20px;"
                + "font-weight:900;"
                + "color:white;"
                + "}"

                + ".pgame-app-brand .p{"
                + "color:#744dff;"
                + "text-shadow:0 0 14px rgba(116,77,255,.55);"
                + "}"

                + ".pgame-app-subtitle{"
                + "font-size:7px;"
                + "color:#75788c;"
                + "margin-top:3px;"
                + "letter-spacing:.08em;"
                + "}"

                + ".pgame-app-close{"
                + "width:36px;"
                + "height:36px;"
                + "border:0;"
                + "border-radius:10px;"
                + "background:rgba(255,255,255,.05);"
                + "color:white;"
                + "font-size:19px;"
                + "}"

                // =================================================
                // DRAWER LINKS
                // =================================================

                + ".pgame-app-links{"
                + "display:flex;"
                + "flex-direction:column;"
                + "gap:5px;"
                + "overflow:auto;"
                + "padding:2px 0;"
                + "-webkit-overflow-scrolling:touch;"
                + "}"

                + ".pgame-app-link{"
                + "display:flex;"
                + "align-items:center;"
                + "gap:10px;"
                + "min-height:42px;"
                + "padding:6px 9px;"
                + "border-radius:11px;"
                + "text-decoration:none;"
                + "color:white;"
                + "background:rgba(255,255,255,.025);"
                + "border:1px solid transparent;"
                + "box-sizing:border-box;"
                + "transition:background .18s ease,border-color .18s ease;"
                + "}"

                + ".pgame-app-link:active{"
                + "background:rgba(116,77,255,.12);"
                + "}"

                + ".pgame-app-icon{"
                + "width:29px;"
                + "height:29px;"
                + "display:flex;"
                + "align-items:center;"
                + "justify-content:center;"
                + "border-radius:8px;"
                + "background:rgba(255,255,255,.04);"
                + "font-size:14px;"
                + "flex:none;"
                + "}"

                + ".pgame-app-link-title{"
                + "flex:1;"
                + "font-size:11px;"
                + "text-align:right;"
                + "}"

                + ".pgame-app-arrow{"
                + "font-size:13px;"
                + "color:rgba(255,255,255,.42);"
                + "}"

                // =================================================
                // HUD
                // =================================================

                + ".pgame-app-hud{"
                + "position:fixed;"
                + "left:14px;"
                + "right:14px;"
                + "top:max(10px,env(safe-area-inset-top));"
                + "height:48px;"
                + "z-index:99990;"
                + "pointer-events:none;"
                + "display:flex;"
                + "align-items:center;"
                + "justify-content:space-between;"
                + "gap:12px;"
                + "}"

                + ".pgame-hud-side{"
                + "display:flex;"
                + "align-items:center;"
                + "pointer-events:auto;"
                + "}"

                // =================================================
                // LEVEL
                // =================================================

                + ".pgame-level-badge{"
                + "width:42px;"
                + "height:42px;"
                + "border-radius:50%;"
                + "display:flex;"
                + "align-items:center;"
                + "justify-content:center;"
                + "background:#070b14;"
                + "border:1px solid rgba(116,77,255,.5);"
                + "box-shadow:0 0 16px rgba(116,77,255,.18);"
                + "color:#fff;"
                + "font-weight:900;"
                + "font-size:11px;"
                + "}"

                // =================================================
                // XP AREA
                // =================================================

                + ".pgame-xp-area{"
                + "flex:1;"
                + "min-width:0;"
                + "display:flex;"
                + "flex-direction:column;"
                + "gap:4px;"
                + "}"

                + ".pgame-xp-bar{"
                + "width:100%;"
                + "height:4px;"
                + "border-radius:99px;"
                + "overflow:hidden;"
                + "background:rgba(255,255,255,.09);"
                + "}"

                + ".pgame-xp-fill{"
                + "height:100%;"
                + "width:0%;"
                + "border-radius:99px;"
                + "background:linear-gradient(90deg,#744dff,#00eaff,#00ff9d);"
                + "transition:width .6s ease;"
                + "}"

                + ".pgame-coins{"
                + "font-size:8px;"
                + "color:#ffd95a;"
                + "text-align:center;"
                + "min-height:9px;"
                + "}"

                // =================================================
                // AVATAR
                // =================================================

                + ".pgame-avatar{"
                + "width:42px;"
                + "height:42px;"
                + "border-radius:50%;"
                + "overflow:hidden;"
                + "border:1px solid rgba(0,255,157,.38);"
                + "background:#0a1018;"
                + "display:flex;"
                + "align-items:center;"
                + "justify-content:center;"
                + "box-shadow:0 0 14px rgba(0,255,157,.12);"
                + "}"

                + ".pgame-avatar img{"
                + "width:100%;"
                + "height:100%;"
                + "object-fit:cover;"
                + "}"

                // =================================================
                // SAFE MOBILE
                // =================================================

                + "@media(max-width:520px){"
                + ".pgame-app-drawer{width:min(285px,82vw);}"
                + ".pgame-app-hud{left:10px;right:10px;}"
                + "}"

                + "`;"

                + "document.head.appendChild(s);"
                + "}"

                // =====================================================
                // EDGE ZONE
                // =====================================================

                + "if(!document.querySelector('.pgame-edge-zone')){"

                + "var edge=document.createElement('div');"
                + "edge.className='pgame-edge-zone';"
                + "document.body.appendChild(edge);"

                + "}"

                // =====================================================
                // DRAWER
                // =====================================================

                + "if(!document.getElementById('pgame-app-overlay')){"

                + "var overlay=document.createElement('div');"
                + "overlay.id='pgame-app-overlay';"
                + "overlay.className='pgame-app-overlay';"

                + "var drawer=document.createElement('aside');"
                + "drawer.className='pgame-app-drawer';"

                + "drawer.innerHTML=`"

                + "<div class='pgame-app-drawer-head'>"
                + "<div>"
                + "<div class='pgame-app-brand'>"
                + "<span class='p'>P</span>Game"
                + "</div>"
                + "<div class='pgame-app-subtitle'>"
                + "PLAY • COMPETE • LEVEL UP."
                + "</div>"
                + "</div>"
                + "<button class='pgame-app-close' type='button'>×</button>"
                + "</div>"

                + "<nav class='pgame-app-links'>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? '../index.html' : 'index.html'}'>"
                + "<span class='pgame-app-icon'>P</span>"
                + "<span class='pgame-app-link-title'>خانه</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'games.html' : 'sections/games.html'}'>"
                + "<span class='pgame-app-icon'>🎮</span>"
                + "<span class='pgame-app-link-title'>بازی‌ها</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'leaderboard.html' : 'sections/leaderboard.html'}'>"
                + "<span class='pgame-app-icon'>🏆</span>"
                + "<span class='pgame-app-link-title'>لیدربورد</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'cafe.html' : 'sections/cafe.html'}'>"
                + "<span class='pgame-app-icon'>☕</span>"
                + "<span class='pgame-app-link-title'>کافه بازی</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'news.html' : 'sections/news.html'}'>"
                + "<span class='pgame-app-icon'>📢</span>"
                + "<span class='pgame-app-link-title'>اخبار</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'guide.html' : 'sections/guide.html'}'>"
                + "<span class='pgame-app-icon'>❓</span>"
                + "<span class='pgame-app-link-title'>راهنما</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'creators.html' : 'sections/creators.html'}'>"
                + "<span class='pgame-app-icon'>👨‍💻</span>"
                + "<span class='pgame-app-link-title'>سازندگان</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'messenger.html' : 'sections/messenger.html'}'>"
                + "<span class='pgame-app-icon'>💬</span>"
                + "<span class='pgame-app-link-title'>پیام‌رسان</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "<a class='pgame-app-link' href='${location.pathname.includes('/sections/') ? 'friends.html' : 'sections/friends.html'}'>"
                + "<span class='pgame-app-icon'>👥</span>"
                + "<span class='pgame-app-link-title'>دوستان</span>"
                + "<span class='pgame-app-arrow'>›</span>"
                + "</a>"

                + "</nav>"

                + "`;"

                + "overlay.appendChild(drawer);"
                + "document.body.appendChild(overlay);"

                + "}"

                // =====================================================
                // OPEN / CLOSE
                // =====================================================

                + "var overlay=document.getElementById('pgame-app-overlay');"
                + "var drawer=overlay.querySelector('.pgame-app-drawer');"
                + "var closeBtn=overlay.querySelector('.pgame-app-close');"
                + "var edge=document.querySelector('.pgame-edge-zone');"

                + "function openMenu(){"
                + "overlay.classList.add('open');"
                + "document.body.style.overflow='hidden';"
                + "}"

                + "function closeMenu(){"
                + "overlay.classList.remove('open');"
                + "document.body.style.overflow='';"
                + "}"

                + "closeBtn.onclick=closeMenu;"

                + "overlay.addEventListener('click',function(e){"
                + "if(e.target===overlay) closeMenu();"
                + "});"

                // =====================================================
                // EDGE SWIPE
                // =====================================================

                + "var startX=0;"
                + "var startY=0;"
                + "var tracking=false;"
                + "var openedBySwipe=false;"

                + "function beginTouch(x,y){"
                + "startX=x;"
                + "startY=y;"
                + "tracking=true;"
                + "openedBySwipe=false;"
                + "}"

                + "function moveTouch(x,y){"

                + "if(!tracking) return;"

                + "var dx=x-startX;"
                + "var dy=Math.abs(y-startY);"

                + "if(dy>70){"
                + "tracking=false;"
                + "return;"
                + "}"

                + "if(!overlay.classList.contains('open') && dx>70){"
                + "openMenu();"
                + "openedBySwipe=true;"
                + "tracking=false;"
                + "}"

                + "if(overlay.classList.contains('open') && dx<-70){"
                + "closeMenu();"
                + "tracking=false;"
                + "}"

                + "}"

                + "edge.addEventListener('touchstart',function(e){"
                + "if(!e.touches.length) return;"
                + "beginTouch(e.touches[0].clientX,e.touches[0].clientY);"
                + "},{passive:true});"

                + "edge.addEventListener('touchmove',function(e){"
                + "if(!e.touches.length) return;"
                + "moveTouch(e.touches[0].clientX,e.touches[0].clientY);"
                + "},{passive:true});"

                + "edge.addEventListener('touchend',function(){"
                + "tracking=false;"
                + "},{passive:true});"

                // =====================================================
                // CLOSE BY SWIPE ANYWHERE WHEN OPEN
                // =====================================================

                + "document.addEventListener('touchstart',function(e){"

                + "if(!overlay.classList.contains('open')) return;"
                + "if(!e.touches.length) return;"

                + "startX=e.touches[0].clientX;"
                + "startY=e.touches[0].clientY;"
                + "tracking=true;"

                + "},{passive:true});"

                + "document.addEventListener('touchmove',function(e){"

                + "if(!overlay.classList.contains('open')) return;"
                + "if(!tracking || !e.touches.length) return;"

                + "var dx=e.touches[0].clientX-startX;"
                + "var dy=Math.abs(e.touches[0].clientY-startY);"

                + "if(dy>70){"
                + "tracking=false;"
                + "return;"
                + "}"

                + "if(dx<-80){"
                + "closeMenu();"
                + "tracking=false;"
                + "}"

                + "},{passive:true});"

                + "document.addEventListener('touchend',function(){"
                + "tracking=false;"
                + "},{passive:true});"

                // =====================================================
                // TRANSITION LINKS
                // =====================================================

                + "document.querySelectorAll('a').forEach(function(a){"

                + "if(a.dataset.pgameBound) return;"
                + "a.dataset.pgameBound='1';"

                + "a.addEventListener('click',function(e){"

                + "var href=a.href;"

                + "if(!href) return;"

                + "if(a.target && a.target!=='_self') return;"
                + "if(href.indexOf('javascript:')===0) return;"
                + "if(href.indexOf('#')!==-1 && href.endsWith(location.hash)) return;"
                + "if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;"

                + "var sameOrigin=(new URL(href,location.href)).origin===location.origin;"

                + "if(!sameOrigin) return;"

                + "e.preventDefault();"

                + "closeMenu();"

                + "document.body.classList.add('pgame-page-leaving');"

                + "setTimeout(function(){"
                + "location.href=href;"
                + "},${TRANSITION_MS});"

                + "});"

                + "});"

                // =====================================================
                // HUD
                // =====================================================

                + "if(!document.querySelector('.pgame-app-hud')){"

                + "var hud=document.createElement('div');"
                + "hud.className='pgame-app-hud';"

                + "hud.innerHTML=`"

                + "<div class='pgame-hud-side'>"
                + "<div class='pgame-level-badge'>LV --</div>"
                + "</div>"

                + "<div class='pgame-xp-area'>"
                + "<div class='pgame-xp-bar'>"
                + "<div class='pgame-xp-fill'></div>"
                + "</div>"
                + "<div class='pgame-coins'>🪙 --</div>"
                + "</div>"

                + "<div class='pgame-hud-side'>"
                + "<div class='pgame-avatar'>"
                + "</div>"
                + "</div>"

                + "`;"

                + "document.body.appendChild(hud);"

                + "}"

                // =====================================================
                // LOAD CACHED ACCOUNT
                // =====================================================

                + "function pgameReadCache(){"

                + "try{"

                + "var raw=localStorage.getItem('pgame_account_cache_v1');"

                + "if(!raw) return null;"

                + "var obj=JSON.parse(raw);"

                + "return obj && obj.user ? obj.user : null;"

                + "}catch(e){"
                + "return null;"
                + "}"

                + "}"

                + "function pgameApplyUser(user){"

                + "if(!user) return;"

                + "var level=Number(user.level||1);"
                + "var xp=Number(user.xp||0);"
                + "var coins=Number(user.coins||0);"
                + "var next=Number(user.next_xp||100);"

                + "var progress=next>0 ? Math.max(0,Math.min(100,(xp/next)*100)) : 0;"

                + "var lv=document.querySelector('.pgame-level-badge');"
                + "var fill=document.querySelector('.pgame-xp-fill');"
                + "var coin=document.querySelector('.pgame-coins');"

                + "if(lv) lv.textContent='LV '+level;"
                + "if(fill) fill.style.width=progress+'%';"
                + "if(coin) coin.textContent='🪙 '+coins;"

                + "}"

                + "pgameApplyUser(pgameReadCache());"

                // =====================================================
                // REFRESH ACCOUNT
                // =====================================================

                + "fetch('/api/me',{"
                + "method:'GET',"
                + "credentials:'same-origin',"
                + "cache:'no-store'"
                + "}).then(function(r){"
                + "if(!r.ok) throw new Error('auth');"
                + "return r.json();"
                + "}).then(function(data){"

                + "if(data && data.loggedIn && data.user){"

                + "pgameApplyUser(data.user);"

                + "}"

                + "}).catch(function(){});"

                // =====================================================
                // REMOVE OLD HAMBURGER
                // =====================================================

                + "document.querySelectorAll('.vexon-global-menu-trigger').forEach(function(el){"
                + "el.style.display='none';"
                + "});"

                // =====================================================
                // BODY PADDING FOR HUD
                // =====================================================

                + "document.body.style.paddingTop='56px';"

                + "})();";

        webView.post(() ->
                webView.evaluateJavascript(
                        script,
                        null
                )
        );
    }

    // =========================================================
    // SPLASH
    // =========================================================

    private void createSplash() {

        splashOverlay =
                new FrameLayout(this);

        splashOverlay.setClickable(true);

        splashOverlay.setFocusable(true);

        splashOverlay.setBackgroundResource(
                R.drawable.splash
        );

        // -----------------------------------------------------
        // glow
        // -----------------------------------------------------

        View glow =
                new View(this);

        GradientDrawable glowDrawable =
                new GradientDrawable(
                        GradientDrawable.Orientation.TL_BR,
                        new int[]{
                                Color.argb(
                                        0,
                                        0,
                                        255,
                                        157
                                ),
                                Color.argb(
                                        38,
                                        116,
                                        77,
                                        255
                                ),
                                Color.argb(
                                        0,
                                        0,
                                        234,
                                        255
                                )
                        }
                );

        glowDrawable.setShape(
                GradientDrawable.OVAL
        );

        glow.setBackground(
                glowDrawable
        );

        FrameLayout.LayoutParams glowParams =
                new FrameLayout.LayoutParams(
                        dp(330),
                        dp(330)
                );

        glowParams.gravity =
                Gravity.CENTER;

        splashOverlay.addView(
                glow,
                glowParams
        );

        // -----------------------------------------------------
        // logo
        // -----------------------------------------------------

        ImageView logo =
                new ImageView(this);

        logo.setImageResource(
                R.drawable.splash_icon
        );

        logo.setScaleType(
                ImageView.ScaleType.CENTER_INSIDE
        );

        logo.setAlpha(0f);

        logo.setScaleX(.72f);
        logo.setScaleY(.72f);

        FrameLayout.LayoutParams logoParams =
                new FrameLayout.LayoutParams(
                        dp(190),
                        dp(190)
                );

        logoParams.gravity =
                Gravity.CENTER;

        splashOverlay.addView(
                logo,
                logoParams
        );

        // -----------------------------------------------------
        // title
        // -----------------------------------------------------

        TextView title =
                new TextView(this);

        title.setText("PGame");

        title.setTextColor(Color.WHITE);

        title.setTextSize(25);

        title.setGravity(Gravity.CENTER);

        title.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        title.setShadowLayer(
                18f,
                0f,
                0f,
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        title.setAlpha(0f);

        FrameLayout.LayoutParams titleParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        titleParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        titleParams.topMargin =
                dp(145);

        splashOverlay.addView(
                title,
                titleParams
        );

        // -----------------------------------------------------
        // slogan
        // -----------------------------------------------------

        TextView slogan =
                new TextView(this);

        slogan.setText(
                "PLAY • COMPETE • LEVEL UP."
        );

        slogan.setTextColor(
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        slogan.setTextSize(9);

        slogan.setGravity(
                Gravity.CENTER
        );

        slogan.setLetterSpacing(.12f);

        slogan.setAlpha(0f);

        FrameLayout.LayoutParams sloganParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        sloganParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        sloganParams.topMargin =
                dp(185);

        splashOverlay.addView(
                slogan,
                sloganParams
        );

        // -----------------------------------------------------
        // loading bar
        // -----------------------------------------------------

        View loading =
                new View(this);

        GradientDrawable loadingBg =
                new GradientDrawable(
                        GradientDrawable.Orientation.LEFT_RIGHT,
                        new int[]{
                                Color.TRANSPARENT,
                                Color.rgb(
                                        116,
                                        77,
                                        255
                                ),
                                Color.rgb(
                                        0,
                                        255,
                                        157
                                ),
                                Color.rgb(
                                        0,
                                        234,
                                        255
                                ),
                                Color.TRANSPARENT
                        }
                );

        loadingBg.setCornerRadius(
                dp(3)
        );

        loading.setBackground(
                loadingBg
        );

        loading.setAlpha(0f);

        FrameLayout.LayoutParams loadingParams =
                new FrameLayout.LayoutParams(
                        dp(220),
                        dp(3)
                );

        loadingParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        loadingParams.topMargin =
                dp(225);

        splashOverlay.addView(
                loading,
                loadingParams
        );

        root.addView(
                splashOverlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        splashOverlay.bringToFront();

        // -----------------------------------------------------
        // animations
        // -----------------------------------------------------

        logo.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(650)
                .setInterpolator(
                        new android.view.animation
                                .OvershootInterpolator(
                                        1.12f
                                )
                )
                .start();

        title.animate()
                .alpha(1f)
                .setStartDelay(300)
                .setDuration(420)
                .start();

        slogan.animate()
                .alpha(1f)
                .setStartDelay(480)
                .setDuration(420)
                .start();

        loading.animate()
                .alpha(1f)
                .setStartDelay(640)
                .setDuration(320)
                .start();
    }

    // =========================================================
    // HIDE SPLASH
    // =========================================================

    private void hideSplash() {

        if (splashOverlay == null) {
            return;
        }

        splashOverlay.animate()
                .alpha(0f)
                .setDuration(260)
                .withEndAction(() -> {

                    splashOverlay.setVisibility(
                            View.GONE
                    );

                    splashOverlay.setAlpha(1f);

                })
                .start();
    }

    // =========================================================
    // OFFLINE
    // =========================================================

    private void createOfflineOverlay() {

        offlineOverlay =
                buildMessageOverlay(
                        "بدون اتصال",
                        "اتصال اینترنت برقرار نیست.",
                        "تلاش مجدد"
                );

        root.addView(
                offlineOverlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        offlineOverlay.setVisibility(
                View.GONE
        );
    }

    private void showOffline() {

        offlineShown = true;

        if (offlineOverlay != null) {

            offlineOverlay.setVisibility(
                    View.VISIBLE
            );

            offlineOverlay.bringToFront();
        }
    }

    private void hideOffline() {

        offlineShown = false;

        if (offlineOverlay != null) {

            offlineOverlay.setVisibility(
                    View.GONE
            );
        }
    }

    // =========================================================
    // ERROR
    // =========================================================

    private void createErrorOverlay() {

        errorOverlay =
                buildMessageOverlay(
                        "PGame",
                        "بارگذاری برنامه زمان زیادی برد.",
                        "تلاش مجدد"
                );

        root.addView(
                errorOverlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        errorOverlay.setVisibility(
                View.GONE
        );
    }

    private void showStartupError() {

        startupErrorShown = true;

        if (errorOverlay != null) {

            errorOverlay.setVisibility(
                    View.VISIBLE
            );

            errorOverlay.bringToFront();
        }
    }

    // =========================================================
    // GENERIC OVERLAY
    // =========================================================

    private FrameLayout buildMessageOverlay(
            String title,
            String subtitle,
            String buttonText
    ) {

        FrameLayout overlay =
                new FrameLayout(this);

        overlay.setBackgroundColor(
                Color.rgb(
                        3,
                        4,
                        10
                )
        );

        TextView titleView =
                new TextView(this);

        titleView.setText(title);

        titleView.setTextColor(
                Color.WHITE
        );

        titleView.setTextSize(26);

        titleView.setGravity(
                Gravity.CENTER
        );

        titleView.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        FrameLayout.LayoutParams titleParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        titleParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        titleParams.topMargin =
                dp(250);

        overlay.addView(
                titleView,
                titleParams
        );

        TextView subtitleView =
                new TextView(this);

        subtitleView.setText(subtitle);

        subtitleView.setTextColor(
                Color.rgb(
                        140,
                        142,
                        160
                )
        );

        subtitleView.setTextSize(13);

        subtitleView.setGravity(
                Gravity.CENTER
        );

        FrameLayout.LayoutParams subtitleParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        subtitleParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        subtitleParams.topMargin =
                dp(305);

        overlay.addView(
                subtitleView,
                subtitleParams
        );

        TextView retry =
                new TextView(this);

        retry.setText(buttonText);

        retry.setTextColor(
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        retry.setTextSize(14);

        retry.setGravity(
                Gravity.CENTER
        );

        GradientDrawable retryBg =
                new GradientDrawable();

        retryBg.setColor(
                Color.argb(
                        20,
                        0,
                        255,
                        157
                )
        );

        retryBg.setStroke(
                dp(1),
                Color.argb(
                        80,
                        0,
                        255,
                        157
                )
        );

        retryBg.setCornerRadius(
                dp(12)
        );

        retry.setBackground(
                retryBg
        );

        retry.setPadding(
                dp(20),
                dp(10),
                dp(20),
                dp(10)
        );

        retry.setOnClickListener(
                v -> {

                    startupErrorShown = false;

                    hideOffline();

                    if (errorOverlay != null) {
                        errorOverlay.setVisibility(
                                View.GONE
                        );
                    }

                    if (hasInternet()) {

                        if (webView != null) {
                            webView.reload();
                        }

                        if (splashOverlay != null) {

                            splashOverlay.setVisibility(
                                    View.VISIBLE
                            );

                            splashOverlay.setAlpha(
                                    1f
                            );
                        }

                        startStartupWatcher();

                    } else {

                        showOffline();
                    }
                }
        );

        FrameLayout.LayoutParams retryParams =
                new FrameLayout.LayoutParams(
                        dp(150),
                        dp(48)
                );

        retryParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        retryParams.topMargin =
                dp(360);

        overlay.addView(
                retry,
                retryParams
        );

        return overlay;
    }

    // =========================================================
    // NETWORK
    // =========================================================

    private boolean hasInternet() {

        try {

            ConnectivityManager cm =
                    (ConnectivityManager)
                            getSystemService(
                                    Context.CONNECTIVITY_SERVICE
                            );

            if (cm == null) {
                return false;
            }

            Network network =
                    cm.getActiveNetwork();

            if (network == null) {
                return false;
            }

            NetworkCapabilities caps =
                    cm.getNetworkCapabilities(
                            network
                    );

            return caps != null &&
                    caps.hasCapability(
                            NetworkCapabilities
                                    .NET_CAPABILITY_INTERNET
                    );

        } catch (Exception e) {

            return false;
        }
    }

    private void registerNetworkCallback() {

        try {

            connectivityManager =
                    (ConnectivityManager)
                            getSystemService(
                                    Context.CONNECTIVITY_SERVICE
                            );

            if (connectivityManager == null) {
                return;
            }

            networkCallback =
                    new ConnectivityManager.NetworkCallback() {

                        @Override
                        public void onAvailable(
                                Network network
                        ) {

                            runOnUiThread(() -> {

                                hideOffline();

                            });
                        }

                        @Override
                        public void onLost(
                                Network network
                        ) {

                            runOnUiThread(() -> {

                                if (!hasInternet()) {

                                    showOffline();
                                }

                            });
                        }
                    };

            connectivityManager.registerDefaultNetworkCallback(
                    networkCallback
            );

        } catch (Exception ignored) {
        }
    }

    // =========================================================
    // BACK
    // =========================================================

    @Override
    public void onBackPressed() {

        if (webView == null) {

            super.onBackPressed();

            return;
        }

        webView.evaluateJavascript(
                "(function(){"
                        + "var o=document.getElementById('pgame-app-overlay');"
                        + "if(o && o.classList.contains('open')){"
                        + "o.classList.remove('open');"
                        + "document.body.style.overflow='';"
                        + "return 'menu';"
                        + "}"
                        + "return 'page';"
                        + "})()",
                value -> {

                    if ("\"page\"".equals(value)) {

                        if (webView.canGoBack()) {

                            webView.goBack();

                        } else {

                            MainActivity.super
                                    .onBackPressed();
                        }
                    }
                }
        );
    }

    // =========================================================
    // DESTROY
    // =========================================================

    @Override
    protected void onDestroy() {

        handler.removeCallbacksAndMessages(
                null
        );

        if (connectivityManager != null &&
                networkCallback != null) {

            try {

                connectivityManager
                        .unregisterNetworkCallback(
                                networkCallback
                        );

            } catch (Exception ignored) {
            }
        }

        super.onDestroy();
    }

    // =========================================================
    // DP
    // =========================================================

    private int dp(int value) {

        return Math.round(
                value *
                        getResources()
                                .getDisplayMetrics()
                                .density
        );
    }
}