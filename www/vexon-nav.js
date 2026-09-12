"use strict";

(function () {

    /* =========================================================
       PGAME NAVIGATION
    ========================================================= */

    const items = [
        {
            href: "index.html",
            icon: "⌂",
            label: "خانه"
        },
        {
            href: "sections/games.html",
            icon: "🎮",
            label: "بازی‌ها"
        },
        {
            href: "sections/leaderboard.html",
            icon: "🏆",
            label: "لیدربورد"
        },
        {
            href: "sections/cafe.html",
            icon: "☕",
            label: "کافه بازی"
        },
        {
            href: "sections/news.html",
            icon: "📢",
            label: "اخبار"
        },
        {
            href: "sections/guide.html",
            icon: "❓",
            label: "راهنما"
        },
        {
            href: "sections/creators.html",
            icon: "👨‍💻",
            label: "سازندگان"
        },
        {
            href: "sections/messenger.html",
            icon: "💬",
            label: "پیام‌رسان"
        },
        {
            href: "sections/friends.html",
            icon: "👥",
            label: "دوستان"
        }
    ];


    const SETTINGS_ITEM = {
        href: "sections/settings.html",
        icon: "⚙️",
        label: "تنظیمات"
    };


    let drawer = null;
    let overlay = null;

    let touchStartX = 0;
    let touchStartY = 0;

    let touchCurrentX = 0;

    let trackingEdgeSwipe = false;
    let draggingDrawer = false;

    let drawerWidth = 0;


    const APP_CLASS =
        "pgame-app";

    const OPEN_CLASS =
        "pgame-drawer-open";

    const DRAWER_ID =
        "pgame-navigation-drawer";

    const OVERLAY_ID =
        "pgame-navigation-overlay";


    /* =========================================================
       PATH HELPERS
    ========================================================= */

    function isSectionPage() {

        return (
            window.location.pathname
                .split("/")
                .filter(Boolean)
                .includes("sections")
        );
    }


    function pageHref(
        rootFile,
        sectionFile
    ) {

        return isSectionPage()
            ? sectionFile
                ? sectionFile
                : `../${rootFile}`
            : rootFile;
    }


    function settingsHref() {

        return isSectionPage()
            ? "settings.html"
            : "sections/settings.html";
    }


    function homeHref() {

        return isSectionPage()
            ? "../index.html"
            : "index.html";
    }


    function normalizeHref(
        href
    ) {

        try {

            const url =
                new URL(
                    href,
                    window.location.href
                );

            return (
                url.pathname.replace(
                    /\/+$/,
                    ""
                ) || "/"
            );

        } catch {

            return href;
        }
    }


    function getCurrentPath() {

        const path =
            window.location.pathname || "";

        return (
            path.replace(
                /\/+$/,
                ""
            ) || "/"
        );
    }


    function isActiveLink(
        href
    ) {

        const current =
            getCurrentPath();

        const target =
            normalizeHref(href);


        if (
            target === "/" ||
            target === "/index.html"
        ) {

            return (
                current === "/" ||
                current.endsWith(
                    "/index.html"
                )
            );
        }


        return current === target;
    }


    /* =========================================================
       APP MODE
    ========================================================= */

    function isAppMode() {

        return (
            document.documentElement.classList.contains(
                APP_CLASS
            ) ||

            document.body?.classList.contains(
                APP_CLASS
            ) ||

            window.PGameApp?.isApp === true
        );
    }


    /* =========================================================
       DRAWER CREATION
    ========================================================= */

    function createDrawer() {

        const existing =
            document.getElementById(
                DRAWER_ID
            );


        if (existing) {

            drawer =
                existing;

            overlay =
                document.getElementById(
                    OVERLAY_ID
                );

            drawerWidth =
                drawer.getBoundingClientRect()
                    .width || 310;

            return;
        }


        /* =====================================================
           OVERLAY
        ====================================================== */

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            OVERLAY_ID;

        overlay.className =
            "pgame-nav-overlay";

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );


        /* =====================================================
           DRAWER
        ====================================================== */

        drawer =
            document.createElement(
                "aside"
            );

        drawer.id =
            DRAWER_ID;

        drawer.className =
            "pgame-navigation-drawer";

        drawer.setAttribute(
            "aria-label",
            "منوی PGame"
        );

        drawer.setAttribute(
            "aria-hidden",
            "true"
        );


        /* =====================================================
           HEADER
        ====================================================== */

        const header =
            document.createElement(
                "div"
            );

        header.className =
            "pgame-drawer-header";


        const brand =
            document.createElement(
                "div"
            );

        brand.className =
            "pgame-drawer-brand";


        brand.innerHTML = `

            <div class="pgame-drawer-brand-mark">
                P
            </div>

            <div class="pgame-drawer-brand-text">

                <strong>
                    PGame
                </strong>

                <span>
                    Play • Compete • Level Up.
                </span>

            </div>

        `;


        const closeButton =
            document.createElement(
                "button"
            );

        closeButton.type =
            "button";

        closeButton.className =
            "pgame-drawer-close";

        closeButton.setAttribute(
            "aria-label",
            "بستن منو"
        );

        closeButton.innerHTML =
            "×";


        closeButton.addEventListener(
            "click",
            function () {

                closeDrawer();

            }
        );


        header.appendChild(
            brand
        );

        header.appendChild(
            closeButton
        );


        /* =====================================================
           MAIN NAV
        ====================================================== */

        const nav =
            document.createElement(
                "nav"
            );

        nav.className =
            "pgame-drawer-nav";

        nav.setAttribute(
            "aria-label",
            "ناوبری اصلی"
        );


        items.forEach(
            function (item) {

                appendDrawerLink(
                    nav,
                    item,
                    false
                );

            }
        );


        /* =====================================================
           SETTINGS SEPARATOR
        ====================================================== */

        const separator =
            document.createElement(
                "div"
            );

        separator.className =
            "pgame-settings-divider";


        nav.appendChild(
            separator
        );


        appendDrawerLink(
            nav,
            {
                ...SETTINGS_ITEM,
                href:
                    settingsHref()
            },
            true
        );


        /* =====================================================
           FOOTER
        ====================================================== */

        const footer =
            document.createElement(
                "div"
            );

        footer.className =
            "pgame-drawer-footer";


        footer.innerHTML = `

            <div class="pgame-drawer-footer-line"></div>

            <span>
                PGame
            </span>

            <small>
                Play • Compete • Level Up.
            </small>

        `;


        /* =====================================================
           ASSEMBLE
        ====================================================== */

        drawer.appendChild(
            header
        );

        drawer.appendChild(
            nav
        );

        drawer.appendChild(
            footer
        );


        document.body.appendChild(
            overlay
        );

        document.body.appendChild(
            drawer
        );


        overlay.addEventListener(
            "click",
            function () {

                closeDrawer();

            }
        );


        drawer.addEventListener(
            "touchstart",
            onDrawerTouchStart,
            {
                passive: true
            }
        );


        drawer.addEventListener(
            "touchmove",
            onDrawerTouchMove,
            {
                passive: false
            }
        );


        drawer.addEventListener(
            "touchend",
            onDrawerTouchEnd,
            {
                passive: true
            }
        );


        drawerWidth =
            drawer.getBoundingClientRect()
                .width || 310;
    }


    function appendDrawerLink(
        nav,
        item,
        isSettings
    ) {

        const link =
            document.createElement(
                "a"
            );

        link.className =
            "pgame-drawer-link";


        if (isSettings) {

            link.classList.add(
                "pgame-settings-link"
            );

        }


        link.href =
            item.href;

        link.dataset.href =
            item.href;


        if (
            isActiveLink(
                item.href
            )
        ) {

            link.classList.add(
                "active"
            );

        }


        link.innerHTML = `

            <span class="pgame-drawer-link-icon">
                ${item.icon}
            </span>

            <span class="pgame-drawer-link-label">
                ${item.label}
            </span>

            <span class="pgame-drawer-link-arrow">
                ‹
            </span>

        `;


        link.addEventListener(
            "click",
            function (event) {

                const href =
                    item.href;


                if (!href) {

                    event.preventDefault();

                    return;

                }


                if (
                    isAppMode() &&
                    window.PGameApp &&
                    typeof window.PGameApp
                        .navigate ===
                        "function"
                ) {

                    event.preventDefault();

                    closeDrawer();

                    window.PGameApp.navigate(
                        href
                    );

                    return;

                }


                closeDrawer();

            }
        );


        nav.appendChild(
            link
        );

    }


    /* =========================================================
       DRAWER PROGRESS
    ========================================================= */

    function setDrawerProgress(
        progress,
        fromClosed = false
    ) {

        if (!drawer) {

            return;

        }


        const clamped =
            Math.max(
                0,
                Math.min(
                    1,
                    progress
                )
            );


        const translate =
            -100 +
            clamped * 100;


        drawer.style.transform =
            `translateX(${translate}%)`;


        if (overlay) {

            overlay.style.opacity =
                String(
                    clamped
                );

            overlay.style.pointerEvents =
                clamped > .02
                    ? "auto"
                    : "none";

        }


        drawer.setAttribute(
            "aria-hidden",
            clamped > .5
                ? "false"
                : "true"
        );


        if (
            fromClosed &&
            clamped > .02
        ) {

            document.body.classList.add(
                OPEN_CLASS
            );

        }

    }


    /* =========================================================
       OPEN
    ========================================================= */

    function openDrawer(
        animated = true
    ) {

        createDrawer();


        drawer.classList.toggle(
            "no-transition",
            !animated
        );


        overlay?.classList.toggle(
            "no-transition",
            !animated
        );


        document.body.classList.add(
            OPEN_CLASS
        );


        drawer.setAttribute(
            "aria-hidden",
            "false"
        );


        overlay?.setAttribute(
            "aria-hidden",
            "false"
        );


        requestAnimationFrame(
            function () {

                drawer.classList.add(
                    "open"
                );


                overlay?.classList.add(
                    "visible"
                );


                drawer.style.transform =
                    "";


                if (overlay) {

                    overlay.style.opacity =
                        "";

                    overlay.style.pointerEvents =
                        "";

                }


                if (!animated) {

                    requestAnimationFrame(
                        function () {

                            drawer.classList.remove(
                                "no-transition"
                            );

                            overlay?.classList.remove(
                                "no-transition"
                            );

                        }
                    );

                }

            }
        );

    }


    /* =========================================================
       CLOSE
    ========================================================= */

    function closeDrawer(
        animated = true
    ) {

        if (!drawer) {

            return;

        }


        drawer.classList.toggle(
            "no-transition",
            !animated
        );


        overlay?.classList.toggle(
            "no-transition",
            !animated
        );


        drawer.classList.remove(
            "open"
        );


        overlay?.classList.remove(
            "visible"
        );


        drawer.setAttribute(
            "aria-hidden",
            "true"
        );


        overlay?.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            OPEN_CLASS
        );


        if (!animated) {

            drawer.style.transform =
                "";


            if (overlay) {

                overlay.style.opacity =
                    "";

                overlay.style.pointerEvents =
                    "";

            }


            requestAnimationFrame(
                function () {

                    drawer.classList.remove(
                        "no-transition"
                    );

                    overlay?.classList.remove(
                        "no-transition"
                    );

                }
            );

        }

    }


    /* =========================================================
       OPEN STATE
    ========================================================= */

    function isDrawerOpen() {

        return !!(
            drawer &&
            drawer.classList.contains(
                "open"
            )
        );

    }


    /* =========================================================
       DRAWER TOUCH
    ========================================================= */

    function onDrawerTouchStart(
        event
    ) {

        if (
            !isDrawerOpen()
        ) {

            return;

        }


        const touch =
            event.touches?.[0];


        if (!touch) {

            return;

        }


        touchStartX =
            touch.clientX;

        touchStartY =
            touch.clientY;

        touchCurrentX =
            touch.clientX;


        draggingDrawer =
            true;


        drawerWidth =
            drawer.getBoundingClientRect()
                .width ||
            window.innerWidth * .82 ||
            310;


        drawer.classList.add(
            "dragging"
        );

    }


    function onDrawerTouchMove(
        event
    ) {

        if (
            !draggingDrawer ||
            !drawer
        ) {

            return;

        }


        const touch =
            event.touches?.[0];


        if (!touch) {

            return;

        }


        touchCurrentX =
            touch.clientX;


        const dx =
            touchCurrentX -
            touchStartX;


        const dy =
            touch.clientY -
            touchStartY;


        if (
            Math.abs(dy) >
                Math.abs(dx) &&
            Math.abs(dy) >
                12
        ) {

            draggingDrawer =
                false;


            drawer.classList.remove(
                "dragging"
            );


            return;

        }


        /*
         * Drawer is on the left.
         * Only left movement closes it.
         */

        if (
            dx >= 0
        ) {

            event.preventDefault();

            return;

        }


        event.preventDefault();


        const progress =
            1 -
            Math.min(
                1,
                Math.abs(dx) /
                    drawerWidth
            );


        drawer.style.transform =
            `translateX(${(
                progress - 1
            ) * 100}%)`;


        if (overlay) {

            overlay.style.opacity =
                String(
                    progress
                );

        }

    }


    function onDrawerTouchEnd() {

        if (
            !drawer ||
            !draggingDrawer
        ) {

            return;

        }


        const dx =
            touchCurrentX -
            touchStartX;


        draggingDrawer =
            false;


        drawer.classList.remove(
            "dragging"
        );


        if (
            dx <
            -(drawerWidth * .28)
        ) {

            closeDrawer();

        } else {

            openDrawer();

        }

    }


    /* =========================================================
       EDGE SWIPE
    ========================================================= */

    function onDocumentTouchStart(
        event
    ) {

        if (
            !isAppMode()
        ) {

            return;

        }


        const touch =
            event.touches?.[0];


        if (!touch) {

            return;

        }


        touchStartX =
            touch.clientX;

        touchStartY =
            touch.clientY;

        touchCurrentX =
            touch.clientX;


        if (
            isDrawerOpen()
        ) {

            trackingEdgeSwipe =
                false;

            return;

        }


        const edgeSize =
            Math.min(
                34,
                Math.max(
                    22,
                    window.innerWidth * .09
                )
            );


        trackingEdgeSwipe =
            touch.clientX <=
                edgeSize;

    }


    function onDocumentTouchMove(
        event
    ) {

        if (
            !isAppMode()
        ) {

            return;

        }


        const touch =
            event.touches?.[0];


        if (!touch) {

            return;

        }


        touchCurrentX =
            touch.clientX;


        if (!trackingEdgeSwipe) {

            return;

        }


        const dx =
            touchCurrentX -
            touchStartX;


        const dy =
            touch.clientY -
            touchStartY;


        if (
            Math.abs(dy) >
                Math.abs(dx) &&
            Math.abs(dy) >
                10
        ) {

            trackingEdgeSwipe =
                false;

            return;

        }


        if (
            dx <= 0
        ) {

            return;

        }


        if (!drawer) {

            createDrawer();

        }


        event.preventDefault();


        const width =
            drawer.getBoundingClientRect()
                .width ||
            drawerWidth ||
            310;


        const progress =
            Math.min(
                1,
                dx / width
            );


        setDrawerProgress(
            progress,
            true
        );

    }


    function onDocumentTouchEnd() {

        if (!trackingEdgeSwipe) {

            return;

        }


        const dx =
            touchCurrentX -
            touchStartX;


        const width =
            drawer?.getBoundingClientRect()
                .width ||
            drawerWidth ||
            310;


        trackingEdgeSwipe =
            false;


        if (
            dx >
            width * .22
        ) {

            openDrawer();

        } else {

            closeDrawer();

        }

    }


    /* =========================================================
       KEYBOARD
    ========================================================= */

    function setupKeyboard() {

        if (
            window.__pgameNavigationKeyboard
        ) {

            return;

        }


        window.__pgameNavigationKeyboard =
            true;


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                        "Escape" &&
                    isDrawerOpen()
                ) {

                    closeDrawer();

                }

            }
        );

    }


    /* =========================================================
       DESKTOP MENU BUTTON
    ========================================================= */

    function setupDesktopTrigger() {

        const trigger =
            document.getElementById(
                "vexon-menu-trigger"
            );


        if (!trigger) {

            return;

        }


        if (
            isAppMode()
        ) {

            trigger.style.display =
                "none";


            trigger.setAttribute(
                "aria-hidden",
                "true"
            );


            return;

        }


        if (
            trigger.dataset
                .pgameNavigationBound ===
            "1"
        ) {

            return;

        }


        trigger.dataset
            .pgameNavigationBound =
            "1";


        trigger.addEventListener(
            "click",
            function () {

                if (
                    isDrawerOpen()
                ) {

                    closeDrawer();

                } else {

                    openDrawer();

                }

            }
        );

    }


    /* =========================================================
       APP MODE
    ========================================================= */

    function setupAppMode() {

        if (
            !isAppMode()
        ) {

            return;

        }


        createDrawer();


        if (
            window.__pgameNavigationGestures
        ) {

            return;

        }


        window.__pgameNavigationGestures =
            true;


        document.addEventListener(
            "touchstart",
            onDocumentTouchStart,
            {
                passive: true
            }
        );


        document.addEventListener(
            "touchmove",
            onDocumentTouchMove,
            {
                passive: false
            }
        );


        document.addEventListener(
            "touchend",
            onDocumentTouchEnd,
            {
                passive: true
            }
        );


        document.addEventListener(
            "touchcancel",
            onDocumentTouchEnd,
            {
                passive: true
            }
        );

    }


    /* =========================================================
       ACTIVE LINK
    ========================================================= */

    function refreshActiveLink() {

        if (!drawer) {

            return;

        }


        const links =
            drawer.querySelectorAll(
                ".pgame-drawer-link"
            );


        links.forEach(
            function (link) {

                const href =
                    link.dataset.href ||
                    link.getAttribute(
                        "href"
                    );


                link.classList.toggle(
                    "active",
                    isActiveLink(
                        href
                    )
                );

            }
        );

    }


    /* =========================================================
       NAVIGATION STYLES
    ========================================================= */

    function installNavigationStyles() {

        if (
            document.getElementById(
                "pgame-nav-runtime-style"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "pgame-nav-runtime-style";


        style.textContent = `

        /* =====================================================
           DRAWER OVERLAY
        ====================================================== */

        .pgame-nav-overlay {

            position:
                fixed;

            inset:
                0;

            z-index:
                99996;

            background:
                rgba(
                    0,
                    0,
                    0,
                    .58
                );

            opacity:
                0;

            pointer-events:
                none;

            transition:
                opacity .26s ease,
                backdrop-filter .26s ease;

            backdrop-filter:
                blur(0);

            -webkit-backdrop-filter:
                blur(0);

        }


        .pgame-nav-overlay.visible {

            opacity:
                1;

            pointer-events:
                auto;

            backdrop-filter:
                blur(5px);

            -webkit-backdrop-filter:
                blur(5px);

        }


        /* =====================================================
           DRAWER
        ====================================================== */

        .pgame-navigation-drawer {

            position:
                fixed;

            top:
                0;

            bottom:
                0;

            left:
                0;

            width:
                min(
                    340px,
                    84vw
                );

            z-index:
                99997;

            display:
                flex;

            flex-direction:
                column;

            background:
                linear-gradient(
                    180deg,
                    rgba(
                        8,
                        12,
                        22,
                        .98
                    ),
                    rgba(
                        3,
                        4,
                        10,
                        .99
                    )
                );

            border-right:
                1px solid
                rgba(
                    0,
                    255,
                    157,
                    .20
                );

            box-shadow:
                12px 0 50px
                rgba(
                    0,
                    0,
                    0,
                    .55
                ),

                inset
                -1px 0 0
                rgba(
                    0,
                    255,
                    157,
                    .04
                );

            transform:
                translateX(
                    -100%
                );

            transition:
                transform
                .28s
                cubic-bezier(
                    .22,
                    .61,
                    .36,
                    1
                );

            will-change:
                transform;

            overflow:
                hidden auto;

            overscroll-behavior:
                contain;

            touch-action:
                pan-y;

            -webkit-overflow-scrolling:
                touch;

        }


        .pgame-navigation-drawer.open {

            transform:
                translateX(
                    0
                );

        }


        .pgame-navigation-drawer.dragging {

            transition:
                none !important;

        }


        .pgame-navigation-drawer.no-transition,
        .pgame-nav-overlay.no-transition {

            transition:
                none !important;

        }


        /* =====================================================
           HEADER
        ====================================================== */

        .pgame-drawer-header {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

            gap:
                12px;

            padding:
                22px
                18px
                16px;

            border-bottom:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .07
                );

            flex:
                0 0 auto;

        }


        .pgame-drawer-brand {

            display:
                flex;

            align-items:
                center;

            gap:
                12px;

            min-width:
                0;

        }


        .pgame-drawer-brand-mark {

            width:
                42px;

            height:
                42px;

            flex:
                0 0 42px;

            display:
                grid;

            place-items:
                center;

            border-radius:
                13px;

            color:
                #00ff9d;

            background:
                radial-gradient(
                    circle at
                    50% 45%,

                    rgba(
                        0,
                        255,
                        157,
                        .20
                    ),

                    rgba(
                        0,
                        255,
                        157,
                        .03
                    )
                    70%
                );

            border:
                1px solid
                rgba(
                    0,
                    255,
                    157,
                    .34
                );

            box-shadow:
                0 0 22px
                rgba(
                    0,
                    255,
                    157,
                    .15
                );

            font-family:
                Orbitron,
                sans-serif;

            font-size:
                20px;

            font-weight:
                800;

        }


        .pgame-drawer-brand-text {

            display:
                flex;

            flex-direction:
                column;

            min-width:
                0;

        }


        .pgame-drawer-brand-text strong {

            font-family:
                Orbitron,
                sans-serif;

            font-size:
                17px;

            letter-spacing:
                .5px;

            color:
                #fff;

        }


        .pgame-drawer-brand-text span {

            margin-top:
                3px;

            color:
                rgba(
                    255,
                    255,
                    255,
                    .48
                );

            font-size:
                10px;

            white-space:
                nowrap;

        }


        .pgame-drawer-close {

            width:
                42px;

            height:
                42px;

            flex:
                0 0 42px;

            display:
                grid;

            place-items:
                center;

            padding:
                0;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .08
                );

            border-radius:
                12px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .035
                );

            color:
                rgba(
                    255,
                    255,
                    255,
                    .76
                );

            font-size:
                28px;

            line-height:
                1;

            cursor:
                pointer;

            touch-action:
                manipulation;

            transition:
                transform .18s ease,
                color .18s ease,
                border-color .18s ease,
                background .18s ease;

        }


        .pgame-drawer-close:hover {

            color:
                #fff;

            border-color:
                rgba(
                    0,
                    255,
                    157,
                    .35
                );

            background:
                rgba(
                    0,
                    255,
                    157,
                    .07
                );

            transform:
                scale(
                    1.04
                );

        }


        /* =====================================================
           NAV
        ====================================================== */

        .pgame-drawer-nav {

            display:
                flex;

            flex-direction:
                column;

            gap:
                7px;

            padding:
                18px
                12px;

            flex:
                0 0 auto;

        }


        .pgame-drawer-link {

            position:
                relative;

            display:
                flex;

            align-items:
                center;

            gap:
                13px;

            min-height:
                54px;

            padding:
                0
                14px;

            color:
                rgba(
                    255,
                    255,
                    255,
                    .72
                );

            text-decoration:
                none;

            border:
                1px solid
                transparent;

            border-radius:
                15px;

            touch-action:
                manipulation;

            -webkit-tap-highlight-color:
                transparent;

            transition:
                transform .18s ease,
                color .18s ease,
                background .18s ease,
                border-color .18s ease,
                box-shadow .18s ease;

        }


        .pgame-drawer-link:hover {

            color:
                #fff;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .035
                );

            transform:
                translateX(
                    3px
                );

        }


        .pgame-drawer-link.active {

            color:
                #fff;

            background:
                linear-gradient(
                    90deg,
                    rgba(
                        0,
                        255,
                        157,
                        .12
                    ),
                    rgba(
                        116,
                        77,
                        255,
                        .07
                    )
                );

            border-color:
                rgba(
                    0,
                    255,
                    157,
                    .18
                );

            box-shadow:
                inset
                3px 0 0
                #00ff9d,

                0 0 25px
                rgba(
                    0,
                    255,
                    157,
                    .05
                );

        }


        .pgame-drawer-link-icon {

            width:
                30px;

            flex:
                0 0 30px;

            text-align:
                center;

            font-size:
                20px;

            line-height:
                1;

        }


        .pgame-drawer-link-label {

            flex:
                1;

            font-size:
                14px;

            font-weight:
                700;

        }


        .pgame-drawer-link-arrow {

            color:
                rgba(
                    255,
                    255,
                    255,
                    .24
                );

            font-size:
                20px;

            transform:
                translateY(
                    -1px
                );

        }


        .pgame-drawer-link.active
        .pgame-drawer-link-arrow {

            color:
                #00ff9d;

        }


        /* =====================================================
           SETTINGS
        ====================================================== */

        .pgame-settings-divider {

            width:
                calc(
                    100% -
                    8px
                );

            height:
                1px;

            margin:
                7px
                auto
                5px;

            background:
                linear-gradient(
                    90deg,
                    transparent,
                    rgba(
                        0,
                        255,
                        157,
                        .30
                    ),
                    rgba(
                        116,
                        77,
                        255,
                        .22
                    ),
                    transparent
                );

        }


        .pgame-drawer-link.pgame-settings-link {

            margin-top:
                1px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .018
                );

        }


        .pgame-drawer-link.pgame-settings-link:hover {

            background:
                rgba(
                    116,
                    77,
                    255,
                    .07
                );

        }


        .pgame-drawer-link.pgame-settings-link.active {

            background:
                linear-gradient(
                    90deg,
                    rgba(
                        116,
                        77,
                        255,
                        .13
                    ),
                    rgba(
                        0,
                        234,
                        255,
                        .06
                    )
                );

            border-color:
                rgba(
                    116,
                    77,
                    255,
                    .24
                );

            box-shadow:
                inset
                3px 0 0
                #744dff,

                0 0 25px
                rgba(
                    116,
                    77,
                    255,
                    .06
                );

        }


        .pgame-drawer-link.pgame-settings-link.active
        .pgame-drawer-link-arrow {

            color:
                #b38cff;

        }


        /* =====================================================
           FOOTER
        ====================================================== */

        .pgame-drawer-footer {

            margin-top:
                auto;

            padding:
                18px
                18px
                24px;

            display:
                flex;

            flex-direction:
                column;

            flex:
                0 0 auto;

        }


        .pgame-drawer-footer-line {

            width:
                100%;

            height:
                1px;

            margin-bottom:
                14px;

            background:
                linear-gradient(
                    90deg,
                    transparent,
                    rgba(
                        0,
                        255,
                        157,
                        .28
                    ),
                    transparent
                );

        }


        .pgame-drawer-footer span {

            font-family:
                Orbitron,
                sans-serif;

            font-size:
                10px;

            color:
                rgba(
                    255,
                    255,
                    255,
                    .35
                );

            letter-spacing:
                1px;

            text-align:
                center;

        }


        .pgame-drawer-footer small {

            margin-top:
                4px;

            font-size:
                9px;

            color:
                rgba(
                    255,
                    255,
                    255,
                    .22
                );

            text-align:
                center;

        }


        /* =====================================================
           APP SCROLL
        ====================================================== */

        html.pgame-app,
        body.pgame-app {

            touch-action:
                pan-y !important;

            overflow-x:
                hidden !important;

            overflow-y:
                auto !important;

        }


        body.pgame-drawer-open {
            /*
             * Intentionally no overflow:hidden.
             * Normal page scrolling must keep working.
             */
        }


        /* =====================================================
           STATUS BAR
        ====================================================== */

        .pgame-statusbar {

            display:
                flex;

            align-items:
                center;

            gap:
                9px;

            min-width:
                250px;

            padding:
                7px
                9px;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .08
                );

            border-radius:
                16px;

            background:
                rgba(
                    7,
                    10,
                    18,
                    .72
                );

            backdrop-filter:
                blur(14px);

            -webkit-backdrop-filter:
                blur(14px);

            text-decoration:
                none;

            color:
                #fff;

            box-shadow:
                0 8px 25px
                rgba(
                    0,
                    0,
                    0,
                    .16
                );

            transition:
                border-color .2s ease,
                box-shadow .2s ease,
                transform .2s ease;

        }


        .pgame-statusbar:hover {

            border-color:
                rgba(
                    0,
                    234,
                    255,
                    .24
                );

            box-shadow:
                0 0 22px
                rgba(
                    0,
                    234,
                    255,
                    .08
                );

            transform:
                translateY(
                    -1px
                );

        }


        /* =====================================================
           LEVEL CIRCLE
        ====================================================== */

        .pgame-level-circle {

            width:
                39px;

            height:
                39px;

            flex:
                0 0 39px;

            display:
                grid;

            place-items:
                center;

            border-radius:
                50%;

            background:
                radial-gradient(
                    circle at
                    34% 28%,
                    #43d8ff,
                    #0b98ff 58%,
                    #0065ff
                );

            border:
                2px solid
                rgba(
                    0,
                    234,
                    255,
                    .78
                );

            box-shadow:
                0 0 18px
                rgba(
                    0,
                    174,
                    255,
                    .34
                ),

                inset
                0 0 12px
                rgba(
                    255,
                    255,
                    255,
                    .12
                );

            color:
                #fff;

            font-family:
                Orbitron,
                Vazirmatn,
                sans-serif;

            font-size:
                9px;

            font-weight:
                900;

            white-space:
                nowrap;

        }


        /* =====================================================
           XP BAR
        ====================================================== */

        .pgame-xp-wrap {

            width:
                112px;

            flex:
                0 1 112px;

        }


        .pgame-xp-track {

            position:
                relative;

            display:
                block;

            width:
                100%;

            height:
                8px;

            overflow:
                hidden;

            border-radius:
                999px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .07
                );

            box-shadow:
                inset
                0 0 5px
                rgba(
                    0,
                    0,
                    0,
                    .25
                );

        }


        .pgame-xp-fill {

            position:
                relative;

            display:
                block;

            width:
                0%;

            height:
                100%;

            border-radius:
                inherit;

            background:
                linear-gradient(
                    90deg,
                    #ff245f,
                    #ffb52e,
                    #00ff9d,
                    #00eaff,
                    #744dff,
                    #ff245f
                );

            background-size:
                300%
                100%;

            box-shadow:
                0 0 14px
                rgba(
                    0,
                    234,
                    255,
                    .30
                );

            animation:
                pgame-xp-rgb
                3s
                linear
                infinite;

            transition:
                width .45s
                cubic-bezier(
                    .22,
                    .61,
                    .36,
                    1
                );

        }


        @keyframes pgame-xp-rgb {

            from {

                background-position:
                    0%
                    50%;

            }

            to {

                background-position:
                    300%
                    50%;

            }

        }


        /* =====================================================
           COINS
        ====================================================== */

        .pgame-coins {

            white-space:
                nowrap;

            font-size:
                11px;

            font-weight:
                900;

            color:
                #ffd95a;

            text-shadow:
                0 0 9px
                rgba(
                    255,
                    217,
                    90,
                    .12
                );

        }


        /* =====================================================
           RESPONSIVE STATUS
        ====================================================== */

        @media (max-width: 720px) {

            .pgame-statusbar {

                min-width:
                    0;

                padding:
                    5px
                    7px;

                gap:
                    7px;

                border-radius:
                    14px;

            }


            .pgame-level-circle {

                width:
                    34px;

                height:
                    34px;

                flex-basis:
                    34px;

                font-size:
                    8px;

            }


            .pgame-xp-wrap {

                width:
                    72px;

                flex-basis:
                    72px;

            }


            .pgame-coins {

                font-size:
                    9px;

            }

        }


        @media (max-width: 430px) {

            .pgame-statusbar {

                gap:
                    5px;

                padding:
                    4px
                    6px;

            }


            .pgame-level-circle {

                width:
                    32px;

                height:
                    32px;

                flex-basis:
                    32px;

            }


            .pgame-xp-wrap {

                width:
                    58px;

                flex-basis:
                    58px;

            }


            .pgame-xp-track {

                height:
                    6px;

            }


            .pgame-coins {

                font-size:
                    8px;

            }

        }


        /* =====================================================
           REDUCED MOTION
        ====================================================== */

        @media (prefers-reduced-motion: reduce) {

            .pgame-navigation-drawer,
            .pgame-nav-overlay,
            .pgame-drawer-link,
            .pgame-drawer-close,
            .pgame-statusbar {

                transition:
                    none !important;

            }


            .pgame-xp-fill {

                animation:
                    none !important;

            }

        }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =========================================================
       STATUS BAR
    ========================================================= */

    function createStatusBar() {

        const old =
            document.querySelector(
                ".header-profile"
            );


        if (!old) {

            return;

        }


        if (
            old.dataset
                .pgameStatusConverted ===
            "1"
        ) {

            return;

        }


        const bar =
            document.createElement(
                "a"
            );


        bar.className =
            "pgame-statusbar";


        bar.href =
            settingsHref();


        bar.dataset
            .pgameStatusConverted =
            "1";


        bar.setAttribute(
            "aria-label",
            "وضعیت حساب و تنظیمات PGame"
        );


        bar.innerHTML = `

            <span
                class="pgame-level-circle"
                id="pg-status-level"
            >
                LV --
            </span>

            <span
                class="pgame-xp-wrap"
            >

                <span
                    class="pgame-xp-track"
                    aria-hidden="true"
                >

                    <span
                        class="pgame-xp-fill"
                        id="pg-status-xp"
                    ></span>

                </span>

            </span>

            <span
                class="pgame-coins"
                id="pg-status-coins"
            >
                🪙 --
            </span>

        `;


        old.replaceWith(
            bar
        );


        loadStatusBar();

    }


    /* =========================================================
       STATUS BAR DATA
    ========================================================= */

    async function loadStatusBar() {

        const levelElement =
            document.getElementById(
                "pg-status-level"
            );


        const xpFill =
            document.getElementById(
                "pg-status-xp"
            );


        const coinsElement =
            document.getElementById(
                "pg-status-coins"
            );


        if (
            !levelElement ||
            !xpFill ||
            !coinsElement
        ) {

            return;

        }


        function render(
            user
        ) {

            if (
                !user
            ) {

                return;

            }


            const level =
                Number(
                    user.level ?? 1
                );


            const coins =
                Number(
                    user.coins ?? 0
                );


            let progress =
                Number(
                    user.xp_progress
                );


            if (
                !Number.isFinite(
                    progress
                )
            ) {

                const xp =
                    Number(
                        user.xp ?? 0
                    );


                const nextXp =
                    Number(
                        user.next_xp ?? 100
                    );


                if (
                    nextXp > 0
                ) {

                    progress =
                        (
                            xp /
                            nextXp
                        ) *
                        100;

                } else {

                    progress =
                        0;

                }

            }


            progress =
                Math.max(
                    0,
                    Math.min(
                        100,
                        progress
                    )
                );


            levelElement.textContent =
                `LV ${level}`;


            coinsElement.textContent =
                `🪙 ${coins.toLocaleString(
                    "fa-IR"
                )}`;


            xpFill.style.width =
                `${progress}%`;

        }


        /* =====================================================
           CACHE
        ====================================================== */

        try {

            const cached =
                JSON.parse(
                    localStorage.getItem(
                        "pgame_account_cache_v1"
                    ) || "null"
                );


            if (
                cached?.user
            ) {

                render(
                    cached.user
                );

            }

        } catch (
            error
        ) {

            console.debug(
                "PGAME_STATUS_CACHE_ERROR",
                error
            );

        }


        /* =====================================================
           SERVER
        ====================================================== */

        try {

            const response =
                await fetch(
                    "/api/me",
                    {
                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store"
                    }
                );


            const data =
                await response.json();


            if (
                data?.loggedIn &&
                data?.user
            ) {

                render(
                    data.user
                );


                try {

                    localStorage.setItem(
                        "pgame_account_cache_v1",
                        JSON.stringify({
                            saved_at:
                                Date.now(),

                            user:
                                data.user
                        })
                    );

                } catch {}

            }

        } catch (
            error
        ) {

            console.debug(
                "PGAME_STATUS_SERVER_ERROR",
                error
            );

        }

    }


    /* =========================================================
       INITIALIZE
    ========================================================= */

    function initialize() {

        installNavigationStyles();


        /*
         * Replace old Profile header
         * with the new status bar.
         */

        createStatusBar();


        setupDesktopTrigger();


        setupKeyboard();


        if (
            !isAppMode()
        ) {

            createDrawer();

        } else {

            setupAppMode();

        }


        refreshActiveLink();


        requestAnimationFrame(
            function () {

                if (
                    drawer
                ) {

                    drawerWidth =
                        drawer
                            .getBoundingClientRect()
                            .width ||
                        310;

                }


                refreshActiveLink();

            }
        );


        setTimeout(
            refreshActiveLink,
            100
        );


        /*
         * Status can appear after
         * another script modifies header.
         */

        setTimeout(
            function () {

                createStatusBar();

            },
            250
        );

    }


    /* =========================================================
       RESIZE / HISTORY
    ========================================================= */

    window.addEventListener(
        "popstate",
        function () {

            refreshActiveLink();

        }
    );


    window.addEventListener(
        "resize",
        function () {

            if (!drawer) {

                return;

            }


            drawerWidth =
                drawer
                    .getBoundingClientRect()
                    .width ||
                drawerWidth ||
                310;


            refreshActiveLink();

        }
    );


    /* =========================================================
       PUBLIC API
    ========================================================= */

    window.PGameNavigation = {

        open:
            openDrawer,

        close:
            closeDrawer,

        toggle:
            function () {

                if (
                    isDrawerOpen()
                ) {

                    closeDrawer();

                } else {

                    openDrawer();

                }

            },

        refresh:
            refreshActiveLink,

        isOpen:
            isDrawerOpen,

        initializeAppMode:
            setupAppMode,

        refreshStatus:
            loadStatusBar

    };


    /* =========================================================
       START
    ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once:
                    true
            }
        );

    } else {

        initialize();

    }


})();