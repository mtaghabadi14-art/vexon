const app =
    document.querySelector("#app");


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
                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {
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

            location.href =
                location.pathname.includes(
                    "/sections/"
                )
                    ? "../banned.html"
                    : "banned.html";

        }

    } catch (error) {

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


    if (!headers.length) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/me",
                {
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

                    if (strong) {

                        strong.textContent =
                            data.user.username;

                    }


                    if (span) {

                        span.textContent =
                            `LV ${data.user.level ?? 1} • XP ${data.user.xp ?? 0}/${data.user.next_xp ?? 0} • 🪙 ${data.user.coins ?? 0}`;

                    }


                    header.href =
                        location.pathname.includes(
                            "/sections/"
                        )
                            ? "profile.html"
                            : "sections/profile.html";

                } else {

                    if (strong) {

                        strong.textContent =
                            "ورود / ثبت‌نام";

                    }


                    if (span) {

                        span.textContent =
                            "ورود به حساب";

                    }


                    header.href =
                        location.pathname.includes(
                            "/sections/"
                        )
                            ? "login.html"
                            : "sections/login.html";

                }

            }
        );

    } catch {

        // Ignore auth header errors.

    }

}


/* =========================================================
   GLOBAL ADMIN SUPPORT BUTTON
   نمایش در همه صفحات به جز Messenger
========================================================= */

function initializeGlobalSupportButton() {

    /*
     * فقط در Messenger نمایش داده نشود.
     */
    const isMessengerPage =
        /(^|\/)messenger\.html$/i.test(
            location.pathname
        );


    if (
        isMessengerPage
    ) {

        return;

    }


    /*
     * اگر از قبل موجود است، دوباره ساخته نشود.
     */
    if (
        document.getElementById(
            "pgame-global-support-button"
        )
    ) {

        return;

    }


    /* =====================================================
       STYLES
    ====================================================== */

    if (
        !document.getElementById(
            "pgame-global-support-style"
        )
    ) {

        const style =
            document.createElement(
                "style"
            );


        style.id =
            "pgame-global-support-style";


        style.textContent = `

            #pgame-global-support-button {

                position: fixed;

                left: 22px;

                bottom: 22px;

                width: 60px;

                height: 60px;

                z-index: 85000;

                display: flex;

                align-items: center;

                justify-content: center;

                border: 1px solid
                    rgba(
                        0,
                        255,
                        157,
                        .38
                    );

                border-radius: 50%;

                background:
                    linear-gradient(
                        135deg,
                        rgba(
                            0,
                            255,
                            157,
                            .92
                        ),
                        rgba(
                            0,
                            234,
                            255,
                            .88
                        )
                    );

                color: #03110c;

                font-size: 23px;

                cursor: pointer;

                box-shadow:

                    0 0 25px
                    rgba(
                        0,
                        255,
                        157,
                        .18
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


            #pgame-global-support-button:hover {

                transform:
                    translateY(-4px)
                    scale(1.05);

                box-shadow:

                    0 0 34px
                    rgba(
                        0,
                        255,
                        157,
                        .30
                    ),

                    0 18px 44px
                    rgba(
                        0,
                        0,
                        0,
                        .42
                    );

            }


            #pgame-global-support-overlay {

                display: none;

                position: fixed;

                inset: 0;

                z-index: 95000;

                align-items: center;

                justify-content: center;

                padding: 18px;

                background:
                    rgba(
                        0,
                        0,
                        0,
                        .74
                    );

            }


            .pgame-global-support-box {

                width:
                    min(
                        520px,
                        100%
                    );

                box-sizing: border-box;

                padding: 20px;

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


            .pgame-global-support-header {

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap: 10px;

            }


            .pgame-global-support-header h2 {

                margin: 0;

                font-size: 18px;

            }


            .pgame-global-support-close {

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


            .pgame-global-support-box textarea {

                width:
                    100%;

                min-height:
                    150px;

                margin-top:
                    15px;

                box-sizing:
                    border-box;

                resize:
                    vertical;

                padding:
                    13px;

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


            .pgame-global-support-actions {

                display:
                    flex;

                gap:
                    8px;

                margin-top:
                    10px;

            }


            .pgame-global-support-actions button {

                flex:
                    1;

            }


            .pgame-global-support-status {

                min-height:
                    18px;

                margin-top:
                    9px;

                font-size:
                    10px;

            }


            @media (max-width:600px) {

                #pgame-global-support-button {

                    left:
                        16px;

                    bottom:
                        16px;

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

    }


    /* =====================================================
       BUTTON
    ====================================================== */

    const button =
        document.createElement(
            "button"
        );


    button.id =
        "pgame-global-support-button";


    button.type =
        "button";


    button.title =
        "پیام به مدیریت";


    button.setAttribute(
        "aria-label",
        "پیام به مدیریت"
    );


    button.textContent =
        "💬";


    document.body.appendChild(
        button
    );


    /* =====================================================
       OVERLAY
    ====================================================== */

    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "pgame-global-support-overlay";


    overlay.innerHTML = `

        <section
            class="pgame-global-support-box"
        >

            <div
                class="pgame-global-support-header"
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
                    class="pgame-global-support-close"
                    type="button"
                    id="pgame-global-support-close"
                >
                    &times;
                </button>

            </div>


            <textarea
                id="pgame-global-support-input"
                maxlength="5000"
                placeholder="پیامت را برای مدیریت بنویس..."
            ></textarea>


            <div
                class="pgame-global-support-actions"
            >

                <button
                    class="auth-button"
                    type="button"
                    id="pgame-global-support-send"
                >
                    🚀 ارسال پیام
                </button>


                <button
                    class="auth-secondary-button"
                    type="button"
                    id="pgame-global-support-cancel"
                >
                    بستن
                </button>

            </div>


            <div
                class="pgame-global-support-status"
                id="pgame-global-support-status"
            ></div>

        </section>

    `;


    document.body.appendChild(
        overlay
    );


    /* =====================================================
       ELEMENTS
    ====================================================== */

    const input =
        document.getElementById(
            "pgame-global-support-input"
        );


    const status =
        document.getElementById(
            "pgame-global-support-status"
        );


    const send =
        document.getElementById(
            "pgame-global-support-send"
        );


    const close =
        document.getElementById(
            "pgame-global-support-close"
        );


    const cancel =
        document.getElementById(
            "pgame-global-support-cancel"
        );


    function closeSupport() {

        overlay.style.display =
            "none";

    }


    function setStatus(
        text,
        success = false
    ) {

        status.textContent =
            text;

        status.style.color =
            success
                ? "#00ff9d"
                : "#ff7183";

    }


    /* =====================================================
       OPEN
    ====================================================== */

    button.onclick =
        async () => {

            try {

                const response =
                    await fetch(
                        "/api/me",
                        {
                            cache:
                                "no-store"
                        }
                    );


                if (
                    response.status ===
                    401
                ) {

                    const fromSections =
                        location.pathname.includes(
                            "/sections/"
                        );


                    location.href =
                        fromSections
                            ? "login.html"
                            : "sections/login.html";


                    return;

                }


                const data =
                    await response.json();


                if (
                    !data.loggedIn
                ) {

                    const fromSections =
                        location.pathname.includes(
                            "/sections/"
                        );


                    location.href =
                        fromSections
                            ? "login.html"
                            : "sections/login.html";


                    return;

                }


                overlay.style.display =
                    "flex";

                input.focus();

            } catch {

                overlay.style.display =
                    "flex";

                input.focus();

            }

        };


    close.onclick =
        closeSupport;


    cancel.onclick =
        closeSupport;


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


    /* =====================================================
       SEND
    ====================================================== */

    send.onclick =
        async () => {

            const message =
                input.value.trim();


            if (
                message.length <
                2
            ) {

                setStatus(
                    "پیام خیلی کوتاه است."
                );

                return;

            }


            send.disabled =
                true;


            send.textContent =
                "⏳ در حال ارسال...";


            setStatus(
                ""
            );


            try {

                const response =
                    await fetch(
                        "/api/support/send",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials:
                                "same-origin",

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

                    const fromSections =
                        location.pathname.includes(
                            "/sections/"
                        );


                    location.href =
                        fromSections
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


                setStatus(
                    "✅ پیامت برای مدیریت ارسال شد.",
                    true
                );


            } catch (error) {

                setStatus(
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

        };

}


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        checkFullBan();

        initializeAuthHeader();

        initializeGlobalSupportButton();

    }
);