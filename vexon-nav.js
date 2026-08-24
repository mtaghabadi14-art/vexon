/* =========================================================
   VEXON GLOBAL NAVIGATION
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       PAGE PATH
    ===================================================== */

    const inSections =
        window.location.pathname.includes(
            "/sections/"
        );


    function pagePath(
        rootPath,
        sectionPath
    ) {

        return inSections
            ? sectionPath
            : rootPath;

    }


    /* =====================================================
       NAVIGATION ITEMS
    ===================================================== */

    const navigationItems = [

        {
            type: "home",
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
           REMOVE OLD MOBILE NAV
        ================================================= */

        .mobile-bottom-nav {
            display: none !important;
        }

        body {
            padding-bottom: 0 !important;
        }


        /* =================================================
           NAVBAR
        ================================================= */

        .navbar {
            position: relative !important;

            min-height: 76px;

            display: flex !important;

            align-items: center !important;

            justify-content: center !important;

            padding:
                12px 72px !important;
        }


        .navbar .nav-links {
            display: none !important;
        }


        /* =================================================
           DESKTOP LOGO
        ================================================= */

        .navbar > .logo {

            position: absolute !important;

            left: 50%;
            top: 50%;

            transform:
                translate(
                    -50%,
                    -50%
                );

            z-index: 5;

            margin: 0 !important;
        }


        .navbar > .logo:hover {

            transform:
                translate(
                    -50%,
                    -50%
                )
                scale(1.04);
        }


        /* =================================================
           PROFILE RIGHT
        ================================================= */

        .navbar .header-profile {

            position: absolute !important;

            right: 15px;
            top: 50%;

            transform:
                translateY(-50%);

            z-index: 6;

            margin: 0 !important;

            width: 235px;

            min-width: 235px;

            padding:
                10px 13px !important;

            gap: 10px;

        }


        .navbar .header-profile:hover {

            transform:
                translateY(
                    calc(
                        -50% - 2px
                    )
                );
        }


        /* =================================================
           GLOBAL MENU BUTTON
        ================================================= */

        .vexon-global-menu-trigger {

            position: absolute !important;

            left: 15px;
            top: 50%;

            transform:
                translateY(-50%);

            z-index: 7;

            width: 43px;
            height: 43px;

            display: flex;

            align-items: center;
            justify-content: center;

            border:
                1px solid
                rgba(
                    0,
                    255,
                    157,
                    .18
                );

            border-radius: 13px;

            background:
                rgba(
                    0,
                    255,
                    157,
                    .055
                );

            color: #ffffff;

            font-size: 20px;

            cursor: pointer;

            box-shadow:
                0 0 22px
                rgba(
                    0,
                    255,
                    157,
                    .07
                );

            transition:
                transform .2s ease,
                background .2s ease,
                border-color .2s ease,
                box-shadow .2s ease;
        }


        .vexon-global-menu-trigger:hover {

            transform:
                translateY(
                    calc(
                        -50% - 2px
                    )
                );

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
                    .36
                );

            box-shadow:
                0 0 28px
                rgba(
                    0,
                    255,
                    157,
                    .14
                );
        }


        .vexon-global-menu-trigger:active {

            transform:
                translateY(-50%)
                scale(.96);
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
                opacity .24s ease;

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
                    86vw
                );

            padding:
                22px 15px;

            overflow-y: auto;

            direction: rtl;

            background:
                linear-gradient(
                    180deg,
                    rgba(
                        7,
                        10,
                        19,
                        .985
                    ),
                    rgba(
                        3,
                        5,
                        11,
                        .985
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
                22px 0 75px
                rgba(
                    0,
                    0,
                    0,
                    .48
                );

            transform:
                translateX(-105%);

            transition:
                transform .28s
                cubic-bezier(
                    .22,
                    1,
                    .36,
                    1
                );
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

            justify-content: space-between;

            gap: 10px;

            padding:
                2px 5px 17px;

            margin-bottom: 8px;

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
        }


        .vexon-global-drawer-logo span {

            color: #00ff9d;

            text-shadow:
                0 0 9px #00ff9d,
                0 0 22px
                rgba(
                    0,
                    255,
                    157,
                    .5
                );
        }


        .vexon-global-menu-close {

            width: 38px;
            height: 38px;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .07
                );

            border-radius: 11px;

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
        }


        .vexon-global-drawer-subtitle {

            padding:
                0 6px 17px;

            color: #6f6f83;

            font-size: 9px;

            line-height: 1.9;
        }


        /* =================================================
           NAV ITEMS
        ================================================= */

        .vexon-global-nav-list {

            display: grid;

            gap: 7px;
        }


        .vexon-global-nav-item {

            width: 100%;

            display: flex;

            align-items: center;

            gap: 11px;

            padding:
                11px 12px;

            border:
                1px solid
                transparent;

            border-radius: 14px;

            background: transparent;

            color: #b4b4c4;

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
                translateX(3px);
        }


        .vexon-global-nav-item.active {

            color: #00ff9d;

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
                        .065
                    )
                );

            border-color:
                rgba(
                    0,
                    255,
                    157,
                    .14
                );
        }


        .vexon-global-nav-icon,
        .vexon-global-home-icon {

            width: 40px;
            height: 40px;

            flex: 0 0 40px;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 12px;

        }


        .vexon-global-nav-icon {

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .05
                );

            background:
                rgba(
                    255,
                    255,
                    255,
                    .04
                );

            font-size: 18px;
        }


        .vexon-global-home-icon {

            border:
                1px solid
                rgba(
                    0,
                    255,
                    157,
                    .23
                );

            background:
                #03040a;

            color: #00ff9d;

            font-family:
                "Orbitron",
                sans-serif;

            font-size: 15px;

            font-weight: 900;

            text-shadow:
                0 0 7px #00ff9d;

            box-shadow:
                0 0 14px
                rgba(
                    0,
                    255,
                    157,
                    .08
                );
        }


        .vexon-global-nav-text {

            flex: 1;

            min-width: 0;
        }


        .vexon-global-nav-arrow {

            color: #525267;

            font-size: 19px;
        }


        .vexon-global-drawer-footer {

            margin-top: 18px;

            padding: 13px;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .05
                );

            border-radius: 14px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .025
                );

            text-align: center;

            color: #626275;

            font-size: 8px;

            line-height: 1.9;
        }


        /* =================================================
           MOBILE PROFILE
        ================================================= */

        @media (max-width: 900px) {

            .navbar {

                min-height: 64px;

                padding:
                    8px
                    175px
                    8px
                    60px !important;
            }


            /*
             * لوگوی اصلی VEXON کنار دکمه سه‌خط
             */

            .navbar > .logo {

                position:
                    absolute !important;

                left:
                    61px;

                top:
                    50%;

                transform:
                    translateY(-50%);

                margin: 0 !important;

                font-size:
                    20px;

                letter-spacing:
                    2px;

            }


            .navbar > .logo:hover {

                transform:
                    translateY(-50%)
                    scale(1.04);

            }


            /*
             * سه‌خط سمت چپ
             */

            .vexon-global-menu-trigger {

                left:
                    10px;

                width:
                    40px;

                height:
                    40px;

                font-size:
                    18px;

                border-radius:
                    12px;

            }


            /*
             * پروفایل کشیده و واضح
             */

            .navbar .header-profile {

                right:
                    8px;

                width:
                    160px;

                min-width:
                    160px;

                padding:
                    8px 10px !important;

                gap:
                    8px;

                border-radius:
                    14px;

            }


            .navbar .header-profile-icon {

                width:
                    35px !important;

                height:
                    35px !important;

                flex:
                    0 0 35px !important;

                font-size:
                    18px !important;

                border-radius:
                    10px;

            }


            .navbar .header-profile
            > div:nth-child(2) {

                display:
                    flex !important;

                flex-direction:
                    column;

                align-items:
                    flex-start;

                justify-content:
                    center;

                min-width:
                    0;

                gap:
                    3px;

            }


            .navbar .header-profile
            strong {

                max-width:
                    105px;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

                white-space:
                    nowrap;

                font-size:
                    11px !important;

            }


            .navbar .header-profile
            .header-player-stats {

                display:
                    block !important;

                max-width:
                    125px;

                overflow:
                    hidden;

                text-overflow:
                    ellipsis;

                white-space:
                    nowrap;

                color:
                    #00ff9d;

                font-size:
                    9px !important;

                line-height:
                    1.5;

                text-shadow:
                    0 0 7px
                    rgba(
                        0,
                        255,
                        157,
                        .35
                    );

            }


            .navbar .header-profile
            .header-xp-bar {

                display:
                    block !important;

                width:
                    120px !important;

                height:
                    5px !important;

            }


            .navbar .header-profile
            > b {

                display:
                    none !important;

            }

        }


        /* =================================================
           SMALL PHONES
        ================================================= */

        @media (max-width: 520px) {

            .navbar {

                width:
                    96%;

                padding:
                    7px
                    142px
                    7px
                    56px !important;

            }


            .navbar > .logo {

                left:
                    56px;

                font-size:
                    17px;

                letter-spacing:
                    1px;

            }


            .vexon-global-menu-trigger {

                left:
                    8px;

                width:
                    38px;

                height:
                    38px;

                font-size:
                    17px;

            }


            .navbar .header-profile {

                right:
                    7px;

                width:
                    132px;

                min-width:
                    132px;

                padding:
                    7px 8px !important;

                gap:
                    6px;

            }


            .navbar .header-profile-icon {

                width:
                    31px !important;

                height:
                    31px !important;

                flex-basis:
                    31px !important;

                font-size:
                    16px !important;

            }


            .navbar .header-profile
            strong {

                max-width:
                    82px;

                font-size:
                    10px !important;

            }


            .navbar .header-profile
            .header-player-stats {

                max-width:
                    94px;

                font-size:
                    8px !important;

            }


            .navbar .header-profile
            .header-xp-bar {

                width:
                    92px !important;

                height:
                    4px !important;

            }

        }


        /* =================================================
           VERY SMALL PHONES
        ================================================= */

        @media (max-width: 400px) {

            .navbar {

                padding:
                    6px
                    122px
                    6px
                    52px !important;

            }


            .navbar > .logo {

                left:
                    52px;

                font-size:
                    15px;

            }


            .vexon-global-menu-trigger {

                left:
                    7px;

                width:
                    36px;

                height:
                    36px;

                font-size:
                    16px;

            }


            .navbar .header-profile {

                right:
                    6px;

                width:
                    114px;

                min-width:
                    114px;

                padding:
                    6px 7px !important;

                gap:
                    5px;

            }


            .navbar .header-profile-icon {

                width:
                    28px !important;

                height:
                    28px !important;

                flex-basis:
                    28px !important;

                font-size:
                    14px !important;

            }


            .navbar .header-profile
            strong {

                max-width:
                    72px;

                font-size:
                    9px !important;

            }


            .navbar .header-profile
            .header-player-stats {

                max-width:
                    80px;

                font-size:
                    7px !important;

            }


            .navbar .header-profile
            .header-xp-bar {

                width:
                    78px !important;

                height:
                    3px !important;

            }

        }


        /* =================================================
           SUPPORT BUTTON
        ================================================= */

        #vexon-support-widget {

            bottom:
                22px !important;

        }


        @media (max-width: 600px) {

            #vexon-support-widget {

                bottom:
                    16px !important;

            }

        }

    `;


    document.head.appendChild(
        style
    );


    /* =====================================================
       CURRENT PATH
    ===================================================== */

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


    /* =====================================================
       CREATE DRAWER
    ===================================================== */

    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "vexon-global-menu";


    menu.id =
        "vexon-global-menu";


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
            >

                ${
                    navigationItems
                        .map(
                            item => {

                                const icon =
                                    item.type ===
                                    "home"

                                        ? `
                                            <span
                                                class="
                                                    vexon-global-home-icon
                                                "
                                            >
                                                V
                                            </span>
                                          `

                                        : `
                                            <span
                                                class="
                                                    vexon-global-nav-icon
                                                "
                                            >
                                                ${item.icon}
                                            </span>
                                          `;


                                return `

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

                                        ${icon}


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

                                `;

                            }
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
       OPEN / CLOSE
    ===================================================== */

    function openMenu() {

        menu.classList.add(
            "open"
        );

        document.body.style.overflow =
            "hidden";

    }


    function closeMenu() {

        menu.classList.remove(
            "open"
        );

        document.body.style.overflow =
            "";

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
       TRIGGER
    ===================================================== */

    let trigger =
        document.getElementById(
            "vexon-menu-trigger"
        );


    if (
        !trigger
    ) {

        trigger =
            document.createElement(
                "button"
            );


        trigger.type =
            "button";


        trigger.id =
            "vexon-menu-trigger";


        trigger.className =
            "vexon-global-menu-trigger";


        trigger.textContent =
            "☰";


        trigger.setAttribute(
            "aria-label",
            "باز کردن منوی VEXON"
        );


        const navbar =
            document.querySelector(
                ".navbar"
            );


        if (
            navbar
        ) {

            navbar.appendChild(
                trigger
            );

        } else {

            document.body.appendChild(
                trigger
            );

        }

    }


    if (
        !trigger.dataset.vexonNavBound
    ) {

        trigger.dataset.vexonNavBound =
            "true";


        trigger.addEventListener(
            "click",
            openMenu
        );

    }


    /* =====================================================
       REMOVE OLD BOTTOM NAV
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

})();