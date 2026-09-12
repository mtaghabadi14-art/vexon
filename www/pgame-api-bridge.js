/* =========================================================
   PGAME API BRIDGE
   Works on Web + Capacitor Android App
========================================================= */

"use strict";

(function () {

    const API_BASE =
        "https://s.vexongame.workers.dev";

    const SESSION_KEY =
        "pgame_app_session";


    /* =====================================================
       APP DETECTION
    ===================================================== */

    function isPGameApp() {

    return (
        window.location.hostname === "localhost" ||
        document.documentElement.classList.contains(
            "pgame-app"
        ) ||
        document.body?.classList.contains(
            "pgame-app"
        )
    );

}

    /* =====================================================
       SESSION
    ===================================================== */

    function getSession() {

        try {

            return (
                localStorage.getItem(
                    SESSION_KEY
                ) || ""
            );

        } catch {

            return "";

        }

    }


    /* =====================================================
       URL RESOLVER
    ===================================================== */

    function resolveApiUrl(url) {

        if (
            typeof url !==
            "string"
        ) {

            return url;

        }


        if (
            /^https?:\/\//i.test(
                url
            )
        ) {

            return url;

        }


        if (
            url === "/api" ||
            url.startsWith("/api/")
        ) {

            return API_BASE + url;

        }


        return url;

    }


    /* =====================================================
       FETCH PATCH
    ===================================================== */

    if (
        window.__PGAME_EARLY_API_BRIDGE__
    ) {

        return;

    }


    window.__PGAME_EARLY_API_BRIDGE__ =
        true;


    const originalFetch =
        window.fetch.bind(
            window
        );


    window.fetch =
        async function (
            input,
            init
        ) {

            try {

                let originalUrl = "";
                let originalRequest = null;


                /* -----------------------------------------
                   STRING URL
                ----------------------------------------- */

                if (
                    typeof input ===
                    "string"
                ) {

                    originalUrl =
                        input;

                }


                /* -----------------------------------------
                   URL OBJECT
                ----------------------------------------- */

                else if (
                    typeof URL !==
                    "undefined" &&
                    input instanceof URL
                ) {

                    originalUrl =
                        input.toString();

                }


                /* -----------------------------------------
                   REQUEST OBJECT
                ----------------------------------------- */

                else if (
                    typeof Request !==
                    "undefined" &&
                    input instanceof Request
                ) {

                    originalRequest =
                        input;

                    originalUrl =
                        input.url;

                }


                /* -----------------------------------------
                   ONLY API REQUESTS
                ----------------------------------------- */

                const isApiRequest =
                    typeof originalUrl ===
                        "string" &&
                    (
                        originalUrl === "/api" ||
                        originalUrl.startsWith(
                            "/api/"
                        )
                    );


                if (
                    !isApiRequest
                ) {

                    return originalFetch(
                        input,
                        init
                    );

                }


                const targetUrl =
                    resolveApiUrl(
                        originalUrl
                    );


                /* -----------------------------------------
                   HEADERS
                ----------------------------------------- */

                let headers =
                    new Headers();


                if (
                    originalRequest
                ) {

                    headers =
                        new Headers(
                            originalRequest.headers
                        );

                }


                if (
                    init?.headers
                ) {

                    headers =
                        new Headers(
                            init.headers
                        );

                }


                if (
                    isPGameApp()
                ) {

                    headers.set(
                        "X-PGame-App",
                        "1"
                    );


                    const session =
                        getSession();


                    if (
                        session &&
                        !headers.has(
                            "Authorization"
                        )
                    ) {

                        headers.set(
                            "Authorization",
                            "Bearer " +
                            session
                        );

                    }

                }


                /* -----------------------------------------
                   NORMAL FETCH
                ----------------------------------------- */

                if (
                    !originalRequest
                ) {

                    return originalFetch(
                        targetUrl,
                        {
                            ...(init || {}),

                            headers,

                            credentials:
                                isPGameApp()
                                    ? "omit"
                                    : (
                                        init?.credentials ??
                                        "same-origin"
                                    )
                        }
                    );

                }


                /* -----------------------------------------
                   REQUEST OBJECT
                ----------------------------------------- */

                const requestInit = {

                    method:
                        originalRequest.method,

                    headers,

                    credentials:
                        isPGameApp()
                            ? "omit"
                            : originalRequest.credentials,

                    cache:
                        originalRequest.cache,

                    redirect:
                        originalRequest.redirect,

                    referrer:
                        originalRequest.referrer,

                    referrerPolicy:
                        originalRequest.referrerPolicy,

                    integrity:
                        originalRequest.integrity,

                    keepalive:
                        originalRequest.keepalive

                };


                /*
                 * Don't attempt to manually reuse the body
                 * for GET / HEAD.
                 */

                if (
                    originalRequest.method !==
                        "GET" &&
                    originalRequest.method !==
                        "HEAD"
                ) {

                    try {

                        requestInit.body =
                            originalRequest
                                .clone()
                                .body;

                    } catch {
                        /*
                         * Leave body untouched if
                         * WebView refuses cloning.
                         */
                    }

                }


                const rewrittenRequest =
                    new Request(
                        targetUrl,
                        requestInit
                    );


                return originalFetch(
                    rewrittenRequest
                );

            } catch (
                error
            ) {

                console.debug(
                    "PGAME_API_BRIDGE_ERROR",
                    error
                );


                return originalFetch(
                    input,
                    init
                );

            }

        };


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.PGameApiBridge = {

        base:
            API_BASE,

        isApp:
            isPGameApp,

        getSession,

        resolveApiUrl

    };


})();