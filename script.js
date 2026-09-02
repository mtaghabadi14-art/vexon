/* =========================================================
   PGAME SCRIPT
========================================================= */

"use strict";


/* =========================================================
   APP ELEMENT
========================================================= */

const app =
    document.querySelector(
        "#app"
    );


/* =========================================================
   FULL BAN CHECK
========================================================= */

async function checkFullBan() {

    try {

        if (
            location.pathname.endsWith(
                "/banned.html"
            )
        ) {

            return;

        }


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


        if (
            !response.ok
        ) {

            return;

        }


        const data =
            await response.json();


        if (
            data?.loggedIn &&
            data.user?.banned &&
            data.user?.ban_type ===
                "full"
        ) {

            const inSections =
                location.pathname.includes(
                    "/sections/"
                );


            location.href =
                inSections
                    ? "../banned.html"
                    : "banned.html";

        }

    } catch (
        error
    ) {

        console.error(
            "FULL_BAN_CHECK_ERROR",
            error
        );

    }

}


/* =========================================================
   AUTH HEADER
========================================================= */

async function initializeAuthHeader() {

    const headers =
        document.querySelectorAll(
            ".header-profile"
        );


    if (
        !headers.length
    ) {

        return;

    }


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


        headers.forEach(
            header => {

                const strong =
                    header.querySelector(
                        "strong"
                    );


                const span =
                    header.querySelector(
                        "span"
                    );


                if (
                    data?.loggedIn &&
                    data.user
                ) {

                    if (
                        strong
                    ) {

                        strong.textContent =
                            data.user.username;

                    }


                    if (
                        span
                    ) {

                        span.textContent =
                            `LV ${data.user.level ?? 1} • XP ${data.user.xp ?? 0}/${data.user.next_xp ?? 0} • 🪙 ${data.user.coins ?? 0}`;

                    }


                    const inSections =
                        location.pathname.includes(
                            "/sections/"
                        );


                    header.href =
                        inSections
                            ? "profile.html"
                            : "sections/profile.html";

                } else {

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

                    }


                    const inSections =
                        location.pathname.includes(
                            "/sections/"
                        );


                    header.href =
                        inSections
                            ? "login.html"
                            : "sections/login.html";

                }

            }
        );

    } catch (
        error
    ) {

        console.error(
            "AUTH_HEADER_ERROR",
            error
        );

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

    const nav =
        document.querySelector(
            ".nav-links"
        );


    if (
        !nav
    ) {

        return;

    }


    const links = [
        {
            href:
                location.pathname.includes(
                    "/sections/"
                )
                    ? "../index.html"
                    : "index.html",

            label:
                "خانه"
        },

        {
            href:
                location.pathname.includes(
                    "/sections/"
                )
                    ? "games.html"
                    : "sections/games.html",

            label:
                "بازی‌ها"
        },

        {
            href:
                location.pathname.includes(
                    "/sections/"
                )
                    ? "news.html"
                    : "sections/news.html",

            label:
                "اخبار"
        },

        {
            href:
                location.pathname.includes(
                    "/sections/"
                )
                    ? "cafe.html"
                    : "sections/cafe.html",

            label:
                "کافه"
        },

        {
            href:
                location.pathname.includes(
                    "/sections/"
                )
                    ? "leaderboard.html"
                    : "sections/leaderboard.html",

            label:
                "لیدربورد"
        },

        {
            href:
                location.pathname.includes(
                    "/sections/"
                )
                    ? "messenger.html"
                    : "sections/messenger.html",

            label:
                "پیام‌رسان"
        }

    ];


    nav.innerHTML =
        links
            .map(
                link =>
                    `
                        <a
                            href="${link.href}"
                        >
                            ${link.label}
                        </a>
                    `
            )
            .join("");

}


/* =========================================================
   BUTTON PRESS EFFECT
========================================================= */

function initializeButtonPress() {

    document.addEventListener(
        "click",
        event => {

            const target =
                event.target.closest(
                    "button, .hero-button, a"
                );


            if (
                !target
            ) {

                return;

            }


            target.classList.add(
                "button-pressed"
            );


            setTimeout(
                () => {

                    target.classList.remove(
                        "button-pressed"
                    );

                },
                160
            );

        }
    );

}


/* =========================================================
   PARALLAX
========================================================= */

function initializeParallax() {

    const visual =
        document.querySelector(
            ".hero-visual"
        );


    if (
        !visual
    ) {

        return;

    }


    window.addEventListener(
        "mousemove",
        event => {

            const x =
                (
                    event.clientX /
                    window.innerWidth -
                    0.5
                ) * 10;


            const y =
                (
                    event.clientY /
                    window.innerHeight -
                    0.5
                ) * 10;


            visual.style.transform =
                `
                    translate(
                        ${x}px,
                        ${y}px
                    )
                `;

        }
    );

}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function initializeScrollReveal() {

    const elements =
        document.querySelectorAll(
            ".section, .game-box, .hero-button"
        );


    if (
        !elements.length
    ) {

        return;

    }


    if (
        !("IntersectionObserver" in window)
    ) {

        elements.forEach(
            element => {

                element.classList.add(
                    "revealed"
                );

            }
        );

        return;

    }


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "revealed"
                            );

                            observer.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },
            {
                threshold:
                    0.12
            }
        );


    elements.forEach(
        element => {

            observer.observe(
                element
            );

        }
    );

}


/* =========================================================
   SMOOTH NAVIGATION
========================================================= */

function initializeSmoothNavigation() {

    document.addEventListener(
        "click",
        event => {

            const link =
                event.target.closest(
                    "a[href^='#']"
                );


            if (
                !link
            ) {

                return;

            }


            const id =
                link.getAttribute(
                    "href"
                );


            if (
                !id ||
                id === "#"
            ) {

                return;

            }


            const target =
                document.querySelector(
                    id
                );


            if (
                !target
            ) {

                return;

            }


            event.preventDefault();


            target.scrollIntoView(
                {
                    behavior:
                        "smooth"
                }
            );

        }
    );

}


/* =========================================================
   SUPPORT WIDGET
   همه صفحات به جز Messenger
========================================================= */

function initializeSupportWidget() {

    const isMessengerPage =
        /(^|\/)messenger\.html$/i.test(
            window.location.pathname
        );


    if (
        isMessengerPage
    ) {

        return;

    }


    if (
        location.pathname.includes(
            "admin.html"
        )
    ) {

        return;

    }


    if (
        location.pathname.endsWith(
            "/banned.html"
        )
    ) {

        return;

    }


    if (
        document.getElementById(
            "vexon-support-widget"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "vexon-support-style";


    style.textContent = `

        #vexon-support-widget {

            position: fixed;

            left: 22px;

            right: auto;

            bottom: 22px;

            z-index: 99997;

        }


        #vexon-support-button {

            width: 60px;

            height: 60px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 50%;

            border:
                1px solid
                rgba(
                    0,
                    255,
                    157,
                    .36
                );

            background:
                linear-gradient(
                    135deg,
                    rgba(
                        0,
                        255,
                        157,
                        .94
                    ),
                    rgba(
                        0,
                        234,
                        255,
                        .90
                    )
                );

            color:
                #03110c;

            font-size:
                23px;

            cursor:
                pointer;

            box-shadow:
                0 0 25px
                rgba(
                    0,
                    255,
                    157,
                    .20
                ),

                0 14px 38px
                rgba(
                    0,
                    0,
                    0,
                    .34
                );

            transition:
                transform .2s ease,
                box-shadow .2s ease;

        }


        #vexon-support-button:hover {

            transform:
                translateY(
                    -4px
                )
                scale(
                    1.05
                );

            box-shadow:
                0 0 35px
                rgba(
                    0,
                    255,
                    157,
                    .32
                );

        }


        #vexon-support-overlay {

            display:
                none;

            position:
                fixed;

            inset:
                0;

            z-index:
                99999;

            align-items:
                center;

            justify-content:
                center;

            padding:
                18px;

            background:
                rgba(
                    0,
                    0,
                    0,
                    .74
                );

        }


        .vexon-support-box {

            width:
                min(
                    520px,
                    100%
                );

            box-sizing:
                border-box;

            padding:
                20px;

            border:
                1px solid
                rgba(
                    0,
                    255,
                    157,
                    .16
                );

            border-radius:
                22px;

            background:
                #05080f;

            box-shadow:
                0 25px 80px
                rgba(
                    0,
                    0,
                    0,
                    .55
                );

        }


        .vexon-support-header {

            display:
                flex;

            align-items:
                center;

            justify-content:
                space-between;

        }


        .vexon-support-header h2 {

            margin:
                0;

            font-size:
                18px;

        }


        .vexon-support-close {

            width:
                38px;

            height:
                38px;

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
                    .04
                );

            color:
                #fff;

            cursor:
                pointer;

            font-size:
                20px;

        }


        .vexon-support-input {

            width:
                100%;

            min-height:
                150px;

            box-sizing:
                border-box;

            margin-top:
                15px;

            padding:
                13px;

            resize:
                vertical;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .08
                );

            border-radius:
                14px;

            outline:
                none;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .035
                );

            color:
                #fff;

            font-family:
                inherit;

            font-size:
                12px;

        }


        .vexon-support-actions {

            display:
                flex;

            gap:
                8px;

            margin-top:
                10px;

        }


        .vexon-support-actions button {

            flex:
                1;

        }


        .vexon-support-status {

            min-height:
                18px;

            margin-top:
                9px;

            font-size:
                10px;

        }


        @media (
            max-width:
            600px
        ) {

            #vexon-support-widget {

                left:
                    14px;

                right:
                    auto;

                bottom:
                    16px;

            }


            #vexon-support-button {

                width:
                    56px;

                height:
                    56px;

            }

        }

    `;


    document.head.appendChild(
        style
    );


    const widget =
        document.createElement(
            "div"
        );


    widget.id =
        "vexon-support-widget";


    widget.innerHTML = `

        <button
            id="vexon-support-button"
            type="button"
            aria-label="پیام به مدیریت"
            title="پیام به مدیریت"
        >
            💬
        </button>


        <div
            id="vexon-support-overlay"
        >

            <section
                class="vexon-support-box"
            >

                <div
                    class="vexon-support-header"
                >

                    <div>

                        <h2>
                            💬 پیام به مدیریت
                        </h2>

                        <p
                            style="
                                margin:5px 0 0;
                                color:#85869a;
                                font-size:10px;
                            "
                        >
                            پیام خودت را برای مدیریت PGame ارسال کن.
                        </p>

                    </div>


                    <button
                        class="vexon-support-close"
                        id="vexon-support-close"
                        type="button"
                    >
                        &times;
                    </button>

                </div>


                <textarea
                    id="vexon-support-input"
                    class="vexon-support-input"
                    maxlength="5000"
                    placeholder="پیامت را برای مدیریت بنویس..."
                ></textarea>


                <div
                    class="vexon-support-actions"
                >

                    <button
                        class="auth-button"
                        id="vexon-support-send"
                        type="button"
                    >
                        🚀 ارسال پیام
                    </button>


                    <button
                        class="auth-secondary-button"
                        id="vexon-support-cancel"
                        type="button"
                    >
                        بستن
                    </button>

                </div>


                <div
                    id="vexon-support-status"
                    class="vexon-support-status"
                ></div>

            </section>

        </div>

    `;


    document.body.appendChild(
        widget
    );


    const button =
        document.getElementById(
            "vexon-support-button"
        );


    const overlay =
        document.getElementById(
            "vexon-support-overlay"
        );


    const close =
        document.getElementById(
            "vexon-support-close"
        );


    const cancel =
        document.getElementById(
            "vexon-support-cancel"
        );


    const send =
        document.getElementById(
            "vexon-support-send"
        );


    const input =
        document.getElementById(
            "vexon-support-input"
        );


    const status =
        document.getElementById(
            "vexon-support-status"
        );


    function closeSupport() {

        overlay.style.display =
            "none";

    }


    function setSupportStatus(
        message,
        success = false
    ) {

        status.textContent =
            message;

        status.style.color =
            success
                ? "#00ff9d"
                : "#ff7183";

    }


    button.addEventListener(
        "click",
        async () => {

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


                if (
                    response.status ===
                    401
                ) {

                    const inSections =
                        location.pathname.includes(
                            "/sections/"
                        );


                    location.href =
                        inSections
                            ? "login.html"
                            : "sections/login.html";


                    return;

                }


                const data =
                    await response.json();


                if (
                    !data.loggedIn
                ) {

                    return;

                }


                overlay.style.display =
                    "flex";

                input.focus();

            } catch (
                error
            ) {

                console.error(
                    "SUPPORT_OPEN_ERROR",
                    error
                );

            }

        }
    );


    close.addEventListener(
        "click",
        closeSupport
    );


    cancel.addEventListener(
        "click",
        closeSupport
    );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                overlay
            ) {

                closeSupport();

            }

        }
    );


    send.addEventListener(
        "click",
        async () => {

            const message =
                input.value.trim();


            if (
                message.length <
                2
            ) {

                setSupportStatus(
                    "پیام خیلی کوتاه است."
                );

                return;

            }


            send.disabled =
                true;


            send.textContent =
                "⏳ در حال ارسال...";


            try {

                const response =
                    await fetch(
                        "/api/support/send",
                        {
                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    message
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    response.status ===
                    401
                ) {

                    const inSections =
                        location.pathname.includes(
                            "/sections/"
                        );


                    location.href =
                        inSections
                            ? "login.html"
                            : "sections/login.html";


                    return;

                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "ارسال پیام ناموفق بود."
                    );

                }


                input.value =
                    "";


                setSupportStatus(
                    "✅ پیامت برای مدیریت ارسال شد.",
                    true
                );

            } catch (
                error
            ) {

                setSupportStatus(
                    "❌ " +
                    (
                        error.message ||
                        "ارسال پیام ناموفق بود."
                    )
                );

            } finally {

                send.disabled =
                    false;

                send.textContent =
                    "🚀 ارسال پیام";

            }

        }
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeStandaloneVexon() {

    initializeNavigation();

    initializeButtonPress();

    initializeParallax();

    initializeAuthHeader();

    if (
        !location.pathname.includes("/messenger") &&
        !location.pathname.includes("messenger.html")
    ) {
        initializeSupportWidget();
    }

}

    /*
     * در بخش بعدی:
     * initializeNotificationWidget();
     */



function initializeVexon() {

    initializeNavigation();

    initializeScrollReveal();

    initializeSmoothNavigation();

    initializeButtonPress();

    initializeParallax();

    initializeAuthHeader();

    if (
        !location.pathname.includes("/messenger") &&
        !location.pathname.includes("messenger.html")
    ) {
        initializeSupportWidget();
    }


    /*
     * در بخش بعدی:
     * initializeNotificationWidget();
     */

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        checkFullBan();

        if (
            app
        ) {

            initializeVexon();

        } else {

            initializeStandaloneVexon();

        }

    }
);
/* =========================================================
   NOTIFICATION WIDGET
   ---------------------------------------------------------
   🔔 اعلان‌ها در سمت راست
   فقط وقتی اعلان خوانده‌نشده وجود داشته باشد دیده می‌شود.
========================================================= */

function initializeNotificationWidget() {

    /*
     * جلوگیری از ساخته شدن دوباره Widget
     */
    if (
        document.getElementById(
            "vexon-notification-widget"
        )
    ) {

        return;

    }


    /*
     * ساخت Widget
     */
    const widget =
        document.createElement(
            "div"
        );


    widget.id =
        "vexon-notification-widget";


    /*
     * HTML + CSS
     */
    widget.innerHTML = `

        <style>

            /* =====================================================
               NOTIFICATION CONTAINER
            ====================================================== */

            #vexon-notification-widget {

                position:
                    fixed;

                right:
                    22px;

                bottom:
                    22px;

                z-index:
                    99998;

                font-family:
                    "Vazirmatn",
                    sans-serif;

            }


            /* =====================================================
               FLOATING BUTTON
            ====================================================== */

            #vexon-notification-button {

                position:
                    relative;

                width:
                    60px;

                height:
                    60px;

                display:
                    none;

                align-items:
                    center;

                justify-content:
                    center;

                border:
                    1px solid
                    rgba(
                        116,
                        77,
                        255,
                        .38
                    );

                border-radius:
                    50%;

                background:
                    linear-gradient(
                        135deg,
                        rgba(
                            116,
                            77,
                            255,
                            .95
                        ),
                        rgba(
                            0,
                            234,
                            255,
                            .90
                        )
                    );

                color:
                    #fff;

                font-size:
                    23px;

                cursor:
                    pointer;

                box-shadow:

                    0 0 26px
                    rgba(
                        116,
                        77,
                        255,
                        .20
                    ),

                    0 14px 38px
                    rgba(
                        0,
                        0,
                        0,
                        .35
                    );

                transition:
                    transform .2s ease,
                    box-shadow .2s ease;

            }


            #vexon-notification-button:hover {

                transform:
                    translateY(
                        -4px
                    )
                    scale(
                        1.05
                    );

                box-shadow:

                    0 0 38px
                    rgba(
                        116,
                        77,
                        255,
                        .34
                    ),

                    0 18px 44px
                    rgba(
                        0,
                        0,
                        0,
                        .42
                    );

            }


            /* =====================================================
               BADGE
            ====================================================== */

            #vexon-notification-badge {

                position:
                    absolute;

                top:
                    -3px;

                right:
                    -3px;

                min-width:
                    20px;

                height:
                    20px;

                padding:
                    0 5px;

                box-sizing:
                    border-box;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    999px;

                background:
                    #ff3f5a;

                color:
                    #fff;

                font-size:
                    8px;

                font-weight:
                    900;

                box-shadow:
                    0 0 15px
                    rgba(
                        255,
                        63,
                        90,
                        .35
                    );

            }


            /* =====================================================
               NOTIFICATION PANEL
            ====================================================== */

            #vexon-notification-panel {

                position:
                    absolute;

                right:
                    0;

                bottom:
                    72px;

                width:
                    min(
                        390px,
                        calc(
                            100vw -
                            28px
                        )
                    );

                max-height:
                    min(
                        580px,
                        calc(
                            100vh -
                            110px
                        )
                    );

                display:
                    none;

                flex-direction:
                    column;

                overflow:
                    hidden;

                border:
                    1px solid
                    rgba(
                        116,
                        77,
                        255,
                        .18
                    );

                border-radius:
                    22px;

                background:
                    rgba(
                        4,
                        8,
                        15,
                        .97
                    );

                box-shadow:

                    0 20px 75px
                    rgba(
                        0,
                        0,
                        0,
                        .54
                    ),

                    0 0 30px
                    rgba(
                        116,
                        77,
                        255,
                        .06
                    );

                backdrop-filter:
                    blur(
                        20px
                    );

            }


            #vexon-notification-panel.open {

                display:
                    flex;

            }


            /* =====================================================
               HEADER
            ====================================================== */

            .pgame-notification-head {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    10px;

                padding:
                    15px;

                border-bottom:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .06
                    );

            }


            .pgame-notification-head strong {

                font-size:
                    14px;

                font-weight:
                    900;

            }


            #pgame-notification-close {

                width:
                    34px;

                height:
                    34px;

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .07
                    );

                border-radius:
                    10px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .045
                    );

                color:
                    #fff;

                cursor:
                    pointer;

                font-size:
                    16px;

            }


            /* =====================================================
               LIST
            ====================================================== */

            #pgame-notification-list {

                overflow-y:
                    auto;

                padding:
                    12px;

            }


            /* =====================================================
               ITEM
            ====================================================== */

            .pgame-notification-item {

                position:
                    relative;

                margin-bottom:
                    9px;

                padding:
                    13px;

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .06
                    );

                border-radius:
                    15px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .035
                    );

                transition:
                    border-color .2s ease,
                    background .2s ease;

            }


            .pgame-notification-item:last-child {

                margin-bottom:
                    0;

            }


            .pgame-notification-item.unread {

                border-color:
                    rgba(
                        116,
                        77,
                        255,
                        .28
                    );

                background:
                    rgba(
                        116,
                        77,
                        255,
                        .055
                    );

            }


            .pgame-notification-title {

                font-size:
                    11px;

                font-weight:
                    900;

                line-height:
                    1.7;

            }


            .pgame-notification-text {

                margin-top:
                    5px;

                color:
                    #8b8ca0;

                font-size:
                    9px;

                line-height:
                    1.9;

            }


            .pgame-notification-date {

                margin-top:
                    5px;

                color:
                    #656678;

                font-size:
                    7px;

            }


            /* =====================================================
               SHOW MESSAGE BUTTON
            ====================================================== */

            .pgame-notification-action {

                width:
                    100%;

                margin-top:
                    10px;

                padding:
                    8px 10px;

                border:
                    1px solid
                    rgba(
                        0,
                        255,
                        157,
                        .15
                    );

                border-radius:
                    10px;

                background:
                    rgba(
                        0,
                        255,
                        157,
                        .06
                    );

                color:
                    #dfffee;

                cursor:
                    pointer;

                font-family:
                    inherit;

                font-size:
                    9px;

                transition:
                    background .2s ease,
                    border-color .2s ease;

            }


            .pgame-notification-action:hover {

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
                        .27
                    );

            }


            /* =====================================================
               EMPTY
            ====================================================== */

            .pgame-notification-empty {

                padding:
                    35px 10px;

                text-align:
                    center;

                color:
                    #77788b;

                font-size:
                    10px;

            }


            /* =====================================================
               DETAILS MODAL
            ====================================================== */

            #pgame-notification-details {

                position:
                    fixed;

                inset:
                    0;

                z-index:
                    99999;

                display:
                    none;

                align-items:
                    center;

                justify-content:
                    center;

                padding:
                    18px;

                background:
                    rgba(
                        0,
                        0,
                        0,
                        .74
                    );

            }


            #pgame-notification-details.open {

                display:
                    flex;

            }


            .pgame-notification-details-box {

                width:
                    min(
                        620px,
                        100%
                    );

                max-height:
                    min(
                        700px,
                        calc(
                            100vh -
                            36px
                        )
                    );

                overflow:
                    auto;

                box-sizing:
                    border-box;

                padding:
                    20px;

                border:
                    1px solid
                    rgba(
                        116,
                        77,
                        255,
                        .19
                    );

                border-radius:
                    22px;

                background:
                    #05080f;

                box-shadow:
                    0 25px 90px
                    rgba(
                        0,
                        0,
                        0,
                        .58
                    );

            }


            .pgame-notification-details-header {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    10px;

            }


            .pgame-notification-details-header h3 {

                margin:
                    0;

                font-size:
                    16px;

            }


            #pgame-notification-details-close {

                width:
                    36px;

                height:
                    36px;

                border:
                    1px solid
                    rgba(
                        255,
                        255,
                        255,
                        .07
                    );

                border-radius:
                    10px;

                background:
                    rgba(
                        255,
                        255,
                        255,
                        .04
                    );

                color:
                    #fff;

                cursor:
                    pointer;

            }


            .pgame-notification-details-body {

                margin-top:
                    16px;

                color:
                    #d7d8e4;

                font-size:
                    11px;

                line-height:
                    2;

                white-space:
                    pre-wrap;

                overflow-wrap:
                    anywhere;

            }


            .pgame-notification-details-meta {

                margin-top:
                    14px;

                color:
                    #717286;

                font-size:
                    8px;

            }


            @media (
                max-width:
                600px
            ) {

                #vexon-notification-widget {

                    right:
                        14px;

                    bottom:
                        16px;

                }


                #vexon-notification-button {

                    width:
                        56px;

                    height:
                        56px;

                }


                #vexon-notification-panel {

                    bottom:
                        66px;

                }

            }

        </style>


        <!-- =====================================================
             FLOATING BUTTON
        ====================================================== -->

        <button
            id="vexon-notification-button"
            type="button"
            aria-label="اعلان‌ها"
            title="اعلان‌ها"
        >

            🔔


            <span
                id="vexon-notification-badge"
            >
                0
            </span>

        </button>


        <!-- =====================================================
             NOTIFICATION PANEL
        ====================================================== -->

        <div
            id="vexon-notification-panel"
        >

            <div
                class="pgame-notification-head"
            >

                <strong>
                    🔔 اعلان‌ها
                </strong>


                <button
                    id="pgame-notification-close"
                    type="button"
                    aria-label="بستن"
                >
                    ✕
                </button>

            </div>


            <div
                id="pgame-notification-list"
            ></div>

        </div>


        <!-- =====================================================
             DETAILS MODAL
        ====================================================== -->

        <div
            id="pgame-notification-details"
        >

            <section
                class="pgame-notification-details-box"
            >

                <div
                    class="
                        pgame-notification-details-header
                    "
                >

                    <h3
                        id="pgame-notification-details-title"
                    >
                        اعلان
                    </h3>


                    <button
                        id="pgame-notification-details-close"
                        type="button"
                    >
                        ✕
                    </button>

                </div>


                <div
                    id="pgame-notification-details-body"
                    class="
                        pgame-notification-details-body
                    "
                ></div>


                <div
                    id="pgame-notification-details-meta"
                    class="
                        pgame-notification-details-meta
                    "
                ></div>

            </section>

        </div>

    `;


    /*
     * اضافه کردن به body
     */
    document.body.appendChild(
        widget
    );


    /* =========================================================
       ELEMENT REFERENCES
    ========================================================= */

    const button =
        document.getElementById(
            "vexon-notification-button"
        );


    const badge =
        document.getElementById(
            "vexon-notification-badge"
        );


    const panel =
        document.getElementById(
            "vexon-notification-panel"
        );


    const list =
        document.getElementById(
            "pgame-notification-list"
        );


    const closeButton =
        document.getElementById(
            "pgame-notification-close"
        );


    const details =
        document.getElementById(
            "pgame-notification-details"
        );


    const detailsTitle =
        document.getElementById(
            "pgame-notification-details-title"
        );


    const detailsBody =
        document.getElementById(
            "pgame-notification-details-body"
        );


    const detailsMeta =
        document.getElementById(
            "pgame-notification-details-meta"
        );


    const detailsClose =
        document.getElementById(
            "pgame-notification-details-close"
        );


    /* =========================================================
       ESCAPE HTML
    ========================================================= */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
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


    /* =========================================================
       FORMAT DATE
    ========================================================= */

    function formatNotificationDate(
        value
    ) {

        if (
            !value
        ) {

            return "";

        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        return date.toLocaleString(
            "fa-IR",
            {
                year:
                    "numeric",

                month:
                    "short",

                day:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );

    }


    /* =========================================================
       CLOSE DETAILS
    ========================================================= */

    function closeDetails() {

        details.classList.remove(
            "open"
        );

    }


    /* =========================================================
       LOAD NOTIFICATIONS
    ========================================================= */

    async function loadNotifications() {

        try {

            const response =
                await fetch(
                    "/api/notifications",
                    {
                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store"
                    }
                );


            /*
             * کاربر وارد نشده
             */
            if (
                response.status ===
                401
            ) {

                button.style.display =
                    "none";

                panel.classList.remove(
                    "open"
                );

                return;

            }


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                button.style.display =
                    "none";

                return;

            }


            const notifications =
                Array.isArray(
                    data.notifications
                )
                    ? data.notifications
                    : [];


            const unreadCount =
                Number(
                    data.unread_count ??
                    0
                );


            /*
             * فقط وقتی اعلان خوانده‌نشده
             * داریم دکمه را نشان بده.
             */
            if (
                unreadCount > 0
            ) {

                button.style.display =
                    "flex";

                badge.textContent =
                    unreadCount > 99
                        ? "99+"
                        : String(unreadCount);

            } else {

    /*
     * TEST:
     * حباب حتی بدون اعلان هم دیده می‌شود.
     *
     * بعد از اینکه مطمئن شدیم ظاهرش درست است،
     * دوباره مخفی‌شدن در حالت صفر را فعال می‌کنیم.
     */
                button.style.display =
                    "flex";

                badge.textContent =
                    "0";
            }


            /*
             * ساخت لیست اعلان‌ها
             */
            if (
                !notifications.length
            ) {

                list.innerHTML = `

                    <div
                        class="
                            pgame-notification-empty
                        "
                    >

                        🔔
                        اعلان جدیدی وجود ندارد.

                    </div>

                `;

                return;

            }


            list.innerHTML =
                notifications
                    .map(
                        notification => {

                            const unread =
                                !notification.read_at;


                            const date =
                                formatNotificationDate(
                                    notification.created_at
                                );


                            return `

                                <article
                                    class="
                                        pgame-notification-item
                                        ${
                                            unread
                                                ? "unread"
                                                : ""
                                        }
                                    "
                                    data-type="
                                        ${escapeHtml(
                                            notification.type
                                        )}
                                    "
                                    data-reference-id="
                                        ${Number(
                                            notification.reference_id ??
                                            0
                                        )}
                                    "
                                >

                                    <div
                                        class="
                                            pgame-notification-title
                                        "
                                    >

                                        ${escapeHtml(
                                            notification.title
                                        )}

                                    </div>


                                    <div
                                        class="
                                            pgame-notification-text
                                        "
                                    >

                                        ${escapeHtml(
                                            notification.message
                                        )}

                                    </div>


                                    ${
                                        date
                                            ? `
                                                <div
                                                    class="
                                                        pgame-notification-date
                                                    "
                                                >
                                                    ${escapeHtml(
                                                        date
                                                    )}
                                                </div>
                                              `
                                            : ""
                                    }


                                    <button
                                        type="button"
                                        class="
                                            pgame-notification-action
                                        "
                                        data-notification-id="
                                            ${Number(
                                                notification.id
                                            )}
                                    >
                                        نمایش پیام
                                    </button>

                                </article>

                            `;

                        }
                    )
                    .join("");


        } catch (
            error
        ) {

            console.error(
                "PGAME_NOTIFICATIONS_ERROR",
                error
            );

        }

    }


    /* =========================================================
       OPEN / CLOSE PANEL
    ========================================================= */

    button.addEventListener(
        "click",
        () => {

            panel.classList.toggle(
                "open"
            );

        }
    );


    closeButton.addEventListener(
        "click",
        () => {

            panel.classList.remove(
                "open"
            );

        }
    );


    /* =========================================================
       DETAILS CLOSE
    ========================================================= */

    detailsClose.addEventListener(
        "click",
        closeDetails
    );


    details.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                details
            ) {

                closeDetails();

            }

        }
    );


    /* =========================================================
       NOTIFICATION CLICK
    ========================================================= */

    list.addEventListener(
        "click",
        async event => {

            const action =
                event.target.closest(
                    "[data-notification-id]"
                );


            if (
                !action
            ) {

                return;

            }


            const notificationId =
                Number(
                    action.dataset
                        .notificationId
                );


            /*
             * خود اعلان را از لیست پیدا می‌کنیم.
             */
            const notificationItem =
                action.closest(
                    ".pgame-notification-item"
                );


            const title =
                notificationItem
                    ?.querySelector(
                        ".pgame-notification-title"
                    )
                    ?.textContent
                    ?.trim()
                    ||
                    "اعلان";


            const message =
                notificationItem
                    ?.querySelector(
                        ".pgame-notification-text"
                    )
                    ?.textContent
                    ?.trim()
                    ||
                    "";


            const notificationType =
                notificationItem
                    ?.dataset
                    ?.type
                    ||
                    "general";


            const referenceId =
                Number(
                    notificationItem
                        ?.dataset
                        ?.referenceId
                    ||
                    0
                );


            /*
             * خوانده‌شده کردن اعلان
             */
            try {

                await fetch(
                    `/api/notifications/${notificationId}/read`,
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin"
                    }
                );

            } catch (
                error
            ) {

                console.error(
                    "PGAME_NOTIFICATION_READ_ERROR",
                    error
                );

            }


            /*
             * نمایش جزئیات فعلاً با
             * اطلاعات خود اعلان.
             *
             * در بخش Worker، برای news/poll/support
             * اطلاعات مرجع کامل را هم اضافه می‌کنیم.
             */
            detailsTitle.textContent =
                title;


            detailsBody.textContent =
                message;


            detailsMeta.textContent =
                notificationType === "news"
                    ? "📰 خبر PGame"
                    : notificationType === "poll"
                        ? "📊 نظرسنجی PGame"
                        : notificationType === "support"
                            ? "💬 پاسخ مدیریت"
                            : "🔔 اعلان PGame";


            /*
             * فعلاً برای جلوگیری از هشدار
             * unused variable
             */
            void referenceId;


            panel.classList.remove(
                "open"
            );


            details.classList.add(
                "open"
            );


            /*
             * بروزرسانی Badge
             */
            await loadNotifications();

        }
    );


    /* =========================================================
       INITIAL LOAD
    ========================================================= */

    loadNotifications();


    /* =========================================================
       AUTO REFRESH
    ========================================================= */

    setInterval(
        loadNotifications,
        10000
    );

}
/* =========================================================
   NOTIFICATION DETAILS
   ---------------------------------------------------------
   خبر / نظرسنجی / پاسخ مدیریت
========================================================= */

async function loadNotificationDetails(
    type,
    referenceId,
    fallbackTitle,
    fallbackMessage
) {

    const titleElement =
        document.getElementById(
            "pgame-notification-details-title"
        );


    const bodyElement =
        document.getElementById(
            "pgame-notification-details-body"
        );


    const metaElement =
        document.getElementById(
            "pgame-notification-details-meta"
        );


    const details =
        document.getElementById(
            "pgame-notification-details"
        );


    if (
        !titleElement ||
        !bodyElement ||
        !metaElement ||
        !details
    ) {

        return;

    }


    /*
     * حالت اولیه
     */
    titleElement.textContent =
        fallbackTitle ||
        "اعلان";


    bodyElement.textContent =
        fallbackMessage ||
        "";


    metaElement.textContent =
        "🔔 اعلان PGame";


    details.classList.add(
        "open"
    );


    /*
     * اگر Reference ID وجود نداشت،
     * همان متن اعلان را نشان می‌دهیم.
     */
    if (
        !referenceId
    ) {

        return;

    }


    try {


        /* =====================================================
           NEWS
        ====================================================== */

        if (
            type ===
            "news"
        ) {

            const response =
                await fetch(
                    `/api/news/${referenceId}`,
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
                response.ok &&
                data.success &&
                data.news
            ) {

                const news =
                    data.news;


                titleElement.textContent =
                    "📰 " +
                    (
                        news.title ||
                        fallbackTitle ||
                        "خبر جدید"
                    );


                bodyElement.textContent =
                    news.content ||
                    fallbackMessage ||
                    "";


                metaElement.textContent =
                    [
                        "📰 خبر PGame",

                        news.category
                            ? `دسته‌بندی: ${news.category}`
                            : "",

                        news.author_username
                            ? `نویسنده: ${news.author_username}`
                            : "",

                        news.published_at
                            ? formatNotificationDate(
                                news.published_at
                            )
                            : ""
                    ]
                    .filter(Boolean)
                    .join(" • ");


                return;

            }

        }


        /* =====================================================
           POLL
        ====================================================== */

        if (
            type ===
            "poll"
        ) {

            const response =
                await fetch(
                    "/api/polls",
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
                response.ok &&
                data.success &&
                Array.isArray(
                    data.polls
                )
            ) {

                const poll =
                    data.polls.find(
                        item =>
                            Number(
                                item.id
                            ) ===
                            Number(
                                referenceId
                            )
                    );


                if (
                    poll
                ) {

                    titleElement.textContent =
                        "📊 " +
                        (
                            poll.question ||
                            fallbackTitle ||
                            "نظرسنجی جدید"
                        );


                    let optionText =
                        "";


                    if (
                        Array.isArray(
                            poll.options
                        )
                    ) {

                        optionText =
                            poll.options
                                .map(
                                    option => {

                                        const votes =
                                            Number(
                                                option.votes ||
                                                0
                                            );


                                        return (
                                            `• ${option.option_text}` +
                                            ` — ${votes} رأی`
                                        );

                                    }
                                )
                                .join("\n");

                    }


                    bodyElement.textContent =
                        [
                            poll.question,

                            "",

                            optionText
                        ]
                        .filter(
                            part =>
                                part !==
                                ""
                        )
                        .join("\n");


                    metaElement.textContent =
                        [
                            "📊 نظرسنجی PGame",

                            `مجموع رأی‌ها: ${
                                Number(
                                    poll.total_votes ||
                                    0
                                )
                            }`,

                            poll.published_at
                                ? formatNotificationDate(
                                    poll.published_at
                                )
                                : ""
                        ]
                        .filter(Boolean)
                        .join(" • ");


                    return;

                }

            }

        }


        /* =====================================================
           SUPPORT
        ====================================================== */

        if (
            type ===
            "support"
        ) {

            /*
             * پاسخ مدیریت را از API موجود می‌گیریم.
             */
            const response =
                await fetch(
                    "/api/support/my",
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
                response.ok &&
                data.success &&
                Array.isArray(
                    data.messages
                )
            ) {

                /*
                 * referenceId برای support
                 * شناسه پیام پشتیبانی است.
                 */
                const supportMessage =
                    data.messages.find(
                        item =>
                            Number(
                                item.id
                            ) ===
                            Number(
                                referenceId
                            )
                    );


                if (
                    supportMessage
                ) {

                    titleElement.textContent =
                        "💬 پاسخ مدیریت";


                    bodyElement.textContent =
                        supportMessage.reply ||
                        "پاسخی ثبت نشده است.";


                    metaElement.textContent =
                        supportMessage.replied_at
                            ? (
                                "پاسخ داده شده در " +
                                formatNotificationDate(
                                    supportMessage.replied_at
                                )
                            )
                            : "پاسخ مدیریت";


                    return;

                }

            }

        }


    } catch (
        error
    ) {

        console.error(
            "PGAME_NOTIFICATION_DETAILS_ERROR",
            error
        );

    }

}


/* =========================================================
   REPLACE NOTIFICATION CLICK HANDLER
   ---------------------------------------------------------
   این بخش را داخل initializeNotificationWidget
   جای Click Handler قبلی قرار بده.
========================================================= */

list.addEventListener(
    "click",
    async event => {

        const action =
            event.target.closest(
                "[data-notification-id]"
            );


        if (
            !action
        ) {

            return;

        }


        const notificationId =
            Number(
                action.dataset
                    .notificationId
            );


        if (
            !Number.isInteger(
                notificationId
            )
        ) {

            return;

        }


        const notificationItem =
            action.closest(
                ".pgame-notification-item"
            );


        if (
            !notificationItem
        ) {

            return;

        }


        const title =
            notificationItem
                .querySelector(
                    ".pgame-notification-title"
                )
                ?.textContent
                ?.trim()
                ||
                "اعلان";


        const message =
            notificationItem
                .querySelector(
                    ".pgame-notification-text"
                )
                ?.textContent
                ?.trim()
                ||
                "";


        const type =
            notificationItem
                .dataset
                .type
                ||
                "general";


        const referenceId =
            Number(
                notificationItem
                    .dataset
                    .referenceId
                ||
                0
            );


        /*
         * اعلان را خوانده‌شده می‌کنیم.
         */
        try {

            await fetch(
                `/api/notifications/${notificationId}/read`,
                {
                    method:
                        "POST",

                    credentials:
                        "same-origin",

                    cache:
                        "no-store"
                }
            );

        } catch (
            error
        ) {

            console.error(
                "PGAME_NOTIFICATION_READ_ERROR",
                error
            );

        }


        /*
         * پنل لیست بسته می‌شود.
         */
        panel.classList.remove(
            "open"
        );


        /*
         * پنجره جزئیات باز می‌شود.
         */
        await loadNotificationDetails(
            type,
            referenceId,
            title,
            message
        );


        /*
         * Badge دوباره بررسی می‌شود.
         */
        await loadNotifications();

    }
);


/* =========================================================
   CLOSE DETAILS WITH ESC
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            const details =
                document.getElementById(
                    "pgame-notification-details"
                );


            const panel =
                document.getElementById(
                    "vexon-notification-panel"
                );


            if (
                details
            ) {

                details.classList.remove(
                    "open"
                );

            }


            if (
                panel
            ) {

                panel.classList.remove(
                    "open"
                );

            }

        }

    }
);
/* =========================================================
   FINAL PGAME INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        try {

            /*
             * بررسی بن کامل
             */
            checkFullBan();


            /*
             * مشخصات کاربر در Header
             */
            initializeAuthHeader();


            /*
             * منوی اصلی
             */
            initializeNavigation();


            /*
             * افکت دکمه‌ها
             */
            initializeButtonPress();


            /*
             * Parallax
             */
            initializeParallax();


            /*
             * Scroll Reveal
             */
            initializeScrollReveal();


            /*
             * Smooth Navigation
             */
            initializeSmoothNavigation();


            /*
             * پیام به مدیریت
             *
             * در Messenger خودش تشخیص می‌دهد
             * و اجرا نمی‌شود.
             */
            if (
                !location.pathname.includes("/messenger") &&
                !location.pathname.includes("messenger.html")
            ) {
                initializeSupportWidget();
            }


            /*
             * اعلان‌ها
             *
             * در همه صفحات فعال است.
             */
            initializeNotificationWidget();

        } catch (
            error
        ) {

            console.error(
                "PGAME_INITIALIZATION_ERROR",
                error
            );

        }

    }
);