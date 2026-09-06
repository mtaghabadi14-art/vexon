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


    private ConnectivityManager connectivityManager;

    private ConnectivityManager.NetworkCallback networkCallback;


    private FrameLayout offlineOverlay;

    private FrameLayout launchOverlay;


    private WebView webView;


    private boolean networkCallbackRegistered = false;

    private boolean isOfflineScreenVisible = false;


    private final Handler launchHandler =
            new Handler(
                    Looper.getMainLooper()
            );


    // =========================================================
    // LAUNCH WATCHER
    // =========================================================

    private final Runnable launchWatcher =
            new Runnable() {

                @Override
                public void run() {

                    if (
                            launchOverlay == null
                    ) {
                        return;
                    }


                    if (
                            webView == null
                    ) {

                        launchHandler.postDelayed(
                                this,
                                100
                        );

                        return;
                    }


                    // وقتی WebView کامل آماده شد
                    if (
                            webView.getProgress() >= 100
                    ) {

                        // اجازه می‌دهیم Splash
                        // کمی بیشتر روی صفحه بماند
                        launchHandler.postDelayed(
                                () ->
                                        hideLaunchOverlay(),
                                250
                        );

                        return;
                    }


                    // اگر اینترنت قطع شد
                    if (
                            !hasInternet()
                    ) {

                        hideLaunchOverlay();

                        return;
                    }


                    // همچنان منتظر WebView
                    launchHandler.postDelayed(
                            this,
                            100
                    );
                }
            };


    // =========================================================
    // ON CREATE
    // =========================================================

    @Override
    public void onCreate(
            Bundle savedInstanceState
    ) {

        super.onCreate(
                savedInstanceState
        );


        setupFullscreen();


        webView =
                getBridge()
                        .getWebView();


        setupWebViewPersistence();


        createLaunchOverlay();


        createOfflineOverlay();


        connectivityManager =
                (ConnectivityManager)
                        getSystemService(
                                Context.CONNECTIVITY_SERVICE
                        );


        setupNetworkCallback();


        // بررسی اولیه اینترنت
        if (
                !hasInternet()
        ) {

            hideLaunchOverlay();

            showOfflineScreen();

        } else {

            startLaunchOverlayWatcher();

        }
    }


    // =========================================================
    // FULL SCREEN
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


        if (
                controller != null
        ) {

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


        if (
                controller != null
        ) {

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

        if (
                webView == null
        ) {
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


        // جلوگیری از سفید شدن WebView
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
    }


    // =========================================================
    // LAUNCH OVERLAY
    // =========================================================

    private void createLaunchOverlay() {

        launchOverlay =
                new FrameLayout(
                        this
                );


        launchOverlay.setVisibility(
                View.VISIBLE
        );


        launchOverlay.setClickable(
                true
        );


        launchOverlay.setFocusable(
                true
        );


        // =====================================================
        // SPACE BACKGROUND
        // =====================================================

        launchOverlay.setBackgroundResource(
                R.drawable.splash
        );


        // =====================================================
        // CENTER LOGO
        // =====================================================

        ImageView logo =
                new ImageView(
                        this
                );


        logo.setImageResource(
                R.drawable.splash_icon
        );


        logo.setScaleType(
                ImageView.ScaleType.CENTER_INSIDE
        );


        int logoSize =
                dpToPx(
                        190
                );


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


        // =====================================================
        // CENTER GLOW
        // =====================================================

        View glow =
                new View(
                        this
                );


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
                dpToPx(
                        330
                );


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


        // =====================================================
        // PGAME TITLE
        // =====================================================

        TextView title =
                new TextView(
                        this
                );


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
                dpToPx(
                        145
                );


        launchOverlay.addView(
                title,
                titleParams
        );


        // =====================================================
        // SLOGAN
        // =====================================================

        TextView slogan =
                new TextView(
                        this
                );


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
                dpToPx(
                        185
                );


        launchOverlay.addView(
                slogan,
                sloganParams
        );


        // =====================================================
        // LOADING LINE
        // =====================================================

        View loadingLine =
                new View(
                        this
                );


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
                dpToPx(
                        3
                )
        );


        loadingLine.setBackground(
                loadingBackground
        );


        loadingLine.setAlpha(
                0f
        );


        FrameLayout.LayoutParams loadingParams =
                new FrameLayout.LayoutParams(
                        dpToPx(
                                220
                        ),
                        dpToPx(
                                3
                        )
                );


        loadingParams.gravity =
                Gravity.CENTER_HORIZONTAL;


        loadingParams.topMargin =
                dpToPx(
                        225
                );


        launchOverlay.addView(
                loadingLine,
                loadingParams
        );


        // =====================================================
        // LOGO START STATE
        // =====================================================

        logo.setAlpha(
                0f
        );


        logo.setScaleX(
                0.72f
        );


        logo.setScaleY(
                0.72f
        );


        logo.setRotation(
                -8f
        );


        // =====================================================
        // ROOT
        // =====================================================

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


        // =====================================================
        // ANIMATIONS
        // =====================================================

        logo.animate()
                .alpha(
                        1f
                )
                .scaleX(
                        1f
                )
                .scaleY(
                        1f
                )
                .rotation(
                        0f
                )
                .setDuration(
                        650
                )
                .setInterpolator(
                        new android.view.animation.OvershootInterpolator(
                                1.15f
                        )
                )
                .start();


        title.animate()
                .alpha(
                        1f
                )
                .setStartDelay(
                        300
                )
                .setDuration(
                        450
                )
                .start();


        slogan.animate()
                .alpha(
                        1f
                )
                .setStartDelay(
                        500
                )
                .setDuration(
                        450
                )
                .start();


        loadingLine.animate()
                .alpha(
                        1f
                )
                .setStartDelay(
                        650
                )
                .setDuration(
                        400
                )
                .start();


        // =====================================================
        // PULSE
        // =====================================================

        logo.animate()
                .scaleX(
                        1.05f
                )
                .scaleY(
                        1.05f
                )
                .setDuration(
                        900
                )
                .setStartDelay(
                        750
                )
                .withEndAction(
                        () -> {

                            logo.animate()
                                    .scaleX(
                                            1f
                                    )
                                    .scaleY(
                                            1f
                                    )
                                    .setDuration(
                                            900
                                    )
                                    .start();

                        }
                )
                .start();


        // =====================================================
        // LAYER ORDER
        // =====================================================

        glow.bringToFront();

        logo.bringToFront();

        title.bringToFront();

        slogan.bringToFront();

        loadingLine.bringToFront();
    }


    // =========================================================
    // START LAUNCH WATCHER
    // =========================================================

    private void startLaunchOverlayWatcher() {

        if (
                launchOverlay == null
        ) {
            return;
        }


        launchOverlay.setVisibility(
                View.VISIBLE
        );


        launchOverlay.setAlpha(
                1f
        );


        launchOverlay.bringToFront();


        launchHandler.removeCallbacks(
                launchWatcher
        );


        launchHandler.post(
                launchWatcher
        );


        keepFullscreen();
    }


    // =========================================================
    // HIDE LAUNCH
    // =========================================================

    private void hideLaunchOverlay() {

        if (
                launchOverlay == null
        ) {
            return;
        }


        launchHandler.removeCallbacks(
                launchWatcher
        );


        launchOverlay.animate()
                .alpha(
                        0f
                )
                .setDuration(
                        220
                )
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

    private int dpToPx(
            int dp
    ) {

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

        if (
                connectivityManager == null
        ) {
            return false;
        }


        Network activeNetwork =
                connectivityManager
                        .getActiveNetwork();


        if (
                activeNetwork == null
        ) {
            return false;
        }


        NetworkCapabilities capabilities =
                connectivityManager
                        .getNetworkCapabilities(
                                activeNetwork
                        );


        if (
                capabilities == null
        ) {
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

        networkCallback =
                new ConnectivityManager.NetworkCallback() {

                    @Override
                    public void onAvailable(
                            Network network
                    ) {

                        runOnUiThread(
                                () -> {

                                    if (
                                            hasInternet()
                                    ) {

                                        hideOfflineScreen();


                                        if (
                                                webView != null
                                        ) {

                                            startLaunchOverlayWatcher();


                                            webView.reload();
                                        }
                                    }

                                }
                        );
                    }


                    @Override
                    public void onLost(
                            Network network
                    ) {

                        runOnUiThread(
                                () -> {

                                    if (
                                            !hasInternet()
                                    ) {

                                        hideLaunchOverlay();

                                        showOfflineScreen();
                                    }

                                }
                        );
                    }


                    @Override
                    public void onCapabilitiesChanged(
                            Network network,
                            NetworkCapabilities capabilities
                    ) {

                        runOnUiThread(
                                () -> {

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


                                    if (
                                            online
                                    ) {

                                        hideOfflineScreen();


                                        startLaunchOverlayWatcher();


                                        if (
                                                webView != null
                                        ) {

                                            webView.reload();
                                        }

                                    } else {

                                        hideLaunchOverlay();

                                        showOfflineScreen();
                                    }

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

        } catch (
                Exception ignored
        ) {

        }
    }


    // =========================================================
    // OFFLINE SCREEN
    // =========================================================

    private void createOfflineOverlay() {

        offlineOverlay =
                new FrameLayout(
                        this
                );


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
                new LinearLayout(
                        this
                );


        container.setOrientation(
                LinearLayout.VERTICAL
        );


        container.setGravity(
                Gravity.CENTER
        );


        container.setPadding(
                48,
                48,
                48,
                48
        );


        // =====================================================
        // LOGO
        // =====================================================

        TextView logo =
                new TextView(
                        this
                );


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


        // =====================================================
        // TITLE
        // =====================================================

        TextView title =
                new TextView(
                        this
                );


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


        // =====================================================
        // DESCRIPTION
        // =====================================================

        TextView description =
                new TextView(
                        this
                );


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


        // =====================================================
        // RETRY BUTTON
        // =====================================================

        Button retryButton =
                new Button(
                        this
                );


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
                25
        );


        retryButton.setBackground(
                buttonBackground
        );


        retryButton.setOnClickListener(
                v -> {

                    keepFullscreen();


                    if (
                            hasInternet()
                    ) {

                        hideOfflineScreen();


                        startLaunchOverlayWatcher();


                        if (
                                webView != null
                        ) {

                            webView.reload();
                        }

                    } else {

                        showOfflineScreen();


                        retryButton.animate()
                                .rotationBy(
                                        360f
                                )
                                .setDuration(
                                        500
                                )
                                .start();
                    }

                }
        );


        LinearLayout.LayoutParams buttonParams =
                new LinearLayout.LayoutParams(
                        dpToPx(
                                220
                        ),
                        dpToPx(
                                60
                        )
                );


        buttonParams.gravity =
                Gravity.CENTER;


        container.addView(
                retryButton,
                buttonParams
        );


        // =====================================================
        // ADD CONTAINER
        // =====================================================

        offlineOverlay.addView(
                container,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );


        // =====================================================
        // ADD TO ROOT
        // =====================================================

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
    // SPACE
    // =========================================================

    private void SpaceView(
            LinearLayout parent,
            int height
    ) {

        View space =
                new View(
                        this
                );


        parent.addView(
                space,
                new LinearLayout.LayoutParams(
                        1,
                        dpToPx(
                                height
                        )
                )
        );
    }


    // =========================================================
    // SHOW OFFLINE
    // =========================================================

    private void showOfflineScreen() {

        if (
                offlineOverlay == null
        ) {
            return;
        }


        isOfflineScreenVisible =
                true;


        offlineOverlay.setVisibility(
                View.VISIBLE
        );


        offlineOverlay.bringToFront();


        keepFullscreen();
    }


    // =========================================================
    // HIDE OFFLINE
    // =========================================================

    private void hideOfflineScreen() {

        if (
                offlineOverlay == null
        ) {
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
    // LIFECYCLE
    // =========================================================

    @Override
    public void onResume() {

        super.onResume();


        keepFullscreen();


        if (
                !hasInternet()
        ) {

            hideLaunchOverlay();

            showOfflineScreen();

        } else if (
                isOfflineScreenVisible
        ) {

            hideOfflineScreen();


            startLaunchOverlayWatcher();


            if (
                    webView != null
            ) {

                webView.reload();
            }
        }
    }


    @Override
    public void onDestroy() {

        launchHandler.removeCallbacks(
                launchWatcher
        );


        if (
                connectivityManager != null
                        &&
                        networkCallbackRegistered
                        &&
                        networkCallback != null
        ) {

            try {

                connectivityManager
                        .unregisterNetworkCallback(
                                networkCallback
                        );

            } catch (
                    Exception ignored
            ) {

            }
        }


        super.onDestroy();
    }


}