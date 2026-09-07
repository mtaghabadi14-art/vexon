package ir.pgame.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // =========================================================
    // CONSTANTS
    // =========================================================

    private static final String TAG = "PGame";

    private static final long STARTUP_TIMEOUT_MS = 15000L;
    private static final long SPLASH_EXTRA_DELAY_MS = 250L;
    private static final long NETWORK_RELOAD_COOLDOWN_MS = 2500L;

    // =========================================================
    // ANDROID / WEBVIEW
    // =========================================================

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

    private WebView webView;

    // =========================================================
    // OVERLAYS
    // =========================================================

    private FrameLayout launchOverlay;
    private FrameLayout offlineOverlay;
    private FrameLayout errorOverlay;

    // =========================================================
    // STATE
    // =========================================================

    private boolean networkCallbackRegistered = false;
    private boolean isOfflineScreenVisible = false;

    private boolean startupResolved = false;
    private boolean startupErrorVisible = false;

    private Boolean lastNetworkState = null;

    private long lastNetworkReloadTime = 0L;

    // =========================================================
    // HANDLER
    // =========================================================

    private final Handler mainHandler =
            new Handler(Looper.getMainLooper());

    // =========================================================
    // STARTUP WATCHER
    // =========================================================

    private final Runnable startupWatcher =
            new Runnable() {

                @Override
                public void run() {

                    if (launchOverlay == null) {
                        log("STARTUP", "Launch overlay is null");
                        return;
                    }

                    if (startupResolved) {
                        return;
                    }

                    if (startupErrorVisible) {
                        return;
                    }

                    if (webView == null) {

                        log("WEBVIEW", "WebView is null");

                        mainHandler.postDelayed(
                                this,
                                150
                        );

                        return;
                    }

                    int progress =
                            webView.getProgress();

                    String currentUrl =
                            webView.getUrl();

                    log(
                            "WEBVIEW",
                            "Progress=" + progress +
                                    " | URL=" + currentUrl
                    );

                    // -------------------------------------------------
                    // WEBVIEW READY
                    // -------------------------------------------------

                    if (progress >= 100) {

                        log(
                                "STARTUP",
                                "WebView reports 100% - waiting for visual state"
                        );

                        waitForVisualContent();

                        return;
                    }

                    // -------------------------------------------------
                    // NO INTERNET
                    // -------------------------------------------------

                    if (!hasInternet()) {

                        log(
                                "NETWORK",
                                "Internet unavailable during startup"
                        );

                        hideLaunchOverlay();
                        showOfflineScreen();

                        return;
                    }

                    // -------------------------------------------------
                    // KEEP WATCHING
                    // -------------------------------------------------

                    mainHandler.postDelayed(
                            this,
                            200
                    );
                }
            };

    // =========================================================
    // STARTUP TIMEOUT
    // =========================================================

    private final Runnable startupTimeout =
            () -> {

                if (startupResolved) {
                    return;
                }

                if (launchOverlay == null) {
                    return;
                }

                if (startupErrorVisible) {
                    return;
                }

                log(
                        "ERROR",
                        "STARTUP TIMEOUT after " +
                                STARTUP_TIMEOUT_MS +
                                "ms"
                );

                log(
                        "ERROR",
                        "WebView progress=" +
                                (webView != null
                                        ? webView.getProgress()
                                        : -1)
                );

                log(
                        "ERROR",
                        "WebView URL=" +
                                (webView != null
                                        ? webView.getUrl()
                                        : "null")
                );

                if (!hasInternet()) {

                    hideLaunchOverlay();
                    showOfflineScreen();

                } else {

                    showStartupErrorScreen();
                }
            };

    // =========================================================
    // ON CREATE
    // =========================================================

    @Override
    public void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        log(
                "STARTUP",
                "MainActivity created"
        );

        setupFullscreen();

        webView =
                getBridge()
                        .getWebView();
                        hideFooterInApp();

        log(
                "WEBVIEW",
                "WebView initialized: " +
                        (webView != null)
        );

        setupWebViewPersistence();

        createLaunchOverlay();

        createOfflineOverlay();

        createErrorOverlay();

        connectivityManager =
                (ConnectivityManager)
                        getSystemService(
                                Context.CONNECTIVITY_SERVICE
                        );

        log(
                "NETWORK",
                "ConnectivityManager initialized: " +
                        (connectivityManager != null)
        );

        setupNetworkCallback();

        boolean online =
                hasInternet();

        lastNetworkState = online;

        log(
                "NETWORK",
                "Initial internet state = " +
                        online
        );

        if (!online) {

            hideLaunchOverlay();
            showOfflineScreen();

        } else {

            startLaunchWatcher();
        }
    }

    // =========================================================
    // LOGGING
    // =========================================================

    private void log(
            String section,
            String message
    ) {

        Log.d(
                TAG,
                "[" + section + "] " + message
        );
    }

    private void logError(
            String section,
            String message,
            Throwable throwable
    ) {

        Log.e(
                TAG,
                "[" + section + "] " + message,
                throwable
        );
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

            controller.setAppearanceLightStatusBars(
                    false
            );

            controller.setAppearanceLightNavigationBars(
                    false
            );
        }
    }

    // =========================================================
    // WEBVIEW PERSISTENCE
    // =========================================================

    private void setupWebViewPersistence() {

        if (webView == null) {
            log(
                    "WEBVIEW",
                    "Persistence setup skipped because WebView is null"
            );
            return;
        }

        WebSettings settings =
                webView.getSettings();

        settings.setDomStorageEnabled(
                true
        );

        settings.setDatabaseEnabled(
                true
        );

        settings.setSaveFormData(
                true
        );

        settings.setCacheMode(
                WebSettings.LOAD_DEFAULT
        );

        webView.setBackgroundColor(
                Color.rgb(
                        3,
                        4,
                        10
                )
        );

        CookieManager cookieManager =
                CookieManager.getInstance();

        cookieManager.setAcceptCookie(
                true
        );

        cookieManager.setAcceptThirdPartyCookies(
                webView,
                true
        );

        cookieManager.flush();

        log(
                "WEBVIEW",
                "Persistence settings applied"
        );
    }

    // =========================================================
    // LAUNCH OVERLAY
    // =========================================================

    private void createLaunchOverlay() {

        launchOverlay =
                new FrameLayout(this);

        launchOverlay.setVisibility(
                View.VISIBLE
        );

        launchOverlay.setClickable(
                true
        );

        launchOverlay.setFocusable(
                true
        );

        launchOverlay.setBackgroundResource(
                R.drawable.splash
        );

        // -----------------------------------------------------
        // GLOW
        // -----------------------------------------------------

        View glow =
                new View(this);

        GradientDrawable glowBackground =
                new GradientDrawable(
                        GradientDrawable.Orientation.TL_BR,
                        new int[] {

                                Color.argb(
                                        0,
                                        0,
                                        255,
                                        157
                                ),

                                Color.argb(
                                        34,
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

        glowBackground.setShape(
                GradientDrawable.OVAL
        );

        glow.setBackground(
                glowBackground
        );

        int glowSize =
                dpToPx(330);

        FrameLayout.LayoutParams glowParams =
                new FrameLayout.LayoutParams(
                        glowSize,
                        glowSize
                );

        glowParams.gravity =
                Gravity.CENTER;

        launchOverlay.addView(
                glow,
                glowParams
        );

        // -----------------------------------------------------
        // LOGO
        // -----------------------------------------------------

        ImageView logo =
                new ImageView(this);

        logo.setImageResource(
                R.drawable.splash_icon
        );

        logo.setScaleType(
                ImageView.ScaleType.CENTER_INSIDE
        );

        int logoSize =
                dpToPx(190);

        FrameLayout.LayoutParams logoParams =
                new FrameLayout.LayoutParams(
                        logoSize,
                        logoSize
                );

        logoParams.gravity =
                Gravity.CENTER;

        launchOverlay.addView(
                logo,
                logoParams
        );

        // -----------------------------------------------------
        // TITLE
        // -----------------------------------------------------

        TextView title =
                new TextView(this);

        title.setText(
                "PGame"
        );

        title.setTextColor(
                Color.WHITE
        );

        title.setTextSize(
                25
        );

        title.setGravity(
                Gravity.CENTER
        );

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

        title.setAlpha(
                0f
        );

        FrameLayout.LayoutParams titleParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        titleParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        titleParams.topMargin =
                dpToPx(145);

        launchOverlay.addView(
                title,
                titleParams
        );

        // -----------------------------------------------------
        // SLOGAN
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

        slogan.setTextSize(
                9
        );

        slogan.setGravity(
                Gravity.CENTER
        );

        slogan.setLetterSpacing(
                0.12f
        );

        slogan.setAlpha(
                0f
        );

        FrameLayout.LayoutParams sloganParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        sloganParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        sloganParams.topMargin =
                dpToPx(185);

        launchOverlay.addView(
                slogan,
                sloganParams
        );

        // -----------------------------------------------------
        // LOADING LINE
        // -----------------------------------------------------

        View loadingLine =
                new View(this);

        GradientDrawable loadingBackground =
                new GradientDrawable(
                        GradientDrawable.Orientation.LEFT_RIGHT,
                        new int[] {

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

        loadingBackground.setCornerRadius(
                dpToPx(3)
        );

        loadingLine.setBackground(
                loadingBackground
        );

        loadingLine.setAlpha(
                0f
        );

        FrameLayout.LayoutParams loadingParams =
                new FrameLayout.LayoutParams(
                        dpToPx(220),
                        dpToPx(3)
                );

        loadingParams.gravity =
                Gravity.CENTER_HORIZONTAL;

        loadingParams.topMargin =
                dpToPx(225);

        launchOverlay.addView(
                loadingLine,
                loadingParams
        );

        // -----------------------------------------------------
        // INITIAL STATES
        // -----------------------------------------------------

        logo.setAlpha(0f);
        logo.setScaleX(0.72f);
        logo.setScaleY(0.72f);
        logo.setRotation(-8f);

        // -----------------------------------------------------
        // ROOT
        // -----------------------------------------------------

        ViewGroup root =
                findViewById(
                        android.R.id.content
                );

        root.addView(
                launchOverlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        launchOverlay.bringToFront();

        // -----------------------------------------------------
        // ANIMATIONS
        // -----------------------------------------------------

        logo.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .rotation(0f)
                .setDuration(650)
                .setInterpolator(
                        new android.view.animation
                                .OvershootInterpolator(
                                        1.15f
                                )
                )
                .start();

        title.animate()
                .alpha(1f)
                .setStartDelay(300)
                .setDuration(450)
                .start();

        slogan.animate()
                .alpha(1f)
                .setStartDelay(500)
                .setDuration(450)
                .start();

        loadingLine.animate()
                .alpha(1f)
                .setStartDelay(650)
                .setDuration(400)
                .start();

        logo.animate()
                .scaleX(1.05f)
                .scaleY(1.05f)
                .setDuration(900)
                .setStartDelay(750)
                .withEndAction(
                        () -> {

                            logo.animate()
                                    .scaleX(1f)
                                    .scaleY(1f)
                                    .setDuration(900)
                                    .start();
                        }
                )
                .start();

        glow.bringToFront();
        logo.bringToFront();
        title.bringToFront();
        slogan.bringToFront();
        loadingLine.bringToFront();

        log(
                "SPLASH",
                "Custom launch overlay created"
        );
    }

    // =========================================================
    // START WATCHER
    // =========================================================

    private void startLaunchWatcher() {

        if (launchOverlay == null) {
            return;
        }

        startupResolved = false;
        startupErrorVisible = false;

        launchOverlay.setVisibility(
                View.VISIBLE
        );

        launchOverlay.setAlpha(
                1f
        );

        launchOverlay.bringToFront();

        mainHandler.removeCallbacks(
                startupWatcher
        );

        mainHandler.removeCallbacks(
                startupTimeout
        );

        mainHandler.post(
                startupWatcher
        );

        mainHandler.postDelayed(
                startupTimeout,
                STARTUP_TIMEOUT_MS
        );

        keepFullscreen();

        log(
                "SPLASH",
                "Launch watcher started"
        );
    }

    // =========================================================
    // VISUAL CONTENT CHECK
    // =========================================================

    private void waitForVisualContent() {

        if (webView == null) {
            showStartupErrorScreen();
            return;
        }

        mainHandler.removeCallbacks(
                startupWatcher
        );

        log(
                "SPLASH",
                "Waiting for WebView visual state"
        );

        webView.postVisualStateCallback(
                System.nanoTime(),
                requestId -> {

                    runOnUiThread(
                            () -> {

                                if (
                                        startupResolved ||
                                        startupErrorVisible
                                ) {
                                    return;
                                }

                                log(
                                        "SPLASH",
                                        "WebView visual state complete"
                                );

                                mainHandler.removeCallbacks(
                                        startupTimeout
                                );

                                mainHandler.postDelayed(
                                        this::resolveStartup,
                                        SPLASH_EXTRA_DELAY_MS
                                );
                            }
                    );
                }
        );
    }

    // =========================================================
    // RESOLVE STARTUP
    // =========================================================

    private void resolveStartup() {

        if (startupResolved) {
            return;
        }

        startupResolved = true;

        mainHandler.removeCallbacks(
                startupWatcher
        );

        mainHandler.removeCallbacks(
                startupTimeout
        );

        log(
                "STARTUP",
                "Startup resolved successfully"
        );

        hideLaunchOverlay();
    }

    // =========================================================
    // HIDE LAUNCH
    // =========================================================

    private void hideLaunchOverlay() {

        if (launchOverlay == null) {
            return;
        }

        mainHandler.removeCallbacks(
                startupWatcher
        );

        launchOverlay.animate()
                .alpha(0f)
                .setDuration(220)
                .withEndAction(
                        () -> {

                            if (
                                    launchOverlay != null
                            ) {

                                launchOverlay.setVisibility(
                                        View.GONE
                                );

                                launchOverlay.setAlpha(
                                        1f
                                );
                            }

                            keepFullscreen();
                        }
                )
                .start();
    }

    // =========================================================
    // DP -> PX
    // =========================================================

    private int dpToPx(int dp) {

        return Math.round(
                dp *
                        getResources()
                                .getDisplayMetrics()
                                .density
        );
    }

    // =========================================================
    // INTERNET CHECK
    // =========================================================

    private boolean hasInternet() {

        if (connectivityManager == null) {
            return false;
        }

        Network activeNetwork =
                connectivityManager
                        .getActiveNetwork();

        if (activeNetwork == null) {
            return false;
        }

        NetworkCapabilities capabilities =
                connectivityManager
                        .getNetworkCapabilities(
                                activeNetwork
                        );

        if (capabilities == null) {
            return false;
        }

        return capabilities.hasCapability(
                NetworkCapabilities
                        .NET_CAPABILITY_INTERNET
        )
                &&
                capabilities.hasCapability(
                        NetworkCapabilities
                                .NET_CAPABILITY_VALIDATED
                );
    }

    // =========================================================
    // NETWORK CALLBACK
    // =========================================================

    private void setupNetworkCallback() {

        if (connectivityManager == null) {
            log(
                    "NETWORK",
                    "Cannot register callback: ConnectivityManager is null"
            );
            return;
        }

        networkCallback =
                new ConnectivityManager.NetworkCallback() {

                    @Override
                    public void onAvailable(
                            Network network
                    ) {

                        runOnUiThread(
                                () -> {

                                    log(
                                            "NETWORK",
                                            "Network available"
                                    );

                                    handleNetworkState(
                                            true
                                    );
                                }
                        );
                    }

                    @Override
                    public void onLost(
                            Network network
                    ) {

                        runOnUiThread(
                                () -> {

                                    boolean online =
                                            hasInternet();

                                    log(
                                            "NETWORK",
                                            "Network lost | online=" +
                                                    online
                                    );

                                    handleNetworkState(
                                            online
                                    );
                                }
                        );
                    }

                    @Override
                    public void onCapabilitiesChanged(
                            Network network,
                            NetworkCapabilities capabilities
                    ) {

                        boolean online =
                                capabilities.hasCapability(
                                        NetworkCapabilities
                                                .NET_CAPABILITY_INTERNET
                                )
                                        &&
                                        capabilities.hasCapability(
                                                NetworkCapabilities
                                                        .NET_CAPABILITY_VALIDATED
                                        );

                        runOnUiThread(
                                () -> {

                                    log(
                                            "NETWORK",
                                            "Capabilities changed | online=" +
                                                    online
                                    );

                                    handleNetworkState(
                                            online
                                    );
                                }
                        );
                    }
                };

        try {

            connectivityManager
                    .registerDefaultNetworkCallback(
                            networkCallback
                    );

            networkCallbackRegistered =
                    true;

            log(
                    "NETWORK",
                    "Network callback registered"
            );

        } catch (Exception e) {

            logError(
                    "NETWORK",
                    "Failed to register network callback",
                    e
            );
        }
    }

    // =========================================================
    // NETWORK STATE
    // =========================================================

    private void handleNetworkState(
            boolean online
    ) {

        if (
                lastNetworkState != null &&
                lastNetworkState == online
        ) {
            return;
        }

        lastNetworkState = online;

        if (!online) {

            log(
                    "NETWORK",
                    "Switching to offline state"
            );

            hideLaunchOverlay();
            showOfflineScreen();

            return;
        }

        log(
                "NETWORK",
                "Switching to online state"
        );

        hideOfflineScreen();

        if (webView == null) {
            return;
        }

        long now =
                System.currentTimeMillis();

        if (
                now - lastNetworkReloadTime
                        <
                        NETWORK_RELOAD_COOLDOWN_MS
        ) {

            log(
                    "NETWORK",
                    "Reload skipped because of cooldown"
            );

            return;
        }

        lastNetworkReloadTime = now;

        log(
                "WEBVIEW",
                "Reloading WebView after network recovery"
        );

        startupResolved = false;
        startupErrorVisible = false;

        hideErrorScreen();

        startLaunchWatcher();

        try {

            webView.reload();

        } catch (Exception e) {

            logError(
                    "WEBVIEW",
                    "WebView reload failed",
                    e
            );

            showStartupErrorScreen();
        }
    }

    // =========================================================
    // OFFLINE SCREEN
    // =========================================================

    private void createOfflineOverlay() {

        offlineOverlay =
                new FrameLayout(this);

        offlineOverlay.setVisibility(
                View.GONE
        );

        offlineOverlay.setClickable(
                true
        );

        offlineOverlay.setFocusable(
                true
        );

        GradientDrawable background =
                new GradientDrawable();

        background.setColor(
                Color.rgb(
                        3,
                        4,
                        10
                )
        );

        offlineOverlay.setBackground(
                background
        );

        LinearLayout container =
                new LinearLayout(this);

        container.setOrientation(
                LinearLayout.VERTICAL
        );

        container.setGravity(
                Gravity.CENTER
        );

        container.setPadding(
                dpToPx(32),
                dpToPx(32),
                dpToPx(32),
                dpToPx(32)
        );

        TextView logo =
                new TextView(this);

        logo.setText(
                "PGAME"
        );

        logo.setTextColor(
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        logo.setTextSize(
                34
        );

        logo.setGravity(
                Gravity.CENTER
        );

        logo.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        logo.setShadowLayer(
                25f,
                0f,
                0f,
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        container.addView(
                logo,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        SpaceView(
                container,
                25
        );

        TextView title =
                new TextView(this);

        title.setText(
                "اتصال به اینترنت برقرار نیست"
        );

        title.setTextColor(
                Color.WHITE
        );

        title.setTextSize(
                21
        );

        title.setGravity(
                Gravity.CENTER
        );

        title.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        container.addView(
                title,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        SpaceView(
                container,
                12
        );

        TextView description =
                new TextView(this);

        description.setText(
                "برای استفاده از PGame به اتصال اینترنت نیاز داری.\n"
                        +
                        "اتصال خود را بررسی کن و دوباره تلاش کن."
        );

        description.setTextColor(
                Color.rgb(
                        160,
                        160,
                        180
                )
        );

        description.setTextSize(
                15
        );

        description.setGravity(
                Gravity.CENTER
        );

        description.setLineSpacing(
                5,
                1.0f
        );

        container.addView(
                description,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        SpaceView(
                container,
                28
        );

        Button retryButton =
                new Button(this);

        retryButton.setText(
                "تلاش مجدد"
        );

        retryButton.setTextColor(
                Color.BLACK
        );

        retryButton.setTextSize(
                15
        );

        retryButton.setAllCaps(
                false
        );

        GradientDrawable buttonBackground =
                new GradientDrawable();

        buttonBackground.setColor(
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        buttonBackground.setCornerRadius(
                dpToPx(25)
        );

        retryButton.setBackground(
                buttonBackground
        );

        retryButton.setOnClickListener(
                v -> {

                    keepFullscreen();

                    log(
                            "NETWORK",
                            "Manual retry pressed"
                    );

                    if (
                            hasInternet()
                    ) {

                        hideOfflineScreen();

                        startupResolved = false;
                        startupErrorVisible = false;

                        hideErrorScreen();

                        startLaunchWatcher();

                        if (
                                webView != null
                        ) {

                            try {

                                webView.reload();

                            } catch (Exception e) {

                                logError(
                                        "WEBVIEW",
                                        "Retry reload failed",
                                        e
                                );

                                showStartupErrorScreen();
                            }
                        }

                    } else {

                        log(
                                "NETWORK",
                                "Retry failed: still offline"
                        );

                        retryButton.animate()
                                .rotationBy(360f)
                                .setDuration(500)
                                .start();
                    }
                }
        );

        LinearLayout.LayoutParams buttonParams =
                new LinearLayout.LayoutParams(
                        dpToPx(220),
                        dpToPx(60)
                );

        buttonParams.gravity =
                Gravity.CENTER;

        container.addView(
                retryButton,
                buttonParams
        );

        offlineOverlay.addView(
                container,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        ViewGroup root =
                findViewById(
                        android.R.id.content
                );

        root.addView(
                offlineOverlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );
    }

    // =========================================================
    // OFFLINE SCREEN STATE
    // =========================================================

    private void showOfflineScreen() {

        if (offlineOverlay == null) {
            return;
        }

        isOfflineScreenVisible =
                true;

        offlineOverlay.setVisibility(
                View.VISIBLE
        );

        offlineOverlay.bringToFront();

        hideErrorScreen();

        keepFullscreen();
    }

    private void hideOfflineScreen() {

        if (offlineOverlay == null) {
            return;
        }

        isOfflineScreenVisible =
                false;

        offlineOverlay.setVisibility(
                View.GONE
        );

        keepFullscreen();
    }

    // =========================================================
    // ERROR SCREEN
    // =========================================================

    private void createErrorOverlay() {

        errorOverlay =
                new FrameLayout(this);

        errorOverlay.setVisibility(
                View.GONE
        );

        errorOverlay.setClickable(
                true
        );

        errorOverlay.setFocusable(
                true
        );

        GradientDrawable background =
                new GradientDrawable();

        background.setColor(
                Color.rgb(
                        3,
                        4,
                        10
                )
        );

        errorOverlay.setBackground(
                background
        );

        LinearLayout container =
                new LinearLayout(this);

        container.setOrientation(
                LinearLayout.VERTICAL
        );

        container.setGravity(
                Gravity.CENTER
        );

        container.setPadding(
                dpToPx(32),
                dpToPx(32),
                dpToPx(32),
                dpToPx(32)
        );

        TextView logo =
                new TextView(this);

        logo.setText(
                "PGAME"
        );

        logo.setTextColor(
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        logo.setTextSize(
                34
        );

        logo.setGravity(
                Gravity.CENTER
        );

        logo.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        logo.setShadowLayer(
                25f,
                0f,
                0f,
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        container.addView(
                logo,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        SpaceView(
                container,
                25
        );

        TextView title =
                new TextView(this);

        title.setText(
                "بارگذاری PGame طول کشید"
        );

        title.setTextColor(
                Color.WHITE
        );

        title.setTextSize(
                21
        );

        title.setGravity(
                Gravity.CENTER
        );

        title.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        container.addView(
                title,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        SpaceView(
                container,
                12
        );

        TextView description =
                new TextView(this);

        description.setText(
                "ارتباط با PGame کامل نشد.\n"
                        +
                        "می‌توانی دوباره تلاش کنی."
        );

        description.setTextColor(
                Color.rgb(
                        160,
                        160,
                        180
                )
        );

        description.setTextSize(
                15
        );

        description.setGravity(
                Gravity.CENTER
        );

        description.setLineSpacing(
                5,
                1.0f
        );

        container.addView(
                description,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        SpaceView(
                container,
                28
        );

        Button retryButton =
                new Button(this);

        retryButton.setText(
                "تلاش دوباره"
        );

        retryButton.setTextColor(
                Color.BLACK
        );

        retryButton.setTextSize(
                15
        );

        retryButton.setAllCaps(
                false
        );

        GradientDrawable buttonBackground =
                new GradientDrawable();

        buttonBackground.setColor(
                Color.rgb(
                        0,
                        255,
                        157
                )
        );

        buttonBackground.setCornerRadius(
                dpToPx(25)
        );

        retryButton.setBackground(
                buttonBackground
        );

        retryButton.setOnClickListener(
                v -> {

                    log(
                            "STARTUP",
                            "Startup error retry pressed"
                    );

                    hideErrorScreen();

                    if (!hasInternet()) {

                        showOfflineScreen();

                        return;
                    }

                    if (webView == null) {

                        showStartupErrorScreen();

                        return;
                    }

                    startupResolved = false;
                    startupErrorVisible = false;

                    startLaunchWatcher();

                    try {

                        webView.reload();

                    } catch (Exception e) {

                        logError(
                                "WEBVIEW",
                                "Error screen retry failed",
                                e
                        );

                        showStartupErrorScreen();
                    }
                }
        );

        LinearLayout.LayoutParams buttonParams =
                new LinearLayout.LayoutParams(
                        dpToPx(220),
                        dpToPx(60)
                );

        buttonParams.gravity =
                Gravity.CENTER;

        container.addView(
                retryButton,
                buttonParams
        );

        errorOverlay.addView(
                container,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        ViewGroup root =
                findViewById(
                        android.R.id.content
                );

        root.addView(
                errorOverlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );
    }

    private void showStartupErrorScreen() {

        if (errorOverlay == null) {
            return;
        }

        startupErrorVisible =
                true;

        mainHandler.removeCallbacks(
                startupWatcher
        );

        mainHandler.removeCallbacks(
                startupTimeout
        );

        hideLaunchOverlay();

        hideOfflineScreen();

        errorOverlay.setVisibility(
                View.VISIBLE
        );

        errorOverlay.bringToFront();

        keepFullscreen();

        log(
                "ERROR",
                "Startup error screen shown"
        );
    }

    private void hideErrorScreen() {

        if (errorOverlay == null) {
            return;
        }

        startupErrorVisible =
                false;

        errorOverlay.setVisibility(
                View.GONE
        );
    }

    // =========================================================
    // SPACE
    // =========================================================

    private void SpaceView(
            LinearLayout parent,
            int height
    ) {

        View space =
                new View(this);

        parent.addView(
                space,
                new LinearLayout.LayoutParams(
                        1,
                        dpToPx(height)
                )
        );
    }

    // =========================================================
    // LIFECYCLE
    // =========================================================

    @Override
    public void onResume() {

        super.onResume();

        keepFullscreen();

        boolean online =
                hasInternet();

        log(
                "STARTUP",
                "onResume | online=" +
                        online
        );

        if (!online) {

            hideLaunchOverlay();
            showOfflineScreen();

            return;
        }

        if (isOfflineScreenVisible) {

            hideOfflineScreen();

            if (webView != null) {

                startupResolved = false;
                startupErrorVisible = false;

                hideErrorScreen();

                startLaunchWatcher();

                try {

                    webView.reload();

                } catch (Exception e) {

                    logError(
                            "WEBVIEW",
                            "onResume reload failed",
                            e
                    );

                    showStartupErrorScreen();
                }
            }
        }
    }

    @Override
    public void onDestroy() {

        log(
                "STARTUP",
                "MainActivity destroying"
        );

        mainHandler.removeCallbacks(
                startupWatcher
        );

        mainHandler.removeCallbacks(
                startupTimeout
        );

        if (
                connectivityManager != null &&
                networkCallbackRegistered &&
                networkCallback != null
        ) {

            try {

                connectivityManager
                        .unregisterNetworkCallback(
                                networkCallback
                        );

                log(
                        "NETWORK",
                        "Network callback unregistered"
                );

            } catch (Exception e) {

                logError(
                        "NETWORK",
                        "Failed to unregister network callback",
                        e
                );
            }
        }

        super.onDestroy();
    }
}

// =========================================================
// APP ONLY - HIDE WEBSITE FOOTER
// =========================================================

private void hideFooterInApp() {

    if (webView == null) {
        return;
    }

    launchHandler.postDelayed(
            () -> {

                webView.evaluateJavascript(
                        "javascript:(function(){" +
                                "document.querySelectorAll('footer').forEach(function(el){" +
                                "el.style.display='none';" +
                                "});" +
                                "})()",
                        null
                );

            },
            700
    );
}