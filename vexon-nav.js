/* =========================================================
   VEXON GLOBAL NAVIGATION
   Hamburger + Left Sidebar
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       PATH
    ===================================================== */

    const inSections =
        window.location.pathname.includes(
            "/sections/"
        );


    function pagePath(
        rootPage,
        sectionPage
    ) {

        return inSections
            ? sectionPage
            : rootPage;

    }


    /* =====================================================
       NAVIGATION ITEMS
    ===================================================== */

    const navigationItems = [

        {
            icon: "⌂",
            label: "خانه",
            href:
                pagePath(
                    "index.html",
                    "../index.html"
                )
        },

        {
            icon: "🎮",
            label: "بازی‌ها",
            href:
                pagePath(
                    "sections/games.html",
                    "games.html"
                )
        },

        {
            icon: "🏆",
            label: "لیدربورد",
            href:
                pagePath(
                    "sections/leaderboard.html",
                    "leaderboard.html"
                )
        },

        {
            icon: "☕",
            label: "کافه بازی",
            href:
                pagePath(
                    "sections/cafe.html",
                    "cafe.html"
                )
        },

        {
            icon: "💬",
            label: "پیام‌رسان",
            href:
                pagePath(
                    "sections/messenger.html",
                    "messenger.html"
                )
        },

        {
            icon: "📢",
            label: "اخبار",
            href:
                pagePath(
                    "sections/news.html",
                    "news.html"
                )
        },

        {
            icon: "?",
            label: "راهنما",
            href:
                pagePath(
                    "sections/guide.html",
                    "guide.html"
                )
        },

        {
            icon: "👤",
            label: "پروفایل",
            href:
                pagePath(
                    "sections/profile.html",
                    "profile.html"
                )
        }

    ];


    /* =====================================================
       STYLES
    ===================================================== */

    const style =
        document.createElement(
            "style"
        );


    style.id =
        "vexon-global-nav-style";


    style.textContent = `

        /* =================================================
           REMOVE OLD MOBILE BOTTOM NAV
        ================================================= */

        .mobile-bottom-nav {
            display: none !important;
        }


        body {
            padding-bottom: 0 !important;
        }


        /* =================================================
           GLOBAL NAV BUTTON
        ================================================= */

        .vexon-global-menu-trigger {

            width: 43px;
            height: 43px;

            flex: 0 0 43px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 13px;

            border: 1px solid
                rgba(
                    0,
                    255,
                    157,
                    .14
                );

            background:
                rgba(
                    0,
                    255,
                    157,
                    .055
                );

            color: #ffffff;

            font-size: 20px;
            line-height: 1;

            cursor: pointer;

            box-shadow:
                0 0 20px
                rgba(
                    0,
                    255,
                    157,
                    .06
                );

            transition:
                transform .22s ease,
                background .22s ease,
                border-color .22s ease,
                box-shadow .22s ease;

            z-index: 20;
        }


        .vexon-global-menu-trigger:hover {

            transform:
                translateY(-2px);

            background:
                rgba(
                    0,
                    255,
                    157,
                    .10
                );

            border-color:
                rgba(
                    0,
                    255,
                    157,
                    .32
                );

            box-shadow:
                0 0 28px
                rgba(
                    0,
                    255,
                    157,
                    .12
                );
        }


        .vexon-global-menu-trigger:active {

            transform:
                scale(.96);
        }


        /* =================================================
           DESKTOP NAV LINKS
           Main buttons now live inside left drawer.
        ================================================= */

        .navbar .nav-links {

            display: none !important;
        }


        /* =================================================
           DRAWER
        ================================================= */

        .vexon-global-menu {

            position: fixed;

            inset: 0;

            z-index: 60000;

            visibility: hidden;

            pointer-events: none;
        }


        .vexon-global-menu.open {

            visibility: visible;

            pointer-events: auto;
        }


        .vexon-global-menu-backdrop {

            position: absolute;

            inset: 0;

            background:
                rgba(
                    0,
                    0,
                    0,
                    .58
                );

            opacity: 0;

            transition:
                opacity .25s ease;

            backdrop-filter:
                blur(3px);
        }


        .vexon-global-menu.open
        .vexon-global-menu-backdrop {

            opacity: 1;
        }


        .vexon-global-drawer {

            position: absolute;

            top: 0;
            bottom: 0;
            left: 0;

            width:
                min(
                    320px,
                    84vw
                );

            padding:
                24px 16px;

            overflow-y: auto;

            background:
                linear-gradient(
                    180deg,
                    rgba(
                        7,
                        10,
                        19,
                        .98
                    ),
                    rgba(
                        3,
                        5,
                        11,
                        .98
                    )
                );

            border-right:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .08
                );

            box-shadow:
                20px 0 70px
                rgba(
                    0,
                    0,
                    0,
                    .45
                );

            transform:
                translateX(
                    -105%
                );

            transition:
                transform .28s
                cubic-bezier(
                    .22,
                    1,
                    .36,
                    1
                );

            direction: rtl;
        }


        .vexon-global-menu.open
        .vexon-global-drawer {

            transform:
                translateX(0);
        }


        /* =================================================
           DRAWER HEADER
        ================================================= */

        .vexon-global-drawer-head {

            display: flex;

            align-items: center;

            justify-content:
                space-between;

            gap: 12px;

            padding:
                4px 5px
                18px;

            margin-bottom:
                10px;

            border-bottom:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .06
                );
        }


        .vexon-global-drawer-logo {

            font-family:
                "Orbitron",
                sans-serif;

            font-size: 24px;

            font-weight: 900;

            letter-spacing: 3px;

            color: #ffffff;

            text-shadow:
                0 0 14px
                rgba(
                    255,
                    255,
                    255,
                    .18
                );
        }


        .vexon-global-drawer-logo span {

            color:
                #00ff9d;

            text-shadow:
                0 0 10px
                #00ff9d,
                0 0 22px
                rgba(
                    0,
                    255,
                    157,
                    .45
                );
        }


        .vexon-global-menu-close {

            width: 38px;
            height: 38px;

            border-radius: 11px;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .07
                );

            background:
                rgba(
                    255,
                    255,
                    255,
                    .035
                );

            color: #ffffff;

            font-size: 20px;

            cursor: pointer;

            transition:
                transform .2s ease,
                background .2s ease;
        }


        .vexon-global-menu-close:hover {

            transform:
                rotate(4deg);

            background:
                rgba(
                    255,
                    255,
                    255,
                    .08
                );
        }


        .vexon-global-drawer-subtitle {

            padding:
                0 6px 18px;

            color:
                #707084;

            font-size: 9px;

            line-height: 1.8;
        }


        /* =================================================
           DRAWER ITEMS
        ================================================= */

        .vexon-global-nav-list {

            display: grid;

            gap: 7px;
        }


        .vexon-global-nav-item {

            width: 100%;

            display: flex;

            align-items: center;

            gap: 12px;

            padding:
                12px 13px;

            border-radius: 14px;

            border:
                1px solid
                transparent;

            background:
                transparent;

            color:
                #b1b1c1;

            font-family:
                "Vazirmatn",
                sans-serif;

            font-size: 12px;

            font-weight: 700;

            text-decoration: none;

            transition:
                color .2s ease,
                background .2s ease,
                border-color .2s ease,
                transform .2s ease;
        }


        .vexon-global-nav-item:hover {

            color: #ffffff;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .045
                );

            border-color:
                rgba(
                    255,
                    255,
                    255,
                    .06
                );

            transform:
                translateX(
                    3px
                );
        }


        .vexon-global-nav-item.active {

            color:
                #00ff9d;

            background:
                linear-gradient(
                    135deg,
                    rgba(
                        0,
                        255,
                        157,
                        .10
                    ),
                    rgba(
                        116,
                        77,
                        255,
                        .06
                    )
                );

            border-color:
                rgba(
                    0,
                    255,
                    157,
                    .12
                );

            box-shadow:
                inset 0 0 20px
                rgba(
                    0,
                    255,
                    157,
                    .025
                );
        }


        .vexon-global-nav-icon {

            width: 40px;
            height: 40px;

            flex: 0 0 40px;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 12px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .04
                );

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .05
                );

            font-size: 18px;
        }


        .vexon-global-nav-item.active
        .vexon-global-nav-icon {

            background:
                rgba(
                    0,
                    255,
                    157,
                    .09
                );

            border-color:
                rgba(
                    0,
                    255,
                    157,
                    .16
                );

            box-shadow:
                0 0 18px
                rgba(
                    0,
                    255,
                    157,
                    .07
                );
        }


        .vexon-global-nav-text {

            flex: 1;

            min-width: 0;
        }


        .vexon-global-nav-arrow {

            color:
                #515166;

            font-size: 19px;

            line-height: 1;
        }


        .vexon-global-drawer-footer {

            margin-top:
                18px;

            padding:
                13px;

            border-radius:
                14px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .025
                );

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .05
                );

            text-align: center;

            color:
                #666679;

            font-size: 8px;

            line-height: 1.9;
        }


        /* =================================================
           MESSENGER SUPPORT
        ================================================= */

        .vexon-messenger-menu-trigger {

            display: flex;
        }


        @media (max-width: 900px) {

            .vexon-global-menu-trigger {

                width: 40px;
                height: 40px;

                flex-basis: 40px;

                border-radius: 12px;

                font-size: 18px;
            }

        }


        @media (max-width: 480px) {

            .vexon-global-drawer {

                width:
                    min(
                        320px,
                        88vw
                    );

                padding:
                    18px 12px;
            }


            .vexon-global-drawer-logo {

                font-size: 20px;
            }


            .vexon-global-nav-item {

                padding:
                    11px;

                font-size: 11px;
            }
        }

    `;


    document.head.appendChild(
        style
    );


    /* =====================================================
       CREATE GLOBAL MENU
    ===================================================== */

    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "vexon-global-menu";


    menu.id =
        "vexon-global-menu";


    const currentPath =
        window.location.pathname
            .replace(
                /\/$/,
                ""
            );


    function isCurrentPage(
        href
    ) {

        try {

            const absolute =
                new URL(
                    href,
                    window.location.href
                );


            const target =
                absolute.pathname
                    .replace(
                        /\/$/,
                        ""
                    );


            return (
                target ===
                (
                    currentPath ||
                    "/"
                )
            );

        } catch {

            return false;

        }

    }


    menu.innerHTML = `

        <div
            class="vexon-global-menu-backdrop"
            data-vexon-menu-close
        ></div>


        <aside
            class="vexon-global-drawer"
        >

            <div
                class="vexon-global-drawer-head"
            >

                <div
                    class="vexon-global-drawer-logo"
                >
                    VE<span>X</span>ON
                </div>


                <button
                    type="button"
                    class="vexon-global-menu-close"
                    data-vexon-menu-close
                    aria-label="بستن منو"
                >
                    ×
                </button>

            </div>


            <div
                class="vexon-global-drawer-subtitle"
            >
                دنیای بازی، رقابت و ارتباط در VEXON
            </div>


            <nav
                class="vexon-global-nav-list"
                aria-label="منوی اصلی VEXON"
            >

                ${
                    navigationItems
                        .map(
                            item => `
                                <a
                                    class="
                                        vexon-global-nav-item
                                        ${
                                            isCurrentPage(
                                                item.href
                                            )
                                                ? "active"
                                                : ""
                                        }
                                    "
                                    href="${item.href}"
                                >

                                    <span
                                        class="
                                            vexon-global-nav-icon
                                        "
                                    >
                                        ${item.icon}
                                    </span>


                                    <span
                                        class="
                                            vexon-global-nav-text
                                        "
                                    >
                                        ${item.label}
                                    </span>


                                    <span
                                        class="
                                            vexon-global-nav-arrow
                                        "
                                    >
                                        ‹
                                    </span>

                                </a>
                            `
                        )
                        .join("")
                }

            </nav>


            <div
                class="vexon-global-drawer-footer"
            >
                PLAY • COMPETE • LEVEL UP.<br>
                © 2026 VEXON
            </div>

        </aside>

    `;


    document.body.appendChild(
        menu
    );


    /* =====================================================
       OPEN/CLOSE
    ===================================================== */

    function openMenu() {

        menu.classList.add(
            "open"
        );


        document.body.style.overflow =
            "hidden";


        const firstLink =
            menu.querySelector(
                ".vexon-global-nav-item"
            );


        if (firstLink) {

            firstLink.focus();

        }

    }


    function closeMenu() {

        menu.classList.remove(
            "open"
        );


        /*
         * فقط اگر پیام‌رسان خودش overflow خاصی
         * نداشته باشد، Body را برمی‌گردانیم.
         */

        if (
            !document.body.classList.contains(
                "vexon-lock-scroll"
            )
        ) {

            document.body.style.overflow =
                "";

        }

    }


    menu
        .querySelectorAll(
            "[data-vexon-menu-close]"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    closeMenu
                );

            }
        );


    menu
        .querySelectorAll(
            ".vexon-global-nav-item"
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    closeMenu
                );

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                    "Escape" &&
                menu.classList.contains(
                    "open"
                )
            ) {

                closeMenu();

            }

        }
    );


    /* =====================================================
       CREATE / CONNECT TRIGGER
    ===================================================== */

    function connectTrigger(
        trigger
    ) {

        if (!trigger) {

            return;

        }


        if (
            trigger.dataset.vexonNavBound ===
            "true"
        ) {

            return;

        }


        trigger.dataset.vexonNavBound =
            "true";


        trigger.addEventListener(
            "click",
            openMenu
        );

    }


    /* =====================================================
       MESSENGER HEADER TRIGGER
    ===================================================== */

    const messengerTrigger =
        document.getElementById(
            "vexon-menu-trigger"
        );


    if (
        messengerTrigger
    ) {

        connectTrigger(
            messengerTrigger
        );

    }


    /* =====================================================
       NORMAL NAVBAR
    ===================================================== */

    const navbar =
        document.querySelector(
            ".navbar"
        );


    if (
        navbar &&
        !messengerTrigger
    ) {

        const trigger =
            document.createElement(
                "button"
            );


        trigger.type =
            "button";


        trigger.className =
            "vexon-global-menu-trigger";


        trigger.textContent =
            "☰";


        trigger.setAttribute(
            "aria-label",
            "باز کردن منوی VEXON"
        );


        trigger.setAttribute(
            "title",
            "منوی VEXON"
        );


        /*
         * دکمه را ابتدای Navbar قرار می‌دهیم.
         */

        navbar.insertBefore(
            trigger,
            navbar.firstChild
        );


        connectTrigger(
            trigger
        );

    }


    /* =====================================================
       REMOVE OLD BOTTOM NAV IF PRESENT
    ===================================================== */

    const oldBottomNav =
        document.querySelector(
            ".mobile-bottom-nav"
        );


    if (
        oldBottomNav
    ) {

        oldBottomNav.remove();

    }


    /* =====================================================
       MESSENGER TOPBAR
    ===================================================== */

    const messengerMenu =
        document.getElementById(
            "vexon-menu-trigger"
        );


    if (
        messengerMenu
    ) {

        connectTrigger(
            messengerMenu
        );

    }

})();