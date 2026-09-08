"use strict";

(function () {


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

let drawer = null;
let overlay = null;

let touchStartX = 0;
let touchStartY = 0;

let touchCurrentX = 0;

let trackingEdgeSwipe = false;
let draggingDrawer = false;

let drawerWidth = 0;

const APP_CLASS = "pgame-app";
const OPEN_CLASS = "pgame-drawer-open";

const DRAWER_ID =
    "pgame-navigation-drawer";

const OVERLAY_ID =
    "pgame-navigation-overlay";

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

function getCurrentPath() {

    const path =
        window.location.pathname || "";

    return (
        path.replace(/\/+$/, "") ||
        "/"
    );
}

function normalizeHref(href) {

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

function isActiveLink(href) {

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

function createDrawer() {

    const existing =
        document.getElementById(
            DRAWER_ID
        );

    if (existing) {

        drawer = existing;

        overlay =
            document.getElementById(
                OVERLAY_ID
            );

        drawerWidth =
            drawer.getBoundingClientRect()
                .width || 310;

        return;
    }

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
        <div class="pgame-drawer-brand-mark">P</div>

        <div class="pgame-drawer-brand-text">
            <strong>PGame</strong>

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
        () => closeDrawer()
    );

    header.appendChild(
        brand
    );

    header.appendChild(
        closeButton
    );

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

    items.forEach((item) => {

        const link =
            document.createElement(
                "a"
            );

        link.className =
            "pgame-drawer-link";

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
    });

    const footer =
        document.createElement(
            "div"
        );

    footer.className =
        "pgame-drawer-footer";

    footer.innerHTML = `
        <div class="pgame-drawer-footer-line"></div>

        <span>PGame</span>

        <small>
            Play • Compete • Level Up.
        </small>
    `;

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
        () => closeDrawer()
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
            String(clamped);

        overlay.style.pointerEvents =
            clamped > 0.02
                ? "auto"
                : "none";
    }

    drawer.setAttribute(
        "aria-hidden",
        clamped > 0.5
            ? "false"
            : "true"
    );

    if (
        fromClosed &&
        clamped > 0.02
    ) {

        document.body.classList.add(
            OPEN_CLASS
        );
    }
}

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
        () => {

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
                    () => {

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
            () => {

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

function isDrawerOpen() {

    return !!(
        drawer &&
        drawer.classList.contains(
            "open"
        )
    );
}

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
     * Only a leftward drag closes it.
     */
    if (dx >= 0) {

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
        `translateX(${(progress - 1) * 100}%)`;

    if (overlay) {

        overlay.style.opacity =
            String(progress);
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

function onDocumentTouchStart(
    event
) {

    if (!isAppMode()) {
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

    if (!isAppMode()) {
        return;
    }

    const touch =
        event.touches?.[0];

    if (!touch) {
        return;
    }

    touchCurrentX =
        touch.clientX;

    /*
     * IMPORTANT:
     *
     * When the touch does NOT start from the edge,
     * we do absolutely nothing.
     *
     * Therefore normal page scrolling remains native.
     */
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

    if (dx <= 0) {
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

function setupDesktopTrigger() {

    const trigger =
        document.getElementById(
            "vexon-menu-trigger"
        );

    if (!trigger) {
        return;
    }

    if (isAppMode()) {

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

function setupAppMode() {

    if (!isAppMode()) {
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

function refreshActiveLink() {

    if (!drawer) {
        return;
    }

    const links =
        drawer.querySelectorAll(
            ".pgame-drawer-link"
        );

    links.forEach(
        (link) => {

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

        .pgame-nav-overlay {
            position: fixed;
            inset: 0;

            z-index: 99996;

            background:
                rgba(0,0,0,.58);

            opacity: 0;

            pointer-events: none;

            transition:
                opacity .26s ease,
                backdrop-filter .26s ease;

            backdrop-filter:
                blur(0);

            -webkit-backdrop-filter:
                blur(0);
        }

        .pgame-nav-overlay.visible {
            opacity: 1;

            pointer-events: auto;

            backdrop-filter:
                blur(5px);

            -webkit-backdrop-filter:
                blur(5px);
        }

        .pgame-navigation-drawer {
            position: fixed;

            top: 0;
            bottom: 0;
            left: 0;

            width:
                min(340px, 84vw);

            z-index: 99997;

            display: flex;

            flex-direction: column;

            background:
                linear-gradient(
                    180deg,
                    rgba(8,12,22,.98),
                    rgba(3,4,10,.99)
                );

            border-right:
                1px solid
                rgba(0,255,157,.20);

            box-shadow:
                12px 0 50px
                rgba(0,0,0,.55),

                inset -1px 0 0
                rgba(0,255,157,.04);

            transform:
                translateX(-100%);

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
                translateX(0);
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

        .pgame-drawer-header {
            display: flex;

            align-items: center;

            justify-content:
                space-between;

            gap: 12px;

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
            display: flex;

            align-items: center;

            gap: 12px;

            min-width: 0;
        }

        .pgame-drawer-brand-mark {
            width: 42px;
            height: 42px;

            flex: 0 0 42px;

            display: grid;

            place-items: center;

            border-radius: 13px;

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
            display: flex;

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
            width: 42px;
            height: 42px;

            flex:
                0 0 42px;

            display: grid;

            place-items: center;

            padding: 0;

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
                scale(1.04);
        }

        .pgame-drawer-nav {
            display: flex;

            flex-direction:
                column;

            gap: 7px;

            padding:
                18px
                12px;

            flex:
                0 0 auto;
        }

        .pgame-drawer-link {
            position:
                relative;

            display: flex;

            align-items:
                center;

            gap: 13px;

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
                translateX(3px);
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
                translateY(-1px);
        }

        .pgame-drawer-link.active
        .pgame-drawer-link-arrow {
            color:
                #00ff9d;
        }

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

        /*
         * App mode:
         *
         * Keep the page itself scrollable.
         */
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
             * Do NOT set overflow:hidden here.
             *
             * That would break page scrolling after
             * the drawer closes.
             */
        }

        @media (max-width: 560px) {

            .pgame-navigation-drawer {
                width:
                    min(
                        320px,
                        86vw
                    );
            }
        }

        @media (prefers-reduced-motion: reduce) {

            .pgame-navigation-drawer,
            .pgame-nav-overlay,
            .pgame-drawer-link,
            .pgame-drawer-close {
                transition:
                    none !important;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}

function initializeAppMode() {

    if (!isAppMode()) {
        return;
    }

    installNavigationStyles();

    createDrawer();

    setupAppMode();

    setupKeyboard();

    refreshActiveLink();

    /*
     * Recalculate after the WebView has completed layout.
     */
    requestAnimationFrame(
        () => {

            if (drawer) {

                drawerWidth =
                    drawer.getBoundingClientRect()
                        .width ||
                    310;
            }

            refreshActiveLink();
        }
    );
}

function initialize() {

    installNavigationStyles();

    setupDesktopTrigger();

    setupKeyboard();

    if (!isAppMode()) {

        createDrawer();

    } else {

        initializeAppMode();
    }

    window.addEventListener(
        "popstate",
        refreshActiveLink
    );

    window.addEventListener(
        "resize",
        function () {

            if (!drawer) {
                return;
            }

            drawerWidth =
                drawer.getBoundingClientRect()
                    .width ||
                drawerWidth ||
                310;

            refreshActiveLink();
        }
    );

    setTimeout(
        refreshActiveLink,
        100
    );
}

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
        initializeAppMode
};

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        {
            once: true
        }
    );

} else {

    initialize();
}


})();
