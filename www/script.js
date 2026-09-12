/* =========================================================
   PGAME PAGE LOADER / APP API LAYER
========================================================= */

"use strict";


const app =
    document.querySelector("#app");


/* =========================================================
   PGAME CONFIG
========================================================= */

const PGAME_API_BASE =
    "https://s.vexongame.workers.dev";

const PGAME_ACCOUNT_CACHE_KEY =
    "pgame_account_cache_v1";

const PGAME_APP_SESSION_KEY =
    "pgame_app_session";

const PGAME_DATA_CACHE_PREFIX =
    "pgame_data_cache_v1_";


/* =========================================================
   APP DETECTION
========================================================= */

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


/* =========================================================
   SESSION
========================================================= */

function getPGameSession() {

    try {

        return localStorage.getItem(
            PGAME_APP_SESSION_KEY
        );

    } catch (
        error
    ) {

        console.debug(
            "PGAME_SESSION_READ_ERROR",
            error
        );

        return null;

    }

}


function savePGameSession(
    token
) {

    try {

        if (
            token
        ) {

            localStorage.setItem(
                PGAME_APP_SESSION_KEY,
                token
            );

        } else {

            localStorage.removeItem(
                PGAME_APP_SESSION_KEY
            );

        }

    } catch (
        error
    ) {

        console.debug(
            "PGAME_SESSION_WRITE_ERROR",
            error
        );

    }

}


function clearPGameSession() {

    try {

        localStorage.removeItem(
            PGAME_APP_SESSION_KEY
        );

    } catch (
        error
    ) {

        console.debug(
            "PGAME_SESSION_CLEAR_ERROR",
            error
        );

    }

}


/* =========================================================
   API URL
========================================================= */

function pgameApiUrl(
    path
) {

    if (
        typeof path !==
        "string"
    ) {

        return path;

    }


    if (
        /^https?:\/\//i.test(
            path
        )
    ) {

        return path;

    }


    const normalized =
        path.startsWith("/")
            ? path
            : `/${path}`;


    if (
        !isPGameApp()
    ) {

        return normalized;

    }


    return (
        PGAME_API_BASE +
        normalized
    );

}


/* =========================================================
   API FETCH
========================================================= */

function pgameApiFetch(
    path,
    options = {}
) {

    const headers =
        new Headers(
            options.headers || {}
        );


    const appMode =
        isPGameApp();


    if (
        appMode
    ) {

        headers.set(
            "X-PGame-App",
            "1"
        );


        const session =
            getPGameSession();


        if (
            session
        ) {

            headers.set(
                "Authorization",
                `Bearer ${session}`
            );

        }

    }


    return fetch(
        pgameApiUrl(path),
        {
            ...options,

            headers,

            credentials:
                appMode
                    ? "omit"
                    : (
                        options.credentials ??
                        "same-origin"
                    )
        }
    );

}


/* =========================================================
   GENERIC DATA CACHE
========================================================= */

function getPGameDataCache(
    key
) {

    try {

        const raw =
            localStorage.getItem(
                PGAME_DATA_CACHE_PREFIX +
                key
            );


        if (
            !raw
        ) {

            return null;

        }


        const parsed =
            JSON.parse(
                raw
            );


        if (
            !parsed ||
            typeof parsed !==
                "object"
        ) {

            return null;

        }


        return parsed;

    } catch (
        error
    ) {

        console.debug(
            "PGAME_DATA_CACHE_READ_ERROR",
            key,
            error
        );

        return null;

    }

}


function savePGameDataCache(
    key,
    data
) {

    try {

        localStorage.setItem(
            PGAME_DATA_CACHE_PREFIX +
            key,

            JSON.stringify({
                saved_at:
                    Date.now(),

                data
            })
        );

    } catch (
        error
    ) {

        console.debug(
            "PGAME_DATA_CACHE_WRITE_ERROR",
            key,
            error
        );

    }

}


function getCachedPGameData(
    key
) {

    const cache =
        getPGameDataCache(
            key
        );


    return (
        cache?.data ??
        null
    );

}


function clearPGameDataCaches() {

    try {

        const keys = [];


        for (
            let i = 0;
            i <
            localStorage.length;
            i++
        ) {

            const key =
                localStorage.key(
                    i
                );


            if (
                key?.startsWith(
                    PGAME_DATA_CACHE_PREFIX
                )
            ) {

                keys.push(
                    key
                );

            }

        }


        keys.forEach(
            key => {

                localStorage.removeItem(
                    key
                );

            }
        );

    } catch (
        error
    ) {

        console.debug(
            "PGAME_DATA_CACHE_CLEAR_ERROR",
            error
        );

    }

}


/* =========================================================
   CACHE-FIRST JSON
========================================================= */

async function pgameGetJson(
    path,
    cacheKey = null
) {

    if (
        cacheKey
    ) {

        const cached =
            getCachedPGameData(
                cacheKey
            );


        if (
            cached !== null
        ) {

            pgameApiFetch(
                path,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            )
                .then(
                    async response => {

                        if (
                            !response.ok
                        ) {

                            return;

                        }


                        const fresh =
                            await response.json();


                        savePGameDataCache(
                            cacheKey,
                            fresh
                        );

                    }
                )
                .catch(
                    error => {

                        console.debug(
                            "PGAME_BACKGROUND_REFRESH_ERROR",
                            cacheKey,
                            error
                        );

                    }
                );


            return cached;

        }

    }


    const response =
        await pgameApiFetch(
            path,
            {
                method:
                    "GET",

                cache:
                    "no-store"
            }
        );


    const data =
        await response.json();


    if (
        cacheKey &&
        response.ok
    ) {

        savePGameDataCache(
            cacheKey,
            data
        );

    }


    return data;

}


/* =========================================================
   PUBLIC APP API
========================================================= */

window.PGameApp = {

    apiBase:
        PGAME_API_BASE,

    isApp:
        isPGameApp,

    getSession:
        getPGameSession,

    saveSession:
        savePGameSession,

    clearSession() {

        clearPGameSession();

        clearPGameDataCaches();

        try {

            localStorage.removeItem(
                PGAME_ACCOUNT_CACHE_KEY
            );

        } catch {}

    },

    apiFetch:
        pgameApiFetch,

    getJson:
        pgameGetJson

};


/* =========================================================
   ACCOUNT CACHE
========================================================= */

function getAccountCache() {

    try {

        const raw =
            localStorage.getItem(
                PGAME_ACCOUNT_CACHE_KEY
            );


        if (
            !raw
        ) {

            return null;

        }


        const data =
            JSON.parse(
                raw
            );


        if (
            !data ||
            typeof data !==
                "object" ||
            !data.user
        ) {

            return null;

        }


        return data;

    } catch (
        error
    ) {

        console.debug(
            "PGAME_ACCOUNT_CACHE_READ_ERROR",
            error
        );

        return null;

    }

}


function saveAccountCache(
    user
) {

    if (
        !user ||
        typeof user !==
            "object"
    ) {

        return;

    }


    const cache = {

        saved_at:
            Date.now(),

        user: {

            id:
                user.id ??
                null,

            username:
                user.username ??
                "",

            nickname:
                user.nickname ??
                null,

            title:
                user.title ??
                null,

            avatar:
                user.avatar ??
                "👤",

            xp:
                Number(
                    user.xp ??
                    0
                ),

            level:
                Number(
                    user.level ??
                    1
                ),

            next_xp:
                Number(
                    user.next_xp ??
                    100
                ),

            xp_progress:
                Number(
                    user.xp_progress ??
                    0
                ),

            coins:
                Number(
                    user.coins ??
                    0
                ),

            typing_games:
                Number(
                    user.typing_games ??
                    0
                ),

            typing_best_time:
                Number(
                    user.typing_best_time ??
                    0
                ),

            typing_best_wpm:
                Number(
                    user.typing_best_wpm ??
                    0
                )

        }

    };


    try {

        localStorage.setItem(
            PGAME_ACCOUNT_CACHE_KEY,
            JSON.stringify(
                cache
            )
        );

    } catch (
        error
    ) {

        console.debug(
            "PGAME_ACCOUNT_CACHE_WRITE_ERROR",
            error
        );

    }

}


function getCachedAccount() {

    const cache =
        getAccountCache();


    if (
        !cache?.user
    ) {

        return null;

    }


    return cache.user;

}


/* =========================================================
   APPLY ACCOUNT TO HEADER
========================================================= */

function applyAccountToHeader(
    headerProfiles,
    user
) {

    if (
        !headerProfiles?.length ||
        !user
    ) {

        return;

    }


    const level =
        Number(
            user.level ??
            1
        );


    const xp =
        Number(
            user.xp ??
            0
        );


    const coins =
        Number(
            user.coins ??
            0
        );


    const nextXp =
        Number(
            user.next_xp ??
            getNextLevelXp(
                level
            )
        );


    const progress =
        nextXp > 0

            ? Math.min(
                100,
                Math.max(
                    0,
                    (
                        xp /
                        nextXp
                    ) *
                    100
                )
            )

            : 0;


    const avatar =
        user.avatar ??
        "👤";


    headerProfiles.forEach(
        headerProfile => {

            const isInsideSections =
                window.location.pathname.includes(
                    "/sections/"
                );


            headerProfile.href =
                isInsideSections
                    ? "profile.html"
                    : "sections/profile.html";


            const strong =
                headerProfile.querySelector(
                    "strong"
                );


            const span =
                headerProfile.querySelector(
                    "span"
                );


            const xpBar =
                headerProfile.querySelector(
                    ".header-xp-bar"
                );


            const xpFill =
                headerProfile.querySelector(
                    ".header-xp-fill"
                );


            const icon =
                headerProfile.querySelector(
                    ".header-profile-icon"
                );


            if (
                strong
            ) {

                strong.textContent =
                    user.username ||
                    "بازیکن PGame";

            }


            if (
                span
            ) {

                span.textContent =
                    `LV ${level} • XP ${xp}/${nextXp} • 🪙 ${coins}`;

                span.classList.add(
                    "header-player-stats"
                );

            }


            if (
                icon
            ) {

                icon.textContent =
                    avatar;

            }


            if (
                xpBar
            ) {

                xpBar.style.display =
                    "block";

            }


            if (
                xpFill
            ) {

                xpFill.style.width =
                    `${progress}%`;

            }

        }
    );

}


/* =========================================================
   FULL BAN CHECK
========================================================= */

async function checkFullBan() {

    try {

        if (
            window.location.pathname.endsWith(
                "/banned.html"
            )
        ) {

            return;

        }


        const response =
            await pgameApiFetch(
                "/api/me",
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        if (
            !response.ok
        ) {

            return;

        }


        const data =
            await response.json();


        if (
            !data ||
            !data.loggedIn ||
            !data.user
        ) {

            return;

        }


        if (
            data.user.banned === true &&
            data.user.ban_type ===
                "full"
        ) {

            window.location.href =
                window.location.pathname.includes(
                    "/sections/"
                )
                    ? "../banned.html"
                    : "banned.html";

        }

    } catch (
        error
    ) {

        console.debug(
            "FULL_BAN_CHECK_ERROR",
            error
        );

    }

}


/* =========================================================
   LOAD HTML SECTION
========================================================= */

async function loadSection(
    file
) {

    try {

        const response =
            await fetch(
                `sections/${file}.html`,
                {
                    cache:
                        "default"
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `Failed to load ${file}.html`
            );

        }


        return await response.text();

    } catch (
        error
    ) {

        console.error(
            error
        );


        return `

            <div
                class="section-error"
            >

                <strong>
                    خطا در بارگذاری PGame
                </strong>

                <span>
                    ${file}.html پیدا نشد.
                </span>

            </div>

        `;

    }

}


/* =========================================================
   LOAD PGAME
========================================================= */

async function loadVexon() {

    if (
        !app
    ) {

        initializeStandaloneVexon();

        return;

    }


    const sections = [

        "home",
        "games",
        "news",
        "cafe",
        "leaderboard",
        "guide",
        "creators",
        "profile"

    ];


    const loadedSections =
        await Promise.all(
            sections.map(
                section =>
                    loadSection(
                        section
                    )
            )
        );


    app.innerHTML =
        loadedSections.join(
            "\n"
        );


    initializeVexon();

}


/* =========================================================
   STANDALONE
========================================================= */

function initializeStandaloneVexon() {

    initializeNavigation();

    initializeButtonPress();

    initializeParallax();

    initializeAuthHeader();

    initializeSupportWidget();

}


/* =========================================================
   VEXON
========================================================= */

function initializeVexon() {

    initializeNavigation();

    initializeScrollReveal();

    initializeSmoothNavigation();

    initializeButtonPress();

    initializeParallax();

    initializeAuthHeader();

    initializeSupportWidget();

}


/* =========================================================
   AUTH HEADER
========================================================= */

async function initializeAuthHeader() {

    const headerProfiles =
        document.querySelectorAll(
            ".header-profile"
        );


    if (
        !headerProfiles.length
    ) {

        return;

    }


    const cachedUser =
        getCachedAccount();


    headerProfiles.forEach(
        headerProfile => {

            const strong =
                headerProfile.querySelector(
                    "strong"
                );


            const span =
                headerProfile.querySelector(
                    "span"
                );


            const xpBar =
                headerProfile.querySelector(
                    ".header-xp-bar"
                );


            const icon =
                headerProfile.querySelector(
                    ".header-profile-icon"
                );


            if (
                cachedUser
            ) {

                const level =
                    Number(
                        cachedUser.level ??
                        1
                    );


                const xp =
                    Number(
                        cachedUser.xp ??
                        0
                    );


                const coins =
                    Number(
                        cachedUser.coins ??
                        0
                    );


                const nextXp =
                    Number(
                        cachedUser.next_xp ??
                        getNextLevelXp(
                            level
                        )
                    );


                if (
                    strong
                ) {

                    strong.textContent =
                        cachedUser.username ||
                        "بازیکن PGame";

                }


                if (
                    span
                ) {

                    span.textContent =
                        `LV ${level} • XP ${xp}/${nextXp} • 🪙 ${coins}`;

                    span.classList.add(
                        "header-player-stats"
                    );

                }


                if (
                    icon
                ) {

                    icon.textContent =
                        cachedUser.avatar ??
                        "👤";

                }


                if (
                    xpBar
                ) {

                    xpBar.style.display =
                        "block";

                }

            } else {

                if (
                    strong
                ) {

                    strong.textContent =
                        "...";

                }


                if (
                    span
                ) {

                    span.textContent =
                        "در حال بررسی حساب...";

                }


                if (
                    xpBar
                ) {

                    xpBar.style.display =
                        "none";

                }

            }

        }
    );


    try {

        const response =
            await pgameApiFetch(
                "/api/me",
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        if (
            !response.ok
        ) {

            if (
                cachedUser
            ) {

                applyAccountToHeader(
                    headerProfiles,
                    cachedUser
                );

            } else {

                setGuestHeader(
                    headerProfiles
                );

            }

            return;

        }


        const data =
            await response.json();


        if (
            !data ||
            !data.loggedIn ||
            !data.user
        ) {

            setGuestHeader(
                headerProfiles
            );

            return;

        }


        if (
            data.user.banned === true &&
            data.user.ban_type ===
                "full"
        ) {

            if (
                !window.location.pathname.endsWith(
                    "/banned.html"
                )
            ) {

                window.location.href =
                    window.location.pathname.includes(
                        "/sections/"
                    )
                        ? "../banned.html"
                        : "banned.html";

                return;

            }

        }


        const user =
            data.user;


        if (
            data.app_token
        ) {

            savePGameSession(
                data.app_token
            );

        }


        saveAccountCache(
            user
        );


        applyAccountToHeader(
            headerProfiles,
            user
        );


    } catch (
        error
    ) {

        console.debug(
            "AUTH_HEADER_ERROR",
            error
        );


        if (
            cachedUser
        ) {

            applyAccountToHeader(
                headerProfiles,
                cachedUser
            );

        } else {

            setGuestHeader(
                headerProfiles
            );

        }

    }

}


/* =========================================================
   GUEST HEADER
========================================================= */

function setGuestHeader(
    headerProfiles
) {

    headerProfiles.forEach(
        headerProfile => {

            const isInsideSections =
                window.location.pathname.includes(
                    "/sections/"
                );


            headerProfile.href =
                isInsideSections
                    ? "login.html"
                    : "sections/login.html";


            const strong =
                headerProfile.querySelector(
                    "strong"
                );


            const span =
                headerProfile.querySelector(
                    "span"
                );


            const xpBar =
                headerProfile.querySelector(
                    ".header-xp-bar"
                );


            const icon =
                headerProfile.querySelector(
                    ".header-profile-icon"
                );


            if (
                strong
            ) {

                strong.textContent =
                    "ورود / ثبت‌نام";

            }


            if (
                span
            ) {

                span.textContent =
                    "ورود به حساب";


                span.classList.remove(
                    "header-player-stats"
                );

            }


            if (
                icon
            ) {

                icon.textContent =
                    "👤";

            }


            if (
                xpBar
            ) {

                xpBar.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   NEXT LEVEL XP
========================================================= */

function getNextLevelXp(
    level
) {

    const levels = {

        1:
            100,

        2:
            250,

        3:
            500,

        4:
            800,

        5:
            1200,

        6:
            1700,

        7:
            2500,

        8:
            3500,

        9:
            5000

    };


    return (
        levels[level] ??
        (
            level *
            700
        )
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

    const desktopNavLinks =
        document.querySelectorAll(
            ".nav-link"
        );


    const mobileNavItems =
        document.querySelectorAll(
            ".mobile-nav-item"
        );


    mobileNavItems.forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    mobileNavItems.forEach(
                        nav => {

                            nav.classList.remove(
                                "active"
                            );

                        }
                    );


                    item.classList.add(
                        "active"
                    );

                }
            );

        }
    );


    desktopNavLinks.forEach(
        link => {

            link.addEventListener(
                "click",
                () => {

                    desktopNavLinks.forEach(
                        nav => {

                            nav.classList.remove(
                                "active"
                            );

                        }
                    );


                    link.classList.add(
                        "active"
                    );

                }
            );

        }
    );


    const sections =
        document.querySelectorAll(
            "main section[id]"
        );


    if (
        !sections.length
    ) {

        return;

    }


    const sectionObserver =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            !entry.isIntersecting
                        ) {

                            return;

                        }


                        const id =
                            entry.target.id;


                        desktopNavLinks.forEach(
                            link => {

                                const href =
                                    link.getAttribute(
                                        "href"
                                    );


                                link.classList.toggle(
                                    "active",

                                    href ===
                                        `#${id}`
                                );

                            }
                        );


                        mobileNavItems.forEach(
                            item => {

                                const href =
                                    item.getAttribute(
                                        "href"
                                    );


                                item.classList.toggle(
                                    "active",

                                    href ===
                                        `#${id}` ||

                                    (
                                        id ===
                                            "games-all" &&

                                        href ===
                                            "#games"
                                    )
                                );

                            }
                        );

                    }
                );

            },

            {
                threshold:
                    0.2,

                rootMargin:
                    "-20% 0px -55% 0px"
            }
        );


    sections.forEach(
        section => {

            sectionObserver.observe(
                section
            );

        }
    );

}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function initializeScrollReveal() {

    const revealElements =
        document.querySelectorAll(
            `
            .game-card,
            .news-panel,
            .game-box,
            .stat,
            .cafe-card,
            .rank,
            .guide-card,
            .creator-card,
            .profile-big-card,
            .section-title
            `
        );


    revealElements.forEach(
        element => {

            element.classList.add(
                "reveal"
            );

        }
    );


    if (
        !revealElements.length
    ) {

        return;

    }


    const revealObserver =
        new IntersectionObserver(
            (
                entries,
                observer
            ) => {

                entries.forEach(
                    entry => {

                        if (
                            !entry.isIntersecting
                        ) {

                            return;

                        }


                        entry.target.classList.add(
                            "visible"
                        );


                        observer.unobserve(
                            entry.target
                        );

                    }
                );

            },

            {
                threshold:
                    0.12
            }
        );


    revealElements.forEach(
        element => {

            revealObserver.observe(
                element
            );

        }
    );

}


/* =========================================================
   SMOOTH NAVIGATION
========================================================= */

function initializeSmoothNavigation() {

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    event => {

                        const targetId =
                            link.getAttribute(
                                "href"
                            );


                        if (
                            !targetId ||
                            targetId === "#"
                        ) {

                            return;

                        }


                        const target =
                            document.querySelector(
                                targetId
                            );


                        if (
                            !target
                        ) {

                            return;

                        }


                        event.preventDefault();


                        target.scrollIntoView({
                            behavior:
                                "smooth",

                            block:
                                "start"
                        });

                    }
                );

            }
        );

}


/* =========================================================
   BUTTON PRESS
========================================================= */

function initializeButtonPress() {

    document
        .querySelectorAll(
            `
            .hero-button,
            .primary-button,
            .game-play,
            .card-button
            `
        )
        .forEach(
            button => {

                button.addEventListener(
                    "pointerdown",
                    () => {

                        button.style.transform =
                            "scale(0.97)";

                    }
                );


                button.addEventListener(
                    "pointerup",
                    () => {

                        button.style.transform =
                            "";

                    }
                );


                button.addEventListener(
                    "pointercancel",
                    () => {

                        button.style.transform =
                            "";

                    }
                );


                button.addEventListener(
                    "pointerleave",
                    () => {

                        button.style.transform =
                            "";

                    }
                );

            }
        );

}


/* =========================================================
   PARALLAX
========================================================= */

function initializeParallax() {

    const heroVisual =
        document.querySelector(
            ".hero-visual"
        );


    const heroV =
        document.querySelector(
            ".hero-v"
        );


    if (
        !heroVisual ||
        !heroV ||
        isPGameApp()
    ) {

        return;

    }


    window.addEventListener(
        "mousemove",
        event => {

            if (
                window.innerWidth <=
                850
            ) {

                return;

            }


            const x =
                (
                    event.clientX /
                    window.innerWidth -
                    0.5
                ) *
                10;


            const y =
                (
                    event.clientY /
                    window.innerHeight -
                    0.5
                ) *
                10;


            heroV.style.transform =
                `translate(${x}px, ${y}px)`;

        }
    );


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth <=
                850
            ) {

                heroV.style.transform =
                    "";

            }

        }
    );

}


/* =========================================================
   SUPPORT WIDGET
========================================================= */

function initializeSupportWidget() {

    if (
        document.getElementById(
            "vexon-support-widget"
        )
    ) {

        return;

    }


    if (
        window.location.pathname.includes(
            "admin.html"
        )
    ) {

        return;

    }


    if (
        window.location.pathname.endsWith(
            "/banned.html"
        )
    ) {

        return;

    }


    const widget =
        document.createElement(
            "div"
        );


    widget.id =
        "vexon-support-widget";


    widget.innerHTML = `

        <style>

            #vexon-support-widget {

                position:
                    fixed;

                right:
                    22px;

                bottom:
                    22px;

                z-index:
                    99999;

                font-family:
                    "Vazirmatn",
                    sans-serif;

            }


            #vexon-support-button {

                width:
                    58px;

                height:
                    58px;

                border-radius:
                    50%;

                border:
                    1px solid
                    rgba(
                        0,
                        255,
                        157,
                        0.28
                    );

                background:
                    linear-gradient(
                        135deg,
                        rgba(
                            0,
                            255,
                            157,
                            0.18
                        ),
                        rgba(
                            100,
                            70,
                            255,
                            0.18
                        )
                    );

                color:
                    white;

                font-size:
                    24px;

                cursor:
                    pointer;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                box-shadow:
                    0 0 28px
                    rgba(
                        0,
                        255,
                        157,
                        0.18
                    );

                backdrop-filter:
                    blur(15px);

                transition:
                    transform 0.2s ease,
                    box-shadow 0.2s ease;

            }


            #vexon-support-button:hover {

                transform:
                    scale(1.08);

                box-shadow:
                    0 0 36px
                    rgba(
                        0,
                        255,
                        157,
                        0.28
                    );

            }


            #vexon-support-panel {

                position:
                    absolute;

                right:
                    0;

                bottom:
                    72px;

                width:
                    min(
                        340px,
                        calc(
                            100vw -
                            28px
                        )
                    );

                max-height:
                    min(
                        520px,
                        calc(
                            100vh -
                            115px
                        )
                    );

                overflow:
                    hidden;

                display:
                    none;

                flex-direction:
                    column;

                border-radius:
                    22px;

                border:
                    1px solid
                    rgba(
                        0,
                        255,
                        157,
                        0.14
                    );

                background:
                    rgba(
                        4,
                        8,
                        15,
                        0.94
                    );

                box-shadow:
                    0 18px 60px
                    rgba(
                        0,
                        0,
                        0,
                        0.45
                    );

                backdrop-filter:
                    blur(20px);

            }


            #vexon-support-panel.open {

                display:
                    flex;

                animation:
                    vexonSupportOpen
                    0.2s ease;

            }


            @keyframes vexonSupportOpen {

                from {

                    opacity:
                        0;

                    transform:
                        translateY(
                            8px
                        )
                        scale(
                            0.98
                        );

                }


                to {

                    opacity:
                        1;

                    transform:
                        translateY(0)
                        scale(1);

                }

            }


            .vexon-support-header {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    10px;

                padding:
                    16px;

                border-bottom:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        0.06
                    );

            }


            .vexon-support-header strong {

                display:
                    block;

                font-size:
                    14px;

            }


            .vexon-support-header span {

                display:
                    block;

                margin-top:
                    3px;

                font-size:
                    10px;

                opacity:
                    0.55;

            }


            #vexon-support-close {

                width:
                    32px;

                height:
                    32px;

                border:
                    none;

                border-radius:
                    10px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        0.06
                    );

                color:
                    white;

                cursor:
                    pointer;

            }


            #vexon-support-body {

                flex:
                    1;

                overflow-y:
                    auto;

                padding:
                    14px;

            }


            .vexon-support-login {

                text-align:
                    center;

                padding:
                    22px 10px;

                line-height:
                    1.9;

                font-size:
                    12px;

                opacity:
                    0.75;

            }


            .vexon-support-login a {

                display:
                    inline-block;

                margin-top:
                    10px;

                padding:
                    9px 12px;

                border-radius:
                    10px;

                color:
                    white;

                text-decoration:
                    none;

                background:
                    rgba(
                        0,
                        255,
                        157,
                        0.10
                    );

                border:
                    1px solid
                    rgba(
                        0,
                        255,
                        157,
                        0.14
                    );

            }


            .vexon-support-message {

                margin-bottom:
                    12px;

                padding:
                    11px;

                border-radius:
                    14px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        0.045
                    );

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        0.06
                    );

            }


            .vexon-support-message-user {

                font-size:
                    12px;

                line-height:
                    1.9;

            }


            .vexon-support-message-reply {

                margin-top:
                    9px;

                padding:
                    9px;

                border-radius:
                    10px;

                background:
                    rgba(
                        0,
                        255,
                        157,
                        0.06
                    );

                border:
                    1px solid
                    rgba(
                        0,
                        255,
                        157,
                        0.10
                    );

                font-size:
                    11px;

                line-height:
                    1.9;

            }


            .vexon-support-message-meta {

                margin-top:
                    7px;

                font-size:
                    9px;

                opacity:
                    0.4;

            }


            #vexon-support-compose {

                padding:
                    12px;

                border-top:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        0.06
                    );

            }


            #vexon-support-input {

                width:
                    100%;

                box-sizing:
                    border-box;

                min-height:
                    75px;

                resize:
                    vertical;

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        0.08
                    );

                border-radius:
                    12px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        0.04
                    );

                color:
                    white;

                font-family:
                    inherit;

                font-size:
                    12px;

                padding:
                    10px;

                outline:
                    none;

            }


            #vexon-support-input:focus {

                border-color:
                    rgba(
                        0,
                        255,
                        157,
                        0.30
                    );

            }


            #vexon-support-send {

                width:
                    100%;

                margin-top:
                    8px;

                padding:
                    10px;

                border:
                    none;

                border-radius:
                    11px;

                background:
                    linear-gradient(
                        90deg,
                        #00ff9d,
                        #00d9ff
                    );

                color:
                    #03110c;

                font-family:
                    inherit;

                font-weight:
                    900;

                cursor:
                    pointer;

            }


            #vexon-support-send:disabled {

                opacity:
                    0.55;

                cursor:
                    not-allowed;

            }


            #vexon-support-status {

                display:
                    none;

                margin-bottom:
                    8px;

                font-size:
                    11px;

                line-height:
                    1.8;

            }


            .vexon-support-empty {

                text-align:
                    center;

                padding:
                    25px 10px;

                font-size:
                    11px;

                opacity:
                    0.45;

            }


            @media (
                max-width: 600px
            ) {

                #vexon-support-widget {

                    right:
                        14px;

                    bottom:
                        70px;

                }


                #vexon-support-button {

                    width:
                        54px;

                    height:
                        54px;

                }


                #vexon-support-panel {

                    right:
                        0;

                    bottom:
                        66px;

                }

            }

        </style>


        <div
            id="vexon-support-panel"
            aria-hidden="true"
        >

            <div
                class="vexon-support-header"
            >

                <div>

                    <strong>
                        💬 پیام به PGame
                    </strong>

                    <span>
                        پیام تو فقط برای مدیریت نمایش داده می‌شود.
                    </span>

                </div>


                <button
                    type="button"
                    id="vexon-support-close"
                    aria-label="بستن"
                >
                    ✕
                </button>

            </div>


            <div
                id="vexon-support-body"
            >

                <div
                    class="vexon-support-empty"
                >
                    در حال بررسی حساب...
                </div>

            </div>


            <div
                id="vexon-support-compose"
                style="
                    display:none;
                "
            >

                <div
                    id="vexon-support-status"
                ></div>


                <textarea
                    id="vexon-support-input"
                    maxlength="5000"
                    placeholder="پیامت را برای مدیریت PGame بنویس..."
                ></textarea>


                <button
                    type="button"
                    id="vexon-support-send"
                >
                    🚀 ارسال پیام
                </button>

            </div>

        </div>


        <button
            type="button"
            id="vexon-support-button"
            aria-label="پیام به PGame"
            title="پیام به PGame"
        >
            💬
        </button>

    `;


    document.body.appendChild(
        widget
    );


    const button =
        document.getElementById(
            "vexon-support-button"
        );


    const panel =
        document.getElementById(
            "vexon-support-panel"
        );


    const closeButton =
        document.getElementById(
            "vexon-support-close"
        );


    const body =
        document.getElementById(
            "vexon-support-body"
        );


    const compose =
        document.getElementById(
            "vexon-support-compose"
        );


    const input =
        document.getElementById(
            "vexon-support-input"
        );


    const sendButton =
        document.getElementById(
            "vexon-support-send"
        );


    const status =
        document.getElementById(
            "vexon-support-status"
        );


    let isLoggedIn =
        false;


    let isBanned =
        false;


    let banType =
        null;


    let supportMessages =
        [];


    function escapeHtml(
        value
    ) {

        return String(
            value ??
            ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    function formatSupportDate(
        value
    ) {

        if (
            !value
        ) {

            return "";

        }


        try {

            return new Intl.DateTimeFormat(
                "fa-IR",
                {
                    dateStyle:
                        "short",

                    timeStyle:
                        "short"
                }
            ).format(
                new Date(
                    value
                )
            );

        } catch {

            return value;

        }

    }


    function showSupportStatus(
        text,
        isError = false
    ) {

        status.textContent =
            text;


        status.style.display =
            "block";


        status.style.color =
            isError
                ? "#ffb7c1"
                : "#9dffcf";

    }


    button.addEventListener(
        "click",
        () => {

            const opened =
                panel.classList.toggle(
                    "open"
                );


            panel.setAttribute(
                "aria-hidden",
                opened
                    ? "false"
                    : "true"
            );


            if (
                opened &&
                isLoggedIn &&
                !(
                    isBanned &&
                    banType ===
                        "full"
                )
            ) {

                loadSupportMessages();

            }

        }
    );


    closeButton.addEventListener(
        "click",
        () => {

            panel.classList.remove(
                "open"
            );


            panel.setAttribute(
                "aria-hidden",
                "true"
            );

        }
    );


    async function checkSupportAuth() {

        try {

            const response =
                await pgameApiFetch(
                    "/api/me",
                    {
                        method:
                            "GET",

                        cache:
                            "no-store"
                    }
                );


            if (
                !response.ok
            ) {

                renderGuestSupport();

                return;

            }


            const data =
                await response.json();


            if (
                !data ||
                !data.loggedIn ||
                !data.user
            ) {

                renderGuestSupport();

                return;

            }


            isLoggedIn =
                true;


            isBanned =
                Boolean(
                    data.user.banned
                );


            banType =
                data.user.ban_type ??
                null;


            if (
                isBanned &&
                banType ===
                    "full"
            ) {

                return;

            }


            renderLoggedInSupport();

        } catch (
            error
        ) {

            console.debug(
                "SUPPORT_AUTH_ERROR",
                error
            );


            renderSupportError();

        }

    }


    function renderGuestSupport() {

        isLoggedIn =
            false;


        compose.style.display =
            "none";


        body.innerHTML = `

            <div
                class="vexon-support-login"
            >

                🔐 برای ارسال پیام به مدیریت
                ابتدا وارد حساب PGame شو.

                <br>

                <a
                    href="${
                        window.location.pathname.includes(
                            "/sections/"
                        )
                            ? "login.html"
                            : "sections/login.html"
                    }"
                >
                    ورود / ثبت‌نام
                </a>

            </div>

        `;

    }


    function renderLoggedInSupport() {

        if (
            isBanned &&
            banType ===
                "messages"
        ) {

            compose.style.display =
                "block";


            input.disabled =
                true;


            sendButton.disabled =
                true;


            showSupportStatus(
                "💬 این حساب از ارسال پیام محروم شده است.",
                true
            );


            return;

        }


        input.disabled =
            false;


        sendButton.disabled =
            false;


        compose.style.display =
            "block";


        status.style.display =
            "none";

    }


    function renderSupportError() {

        body.innerHTML = `

            <div
                class="vexon-support-login"
            >
                ❌ ارتباط با حساب PGame برقرار نشد.
            </div>

        `;


        compose.style.display =
            "none";

    }


    async function loadSupportMessages() {

        if (
            !isLoggedIn
        ) {

            return;

        }


        try {

            const response =
                await pgameApiFetch(
                    "/api/support/my",
                    {
                        method:
                            "GET",

                        cache:
                            "no-store"
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok
            ) {

                throw new Error(
                    data.message ||
                    "خطا در دریافت پیام‌ها."
                );

            }


            supportMessages =
                Array.isArray(
                    data.messages
                )
                    ? data.messages
                    : [];


            renderSupportMessages();

        } catch (
            error
        ) {

            console.debug(
                "SUPPORT_MESSAGES_ERROR",
                error
            );


            body.innerHTML = `

                <div
                    class="vexon-support-empty"
                >
                    ❌ دریافت پیام‌ها انجام نشد.
                </div>

            `;

        }

    }


    function renderSupportMessages() {

        if (
            !supportMessages.length
        ) {

            body.innerHTML = `

                <div
                    class="vexon-support-empty"
                >

                    💚 هنوز پیامی برای مدیریت نفرستادی.

                    <br><br>

                    اولین پیامت رو همینجا بفرست.

                </div>

            `;

            return;

        }


        body.innerHTML =
            supportMessages
                .map(
                    item => {

                        return `

                            <div
                                class="vexon-support-message"
                            >

                                <div
                                    class="vexon-support-message-user"
                                >

                                    ${escapeHtml(
                                        item.message
                                    )}

                                </div>


                                ${
                                    item.reply
                                        ? `

                                            <div
                                                class="vexon-support-message-reply"
                                            >

                                                <strong>
                                                    👑 پاسخ مدیریت:
                                                </strong>

                                                <br>

                                                ${escapeHtml(
                                                    item.reply
                                                )}

                                            </div>

                                          `
                                        : ""
                                }


                                <div
                                    class="vexon-support-message-meta"
                                >

                                    ${escapeHtml(
                                        formatSupportDate(
                                            item.created_at
                                        )
                                    )}

                                    ${
                                        item.status ===
                                        "replied"
                                            ? " • ✅ پاسخ داده شد"
                                            : " • ⏳ در انتظار پاسخ"
                                    }

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    sendButton.addEventListener(
        "click",
        sendSupportMessage
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                    "Enter" &&

                (
                    event.ctrlKey ||
                    event.metaKey
                )
            ) {

                event.preventDefault();

                sendSupportMessage();

            }

        }
    );


    async function sendSupportMessage() {

        if (
            !isLoggedIn
        ) {

            renderGuestSupport();

            return;

        }


        if (
            isBanned &&
            (
                banType ===
                    "full" ||

                banType ===
                    "messages"
            )
        ) {

            showSupportStatus(
                banType ===
                    "full"
                    ? "🚫 این حساب محدود شده است."
                    : "💬 این حساب از ارسال پیام محروم شده است.",
                true
            );

            return;

        }


        const text =
            input.value.trim();


        if (
            text.length <
            2
        ) {

            showSupportStatus(
                "پیامت خیلی کوتاهه.",
                true
            );

            return;

        }


        sendButton.disabled =
            true;


        sendButton.textContent =
            "⏳ در حال ارسال...";


        try {

            const response =
                await pgameApiFetch(
                    "/api/support/send",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                message:
                                    text
                            })
                    }
                );


            const data =
                await response.json();


            if (
                response.status ===
                403
            ) {

                isBanned =
                    Boolean(
                        data.banned
                    );


                banType =
                    data.ban_type ??
                    null;


                renderLoggedInSupport();


                throw new Error(
                    data.message ||
                    "این حساب محدود شده است."
                );

            }


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "ارسال پیام انجام نشد."
                );

            }


            input.value =
                "";


            showSupportStatus(
                "✅ پیامت برای مدیریت ارسال شد."
            );


            await loadSupportMessages();

        } catch (
            error
        ) {

            console.debug(
                "SUPPORT_SEND_ERROR",
                error
            );


            showSupportStatus(
                "❌ " +
                (
                    error.message ||
                    "ارسال پیام انجام نشد."
                ),

                true
            );

        } finally {

            sendButton.disabled =
                (
                    isBanned &&
                    (
                        banType ===
                            "full" ||

                        banType ===
                            "messages"
                    )
                );


            sendButton.textContent =
                "🚀 ارسال پیام";

        }

    }


    checkSupportAuth();


    window.addEventListener(
        "focus",
        () => {

            checkSupportAuth();

        }
    );


    window.setInterval(
        () => {

            if (
                panel.classList.contains(
                    "open"
                ) &&
                isLoggedIn &&
                !(
                    isBanned &&
                    banType ===
                        "full"
                )
            ) {

                loadSupportMessages();

            }

        },
        15000
    );

}


/* =========================================================
   ONLINE PRESENCE
========================================================= */

let presenceTimer =
    null;


async function sendPresenceHeartbeat() {

    try {

        await pgameApiFetch(
            "/api/heartbeat",
            {
                method:
                    "POST",

                cache:
                    "no-store",

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );

    } catch (
        error
    ) {

        console.debug(
            "PRESENCE_HEARTBEAT_ERROR",
            error
        );

    }

}


function initializePresence() {

    sendPresenceHeartbeat();


    if (
        presenceTimer
    ) {

        clearInterval(
            presenceTimer
        );

    }


    presenceTimer =
        setInterval(
            sendPresenceHeartbeat,
            30000
        );


    window.addEventListener(
        "beforeunload",
        () => {

            if (
                presenceTimer
            ) {

                clearInterval(
                    presenceTimer
                );

            }

        },
        {
            once:
                true
        }
    );

}


/* =========================================================
   CACHE REFRESH HELPERS
========================================================= */

async function refreshCachedPublicData() {

    if (
        !isPGameApp()
    ) {

        return;

    }


    const requests = [

        {
            path:
                "/api/news?limit=20",

            key:
                "news_20"
        },

        {
            path:
                "/api/leaderboard?type=level&limit=50",

            key:
                "leaderboard_level_50"
        },

        {
            path:
                "/api/leaderboard?type=coins&limit=50",

            key:
                "leaderboard_coins_50"
        },

        {
            path:
                "/api/community/stats",

            key:
                "community_stats"
        }

    ];


    await Promise.allSettled(
        requests.map(
            async request => {

                try {

                    const response =
                        await pgameApiFetch(
                            request.path,
                            {
                                method:
                                    "GET",

                                cache:
                                    "no-store"
                            }
                        );


                    if (
                        !response.ok
                    ) {

                        return;

                    }


                    const data =
                        await response.json();


                    savePGameDataCache(
                        request.key,
                        data
                    );

                } catch {}

            }
        )
    );

}


/* =========================================================
   LOGOUT HELPER
========================================================= */

function clearLocalPGameSession() {

    clearPGameSession();

    clearPGameDataCaches();


    try {

        localStorage.removeItem(
            PGAME_ACCOUNT_CACHE_KEY
        );

    } catch {}

}


/* =========================================================
   EXPOSE HELPERS
========================================================= */

window.PGameAccount = {

    get:
        getCachedAccount,

    save:
        saveAccountCache,

    clear() {

        try {

            localStorage.removeItem(
                PGAME_ACCOUNT_CACHE_KEY
            );

        } catch {}

    }

};


window.PGameAuth = {

    getToken:
        getPGameSession,

    setToken:
        savePGameSession,

    logoutLocal:
        clearLocalPGameSession

};


/* =========================================================
   START PGAME
========================================================= */

(async function startVexon() {

    await checkFullBan();

    await loadVexon();

    initializePresence();

    /*
     * در اپ، داده‌های عمومی را در پس‌زمینه
     * برای باز شدن‌های بعدی تازه می‌کنیم.
     */

    if (
        isPGameApp()
    ) {

        refreshCachedPublicData();

    }

})();