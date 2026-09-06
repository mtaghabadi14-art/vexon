package ir.pgame.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
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
private WebView webView;

private boolean networkCallbackRegistered = false;
private boolean isOfflineScreenVisible = false;


@Override
public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    setupFullscreen();

    webView = getBridge().getWebView();

    setupWebViewPersistence();

    createOfflineOverlay();

    connectivityManager =
            (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);

    setupNetworkCallback();

    // بررسی اولیه اینترنت
    if (!hasInternet()) {
        showOfflineScreen();
    }
}


// =========================================================
// FULL SCREEN
// =========================================================

private void setupFullscreen() {

    // اجازه بده WebView تمام صفحه را بگیرد
    WindowCompat.setDecorFitsSystemWindows(
            getWindow(),
            false
    );

    // حذف پس‌زمینه سفید Status Bar و Navigation Bar
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);

    WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(
                    getWindow(),
                    getWindow().getDecorView()
            );

    if (controller != null) {

        // مخفی کردن کامل نوارهای سیستم
        controller.hide(
                WindowInsetsCompat.Type.systemBars()
        );

        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat
                        .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // آیکون‌های روشن روی پس‌زمینه تاریک
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }
}


private void keepFullscreen() {

    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);

    WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(
                    getWindow(),
                    getWindow().getDecorView()
            );

    if (controller != null) {

        controller.hide(
                WindowInsetsCompat.Type.systemBars()
        );

        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }
}


// =========================================================
// WEBVIEW PERSISTENCE
// =========================================================

private void setupWebViewPersistence() {

    if (webView == null) {
        return;
    }

    WebSettings settings =
            webView.getSettings();

    // Local Storage
    settings.setDomStorageEnabled(true);

    // Database
    settings.setDatabaseEnabled(true);

    // ذخیره اطلاعات فرم
    settings.setSaveFormData(true);

    // حالت عادی کش
    settings.setCacheMode(
            WebSettings.LOAD_DEFAULT
    );

    // Cookie Manager
    CookieManager cookieManager =
            CookieManager.getInstance();

    cookieManager.setAcceptCookie(true);

    cookieManager.setAcceptThirdPartyCookies(
            webView,
            true
    );

    // ذخیره فوری Cookie ها
    cookieManager.flush();
}


// =========================================================
// INTERNET CHECK
// =========================================================

private boolean hasInternet() {

    if (connectivityManager == null) {
        return false;
    }

    Network activeNetwork =
            connectivityManager.getActiveNetwork();

    if (activeNetwork == null) {
        return false;
    }

    NetworkCapabilities capabilities =
            connectivityManager.getNetworkCapabilities(
                    activeNetwork
            );

    if (capabilities == null) {
        return false;
    }

    return capabilities.hasCapability(
            NetworkCapabilities.NET_CAPABILITY_INTERNET
    ) && capabilities.hasCapability(
            NetworkCapabilities.NET_CAPABILITY_VALIDATED
    );
}


// =========================================================
// NETWORK CALLBACK
// =========================================================

private void setupNetworkCallback() {

    networkCallback =
            new ConnectivityManager.NetworkCallback() {

        @Override
        public void onAvailable(Network network) {

            runOnUiThread(() -> {

                if (hasInternet()) {

                    hideOfflineScreen();

                    if (webView != null) {
                        webView.reload();
                    }
                }
            });
        }


        @Override
        public void onLost(Network network) {

            runOnUiThread(() -> {

                if (!hasInternet()) {
                    showOfflineScreen();
                }
            });
        }


        @Override
        public void onCapabilitiesChanged(
                Network network,
                NetworkCapabilities capabilities
        ) {

            runOnUiThread(() -> {

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

                if (online) {

                    hideOfflineScreen();

                    if (webView != null) {
                        webView.reload();
                    }

                } else {

                    showOfflineScreen();
                }
            });
        }
    };


    try {

        connectivityManager.registerDefaultNetworkCallback(
                networkCallback
        );

        networkCallbackRegistered = true;

    } catch (Exception ignored) {
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

    offlineOverlay.setClickable(true);

    offlineOverlay.setFocusable(true);


    // -----------------------------------------------------
    // BACKGROUND
    // -----------------------------------------------------

    GradientDrawable background =
            new GradientDrawable();

    background.setColor(
            Color.rgb(3, 4, 10)
    );

    offlineOverlay.setBackground(
            background
    );


    // -----------------------------------------------------
    // CONTAINER
    // -----------------------------------------------------

    LinearLayout container =
            new LinearLayout(this);

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
            new TextView(this);

    logo.setText("PGAME");

    logo.setTextColor(
            Color.rgb(0, 255, 157)
    );

    logo.setTextSize(34);

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
            Color.rgb(0, 255, 157)
    );


    container.addView(
            logo,
            new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            )
    );


    // فاصله
    SpaceView(
            container,
            25
    );


    // =====================================================
    // TITLE
    // =====================================================

    TextView title =
            new TextView(this);

    title.setText(
            "اتصال به اینترنت برقرار نیست"
    );

    title.setTextColor(
            Color.WHITE
    );

    title.setTextSize(21);

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


    // فاصله
    SpaceView(
            container,
            12
    );


    // =====================================================
    // DESCRIPTION
    // =====================================================

    TextView description =
            new TextView(this);

    description.setText(
            "برای استفاده از PGame به اتصال اینترنت نیاز داری.\n" +
            "اتصال خود را بررسی کن و دوباره تلاش کن."
    );

    description.setTextColor(
            Color.rgb(160, 160, 180)
    );

    description.setTextSize(15);

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


    // فاصله
    SpaceView(
            container,
            28
    );


    // =====================================================
    // RETRY BUTTON
    // =====================================================

    Button retryButton =
            new Button(this);

    retryButton.setText(
            "تلاش مجدد"
    );

    retryButton.setTextColor(
            Color.BLACK
    );

    retryButton.setTextSize(15);

    retryButton.setAllCaps(false);


    GradientDrawable buttonBackground =
            new GradientDrawable();

    buttonBackground.setColor(
            Color.rgb(0, 255, 157)
    );

    buttonBackground.setCornerRadius(
            25
    );


    retryButton.setBackground(
            buttonBackground
    );


    retryButton.setOnClickListener(v -> {

        keepFullscreen();


        if (hasInternet()) {

            hideOfflineScreen();

            if (webView != null) {
                webView.reload();
            }

        } else {

            showOfflineScreen();

            // انیمیشن کوچک دکمه
            retryButton.animate()
                    .rotationBy(360f)
                    .setDuration(500)
                    .start();
        }
    });


    LinearLayout.LayoutParams buttonParams =
            new LinearLayout.LayoutParams(
                    220,
                    60
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
    // ADD OVERLAY TO ROOT
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
// SPACE VIEW
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
                    height
            )
    );
}


// =========================================================
// SHOW OFFLINE
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

    keepFullscreen();
}


// =========================================================
// HIDE OFFLINE
// =========================================================

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
// LIFECYCLE
// =========================================================

@Override
public void onResume() {

    super.onResume();

    keepFullscreen();


    if (!hasInternet()) {

        showOfflineScreen();

    } else if (isOfflineScreenVisible) {

        hideOfflineScreen();

        if (webView != null) {
            webView.reload();
        }
    }
}


@Override
public void onDestroy() {

    if (connectivityManager != null
            && networkCallbackRegistered
            && networkCallback != null) {

        try {

            connectivityManager.unregisterNetworkCallback(
                    networkCallback
            );

        } catch (Exception ignored) {
        }
    }

    super.onDestroy();
}


}
