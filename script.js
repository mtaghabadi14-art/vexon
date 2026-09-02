/* =========================================================
   PGame — Main Script
   Play • Compete • Level Up.
========================================================= */

/* =========================================================
   HELPERS
========================================================= */

function isMessengerPage() {

    const path =
        window.location.pathname
            .replace(/\/+$/, "")
            .toLowerCase();

    return (
        path.endsWith("/messenger") ||
        path.endsWith("/messenger.html") ||
        path.endsWith("/sections/messenger") ||
        path.endsWith("/sections/messenger.html")
    );

}


function removeSupportWidgetOnMessenger() {

    if (!isMessengerPage()) {
        return;
    }

    const widget =
        document.getElementById(
            "vexon-support-widget"
        );

    if (widget) {
        widget.remove();
    }

    const style =
        document.getElementById(
            "vexon-support-style"
        );

    if (style) {
        style.remove();
    }

}


function protectMessengerFromSupport() {

    if (!isMessengerPage()) {
        return;
    }

    function removeSupport() {

        const widget =
            document.getElementById(
                "vexon-support-widget"
            );

        if (widget) {
            widget.remove();
        }

        const style =
            document.getElementById(
                "vexon-support-style"
            );

        if (style) {
            style.remove();
        }

    }

    removeSupport();

    const observer =
        new MutationObserver(() => {

            removeSupport();

        });

    function startObserver() {

        if (!document.body) {
            return;
        }

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        removeSupport();

    }

    if (document.body) {

        startObserver();

    } else {

        document.addEventListener(
            "DOMContentLoaded",
            startObserver,
            { once: true }
        );

    }

}


function inSections(file) {

    return (
        window.location.pathname.includes(
            "/sections/"
        )
    )
        ? `./${file}`
        : `./sections/${file}`;

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatNotificationDate(dateValue) {

    if (!dateValue) {
        return "";
    }

    const date =
        new Date(dateValue);

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
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   BAN CHECK
========================================================= */

async function checkFullBan() {

    try {

        const response =
            await fetch(
                "/api/me",
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (
            data?.success &&
            data?.user?.ban_type === "full"
        ) {

            if (
                !location.pathname.endsWith(
                    "/banned.html"
                )
            ) {

                location.href = "/banned.html";

            }

        }

    } catch (error) {

        console.error(
            "BAN CHECK ERROR:",
            error
        );

    }

}


/* =========================================================
   AUTH HEADER
========================================================= */

async function initializeAuthHeader() {

    const profileBox =
        document.querySelector(
            ".header-profile"
        );

    if (!profileBox) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/me",
                {
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        if (
            !data?.success ||
            !data?.user
        ) {

            return;

        }

        const user =
            data.user;

        const username =
            user.username ||
            user.name ||
            "Player";

        const level =
            Number(
                user.level || 1
            );

        const xp =
            Number(
                user.xp || 0
            );

        const coins =
            Number(
                user.coins || 0
            );

        profileBox.classList.add(
            "is-logged-in"
        );

        const nameElement =
            profileBox.querySelector(
                "[data-user-name]"
            );

        if (nameElement) {

            nameElement.textContent =
                username;

        }

        const levelElement =
            profileBox.querySelector(
                "[data-user-level]"
            );

        if (levelElement) {

            levelElement.textContent =
                `LV ${level}`;

        }

        const xpElement =
            profileBox.querySelector(
                "[data-user-xp]"
            );

        if (xpElement) {

            xpElement.textContent =
                `${xp} XP`;

        }

        const coinElement =
            profileBox.querySelector(
                "[data-user-coins]"
            );

        if (coinElement) {

            coinElement.textContent =
                `${coins}`;

        }

        const progressElement =
            profileBox.querySelector(
                "[data-xp-progress]"
            );

        if (progressElement) {

            const thresholds = {

                1: 100,
                2: 250,
                3: 500,
                4: 800,
                5: 1200,
                6: 1700,
                7: 2500,
                8: 3500,
                9: 5000

            };

            const currentThreshold =
                thresholds[level] ||
                (level * 700);

            const previousThreshold =
                level <= 1
                    ? 0
                    : (
                        thresholds[level - 1] ||
                        ((level - 1) * 700)
                    );

            const needed =
                Math.max(
                    1,
                    currentThreshold -
                    previousThreshold
                );

            const current =
                Math.max(
                    0,
                    xp - previousThreshold
                );

            const percent =
                Math.min(
                    100,
                    Math.max(
                        0,
                        (current / needed) * 100
                    )
                );

            progressElement.style.width =
                `${percent}%`;

        }

    } catch (error) {

        console.error(
            "AUTH HEADER ERROR:",
            error
        );

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

    const links =
        document.querySelectorAll(
            ".nav-links a[href^='#']"
        );

    if (!links.length) {
        return;
    }

    const sections = [];

    links.forEach(
        (link) => {

            const href =
                link.getAttribute(
                    "href"
                );

            if (
                !href ||
                href === "#"
            ) {
                return;
            }

            const target =
                document.querySelector(
                    href
                );

            if (target) {
                sections.push({
                    link,
                    target
                });
            }

        }
    );

    if (!sections.length) {
        return;
    }

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(
                    (entry) => {

                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        sections.forEach(
                            ({ link }) => {

                                link.classList.remove(
                                    "active"
                                );

                            }
                        );

                        const current =
                            sections.find(
                                ({ target }) =>
                                    target ===
                                    entry.target
                            );

                        if (current) {

                            current.link.classList.add(
                                "active"
                            );

                        }

                    }
                );

            },
            {
                threshold: 0.35
            }
        );

    sections.forEach(
        ({ target }) => {

            observer.observe(
                target
            );

        }
    );

}


/* =========================================================
   BUTTON PRESS EFFECT
========================================================= */

function initializeButtonPress() {

    document.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "button, .btn, a.button"
                );

            if (!button) {
                return;
            }

            button.classList.add(
                "pressing"
            );

            setTimeout(
                () => {

                    button.classList.remove(
                        "pressing"
                    );

                },
                150
            );

        }
    );

}


/* =========================================================
   PARALLAX
========================================================= */

function initializeParallax() {

    const elements =
        document.querySelectorAll(
            "[data-parallax]"
        );

    if (!elements.length) {
        return;
    }

    window.addEventListener(
        "mousemove",
        (event) => {

            const x =
                (event.clientX /
                    window.innerWidth -
                    0.5);

            const y =
                (event.clientY /
                    window.innerHeight -
                    0.5);

            elements.forEach(
                (element) => {

                    const amount =
                        Number(
                            element.dataset.parallax ||
                            10
                        );

                    element.style.transform =
                        `translate(${x * amount}px, ${y * amount}px)`;

                }
            );

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   SCROLL REVEAL
========================================================= */

function initializeScrollReveal() {

    const items =
        document.querySelectorAll(
            ".reveal, [data-reveal]"
        );

    if (!items.length) {
        return;
    }

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(
                    (entry) => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "visible"
                            );

                            observer.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },
            {
                threshold: 0.15
            }
        );

    items.forEach(
        (item) => {

            observer.observe(
                item
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
        (event) => {

            const link =
                event.target.closest(
                    "a[href^='#']"
                );

            if (!link) {
                return;
            }

            const href =
                link.getAttribute(
                    "href"
                );

            if (
                !href ||
                href === "#"
            ) {
                return;
            }

            const target =
                document.querySelector(
                    href
                );

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView(
                {
                    behavior: "smooth",
                    block: "start"
                }
            );

        }
    );

}


/* =========================================================
   SUPPORT WIDGET
========================================================= */

function initializeSupportWidget() {

    if (isMessengerPage()) {

        removeSupportWidgetOnMessenger();

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
            right: 22px;
            bottom: 22px;

            z-index: 999999;

            font-family:
                Vazirmatn,
                Arial,
                sans-serif;

        }

        #vexon-support-button {

            width: 58px;
            height: 58px;

            border-radius: 50%;

            border:
                1px solid
                rgba(0,255,157,.55);

            background:
                rgba(3,4,10,.88);

            color:
                #00ff9d;

            box-shadow:
                0 0 18px
                rgba(0,255,157,.28);

            cursor: pointer;

            display: flex;
            align-items: center;
            justify-content: center;

            font-size: 24px;

            transition:
                .25s ease;

        }

        #vexon-support-button:hover {

            transform:
                translateY(-4px)
                scale(1.04);

            box-shadow:
                0 0 28px
                rgba(0,255,157,.5);

        }

        #vexon-support-panel {

            position: absolute;

            right: 0;
            bottom: 72px;

            width:
                min(340px, calc(100vw - 30px));

            padding: 18px;

            border-radius: 20px;

            background:
                rgba(7,10,18,.97);

            border:
                1px solid
                rgba(0,255,157,.25);

            box-shadow:
                0 20px 60px
                rgba(0,0,0,.45);

            display: none;

            direction: rtl;

        }

        #vexon-support-panel.open {

            display: block;

            animation:
                vexonSupportIn
                .22s ease;

        }

        @keyframes vexonSupportIn {

            from {

                opacity: 0;
                transform:
                    translateY(10px)
                    scale(.97);

            }

            to {

                opacity: 1;
                transform:
                    translateY(0)
                    scale(1);

            }

        }

        #vexon-support-panel h3 {

            margin:
                0 0 12px;

            color:
                #ffffff;

            font-size:
                17px;

        }

        #vexon-support-panel textarea {

            width: 100%;
            min-height: 110px;

            resize: vertical;

            box-sizing: border-box;

            border-radius: 14px;

            border:
                1px solid
                rgba(255,255,255,.1);

            background:
                rgba(255,255,255,.03);

            color:
                white;

            padding: 12px;

            outline: none;

            font:
                inherit;

        }

        #vexon-support-panel textarea:focus {

            border-color:
                rgba(0,255,157,.5);

            box-shadow:
                0 0 0 3px
                rgba(0,255,157,.06);

        }

        #vexon-support-send {

            width: 100%;

            margin-top: 10px;

            border: none;

            border-radius: 12px;

            padding: 11px;

            background:
                linear-gradient(
                    90deg,
                    #00ff9d,
                    #00eaff
                );

            color:
                #03110d;

            font-weight: 800;

            cursor: pointer;

        }

        #vexon-support-status {

            margin-top: 10px;

            font-size: 13px;

            color:
                #8a8aa0;

        }

    `;

    document.head.appendChild(
        style
    );


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.id =
        "vexon-support-widget";

    wrapper.innerHTML = `

        <div
            id="vexon-support-panel"
        >

            <h3>
                پیام به مدیریت
            </h3>

            <textarea
                id="vexon-support-text"
                placeholder="پیامت رو برای مدیریت بنویس..."
            ></textarea>

            <button
                id="vexon-support-send"
                type="button"
            >
                ارسال پیام
            </button>

            <div
                id="vexon-support-status"
            ></div>

        </div>

        <button
            id="vexon-support-button"
            type="button"
            aria-label="پیام به مدیریت"
            title="پیام به مدیریت"
        >
            💬
        </button>

    `;

    document.body.appendChild(
        wrapper
    );


    const button =
        document.getElementById(
            "vexon-support-button"
        );

    const panel =
        document.getElementById(
            "vexon-support-panel"
        );

    const textarea =
        document.getElementById(
            "vexon-support-text"
        );

    const sendButton =
        document.getElementById(
            "vexon-support-send"
        );

    const status =
        document.getElementById(
            "vexon-support-status"
        );


    button.addEventListener(
        "click",
        () => {

            panel.classList.toggle(
                "open"
            );

        }
    );


    document.addEventListener(
        "click",
        (event) => {

            if (
                !wrapper.contains(
                    event.target
                )
            ) {

                panel.classList.remove(
                    "open"
                );

            }

        }
    );


    sendButton.addEventListener(
        "click",
        async () => {

            const message =
                textarea.value.trim();

            if (!message) {

                status.textContent =
                    "پیام خالی است.";

                return;

            }

            sendButton.disabled =
                true;

            status.textContent =
                "در حال ارسال...";

            try {

                const response =
                    await fetch(
                        "/api/support/send",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    {
                                        message
                                    }
                                )
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "ارسال پیام ناموفق بود."
                    );

                }

                textarea.value = "";

                status.textContent =
                    "پیام با موفقیت ارسال شد ✅";

                setTimeout(
                    () => {

                        panel.classList.remove(
                            "open"
                        );

                    },
                    1200
                );

            } catch (error) {

                console.error(
                    "SUPPORT SEND ERROR:",
                    error
                );

                status.textContent =
                    error.message ||
                    "خطا در ارسال پیام.";

            } finally {

                sendButton.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   NOTIFICATION WIDGET
========================================================= */

function initializeNotificationWidget() {

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
            "pgame-notification-widget"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );

    style.id =
        "pgame-notification-style";

    style.textContent = `

        #pgame-notification-widget {

            position: fixed;

            right: 22px;
            top: 50%;

            transform:
                translateY(-50%);

            z-index: 999998;

            font-family:
                Vazirmatn,
                Arial,
                sans-serif;

            direction: rtl;

        }

        #pgame-notification-button {

            width: 54px;
            height: 54px;

            border-radius: 50%;

            border:
                1px solid
                rgba(116,77,255,.65);

            background:
                rgba(7,10,18,.95);

            color:
                #ffffff;

            display: none;

            align-items: center;
            justify-content: center;

            position: relative;

            cursor: pointer;

            font-size: 22px;

            box-shadow:
                0 0 20px
                rgba(116,77,255,.3);

            transition:
                .25s ease;

        }

        #pgame-notification-button.visible {

            display: flex;

        }

        #pgame-notification-button:hover {

            transform:
                scale(1.06);

            box-shadow:
                0 0 28px
                rgba(116,77,255,.55);

        }

        #pgame-notification-badge {

            position: absolute;

            top: -4px;
            right: -4px;

            min-width: 20px;
            height: 20px;

            padding:
                0 5px;

            border-radius: 999px;

            background:
                #ff3f5a;

            color:
                white;

            font-size: 11px;

            display: flex;
            align-items: center;
            justify-content: center;

            font-weight: 800;

            box-sizing: border-box;

        }


        #pgame-notification-panel {

            position: absolute;

            right: 68px;

            top: 50%;

            transform:
                translateY(-50%);

            width:
                min(360px, calc(100vw - 110px));

            max-height:
                520px;

            overflow-y: auto;

            padding: 14px;

            border-radius: 20px;

            background:
                rgba(7,10,18,.98);

            border:
                1px solid
                rgba(116,77,255,.25);

            box-shadow:
                0 20px 60px
                rgba(0,0,0,.5);

            display: none;

        }

        #pgame-notification-panel.open {

            display: block;

            animation:
                pgameNotifIn
                .2s ease;

        }

        @keyframes pgameNotifIn {

            from {

                opacity: 0;
                transform:
                    translateY(-50%)
                    translateX(8px)
                    scale(.98);

            }

            to {

                opacity: 1;
                transform:
                    translateY(-50%)
                    translateX(0)
                    scale(1);

            }

        }


        .pgame-notification-head {

            display: flex;

            justify-content:
                space-between;

            align-items: center;

            gap: 10px;

            margin-bottom: 10px;

        }

        .pgame-notification-head h3 {

            margin: 0;

            font-size: 16px;

            color: white;

        }

        .pgame-notification-close {

            width: 30px;
            height: 30px;

            border: none;

            border-radius: 10px;

            background:
                rgba(255,255,255,.06);

            color:
                white;

            cursor: pointer;

        }


        .pgame-notification-item {

            padding: 12px;

            border-radius: 14px;

            background:
                rgba(255,255,255,.035);

            border:
                1px solid
                rgba(255,255,255,.06);

            margin-bottom: 8px;

            cursor: pointer;

            transition:
                .2s ease;

        }

        .pgame-notification-item:hover {

            border-color:
                rgba(116,77,255,.35);

            transform:
                translateY(-1px);

        }

        .pgame-notification-item.unread {

            border-color:
                rgba(116,77,255,.28);

        }

        .pgame-notification-title {

            color:
                white;

            font-weight:
                700;

            font-size:
                14px;

        }

        .pgame-notification-message {

            margin-top: 5px;

            color:
                #a8a8bb;

            font-size:
                12px;

            line-height:
                1.7;

        }

        .pgame-notification-date {

            margin-top: 8px;

            color:
                #66667a;

            font-size:
                10px;

        }

        .pgame-notification-empty {

            text-align:
                center;

            padding:
                26px 12px;

            color:
                #77778c;

            font-size:
                13px;

        }


        #pgame-notification-modal {

            position: fixed;

            inset: 0;

            z-index: 999999;

            display: none;

            align-items: center;
            justify-content: center;

            padding: 20px;

            background:
                rgba(0,0,0,.68);

            backdrop-filter:
                blur(8px);

        }

        #pgame-notification-modal.open {

            display: flex;

        }

        .pgame-notification-modal-box {

            width:
                min(520px, 100%);

            max-height:
                80vh;

            overflow-y: auto;

            background:
                #070a12;

            border-radius: 22px;

            border:
                1px solid
                rgba(116,77,255,.3);

            padding: 20px;

            box-shadow:
                0 30px 100px
                rgba(0,0,0,.6);

        }

        .pgame-notification-modal-head {

            display: flex;

            justify-content:
                space-between;

            align-items:
                center;

            margin-bottom: 15px;

        }

        .pgame-notification-modal-head h3 {

            margin: 0;

            color:
                white;

            font-size:
                18px;

        }

        .pgame-notification-modal-close {

            border: none;

            width: 34px;
            height: 34px;

            border-radius: 10px;

            background:
                rgba(255,255,255,.06);

            color:
                white;

            cursor: pointer;

        }

        .pgame-notification-modal-content {

            color:
                #dddded;

            line-height:
                1.9;

            font-size:
                14px;

        }

        @media (max-width: 700px) {

            #pgame-notification-widget {

                right: 12px;

            }

            #pgame-notification-panel {

                right: 64px;

                width:
                    min(320px, calc(100vw - 86px));

            }

            #vexon-support-widget {

                right: 12px;
                bottom: 12px;

            }

        }

    `;

    document.head.appendChild(
        style
    );


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.id =
        "pgame-notification-widget";

    wrapper.innerHTML = `

        <div
            id="pgame-notification-panel"
        >

            <div
                class="pgame-notification-head"
            >

                <h3>
                    اعلان‌ها
                </h3>

                <button
                    type="button"
                    class="pgame-notification-close"
                    aria-label="بستن"
                >
                    ×
                </button>

            </div>

            <div
                id="pgame-notification-list"
            ></div>

        </div>

        <button
            id="pgame-notification-button"
            type="button"
            aria-label="اعلان‌ها"
            title="اعلان‌ها"
        >

            🔔

            <span
                id="pgame-notification-badge"
            >
                0
            </span>

        </button>

    `;

    document.body.appendChild(
        wrapper
    );


    const button =
        document.getElementById(
            "pgame-notification-button"
        );

    const badge =
        document.getElementById(
            "pgame-notification-badge"
        );

    const panel =
        document.getElementById(
            "pgame-notification-panel"
        );

    const list =
        document.getElementById(
            "pgame-notification-list"
        );

    const closeButton =
        wrapper.querySelector(
            ".pgame-notification-close"
        );


    let notifications = [];


    function updateNotificationButton(
        unreadCount
    ) {

        const count =
            Number(
                unreadCount || 0
            );

        if (count <= 0) {

            button.classList.remove(
                "visible"
            );

            badge.textContent =
                "0";

            panel.classList.remove(
                "open"
            );

            return;

        }

        button.classList.add(
            "visible"
        );

        badge.textContent =
            count > 99
                ? "99+"
                : String(count);

    }


    function renderNotifications() {

        if (!notifications.length) {

            list.innerHTML = `
                <div
                    class="pgame-notification-empty"
                >
                    اعلان جدیدی وجود ندارد.
                </div>
            `;

            return;

        }


        list.innerHTML =
            notifications
                .map(
                    (notification) => {

                        const title =
                            escapeHtml(
                                notification.title ||
                                notification.type ||
                                "اعلان"
                            );

                        const message =
                            escapeHtml(
                                notification.message ||
                                ""
                            );

                        const date =
                            formatNotificationDate(
                                notification.created_at ||
                                notification.createdAt
                            );

                        const unread =
                            !notification.read;

                        return `

                            <div
                                class="pgame-notification-item ${unread ? "unread" : ""}"
                                data-notification-id="${notification.id}"
                            >

                                <div
                                    class="pgame-notification-title"
                                >
                                    ${title}
                                </div>

                                <div
                                    class="pgame-notification-message"
                                >
                                    ${message}
                                </div>

                                ${
                                    date
                                        ? `
                                            <div
                                                class="pgame-notification-date"
                                            >
                                                ${escapeHtml(date)}
                                            </div>
                                        `
                                        : ""
                                }

                            </div>

                        `;

                    }
                )
                .join("");

    }


    async function loadNotifications() {

        try {

            const response =
                await fetch(
                    "/api/notifications",
                    {
                        cache: "no-store"
                    }
                );

            if (!response.ok) {

                updateNotificationButton(
                    0
                );

                return;

            }

            const data =
                await response.json();

            if (
                !data?.success
            ) {

                updateNotificationButton(
                    0
                );

                return;

            }

            notifications =
                Array.isArray(
                    data.notifications
                )
                    ? data.notifications
                    : [];

            const unreadCount =
                Number(
                    data.unread_count ??
                    notifications.filter(
                        (item) =>
                            !item.read
                    ).length
                );

            updateNotificationButton(
                unreadCount
            );

            renderNotifications();

        } catch (error) {

            console.error(
                "NOTIFICATION LOAD ERROR:",
                error
            );

            updateNotificationButton(
                0
            );

        }

    }


    async function markAsRead(
        notificationId
    ) {

        if (!notificationId) {
            return;
        }

        try {

            await fetch(
                `/api/notifications/${notificationId}/read`,
                {
                    method:
                        "POST"
                }
            );

        } catch (error) {

            console.error(
                "NOTIFICATION READ ERROR:",
                error
            );

        }

    }


    async function openNotificationDetails(
        notification
    ) {

        if (!notification) {
            return;
        }


        await markAsRead(
            notification.id
        );


        const modal =
            document.createElement(
                "div"
            );

        modal.id =
            "pgame-notification-modal";

        modal.innerHTML = `

            <div
                class="pgame-notification-modal-box"
            >

                <div
                    class="pgame-notification-modal-head"
                >

                    <h3>
                        ${escapeHtml(
                            notification.title ||
                            "جزئیات اعلان"
                        )}
                    </h3>

                    <button
                        type="button"
                        class="pgame-notification-modal-close"
                    >
                        ×
                    </button>

                </div>

                <div
                    class="pgame-notification-modal-content"
                    id="pgame-notification-modal-content"
                >

                    در حال دریافت اطلاعات...

                </div>

            </div>

        `;

        document.body.appendChild(
            modal
        );

        requestAnimationFrame(
            () => {

                modal.classList.add(
                    "open"
                );

            }
        );


        const content =
            modal.querySelector(
                "#pgame-notification-modal-content"
            );


        try {

            let result = null;


            if (
                notification.type === "news"
            ) {

                const referenceId =
                    notification.reference_id;

                if (referenceId) {

                    const response =
                        await fetch(
                            `/api/news/${referenceId}`,
                            {
                                cache:
                                    "no-store"
                            }
                        );

                    if (response.ok) {
                        result =
                            await response.json();
                    }

                }

            }


            if (
                notification.type === "poll"
            ) {

                const response =
                    await fetch(
                        "/api/polls",
                        {
                            cache:
                                "no-store"
                        }
                    );

                if (response.ok) {

                    const data =
                        await response.json();

                    const polls =
                        Array.isArray(
                            data.polls
                        )
                            ? data.polls
                            : [];

                    const poll =
                        polls.find(
                            (item) =>
                                String(item.id) ===
                                String(
                                    notification.reference_id
                                )
                        );

                    if (poll) {

                        result = {
                            success: true,
                            poll
                        };

                    }

                }

            }


            if (
                notification.type === "support"
            ) {

                const response =
                    await fetch(
                        "/api/support/my",
                        {
                            cache:
                                "no-store"
                        }
                    );

                if (response.ok) {

                    const data =
                        await response.json();

                    const messages =
                        Array.isArray(
                            data.messages
                        )
                            ? data.messages
                            : [];

                    const message =
                        messages.find(
                            (item) =>
                                String(item.id) ===
                                String(
                                    notification.reference_id
                                )
                        );

                    if (message) {

                        result = {
                            success: true,
                            message
                        };

                    }

                }

            }


            if (
                result?.news
            ) {

                const news =
                    result.news;

                content.innerHTML = `

                    <h4>
                        ${escapeHtml(
                            news.title ||
                            ""
                        )}
                    </h4>

                    <div>
                        ${escapeHtml(
                            news.body ||
                            news.content ||
                            ""
                        )}
                    </div>

                `;

            } else if (
                result?.poll
            ) {

                const poll =
                    result.poll;

                content.innerHTML = `

                    <h4>
                        ${escapeHtml(
                            poll.question ||
                            poll.title ||
                            ""
                        )}
                    </h4>

                    ${
                        Array.isArray(
                            poll.options
                        )
                            ? `
                                <div>
                                    ${poll.options
                                        .map(
                                            (option) =>
                                                `<div style="margin:7px 0">
                                                    ${escapeHtml(
                                                        option.text ||
                                                        option.title ||
                                                        String(option)
                                                    )}
                                                </div>`
                                        )
                                        .join("")
                                    }
                                </div>
                            `
                            : ""
                    }

                `;

            } else if (
                result?.message
            ) {

                const support =
                    result.message;

                content.innerHTML = `

                    <div>
                        ${escapeHtml(
                            support.message ||
                            ""
                        )}
                    </div>

                    ${
                        support.reply
                            ? `
                                <hr
                                    style="
                                        opacity:.12;
                                        margin:15px 0;
                                    "
                                >

                                <strong>
                                    پاسخ مدیریت:
                                </strong>

                                <div
                                    style="margin-top:8px"
                                >
                                    ${escapeHtml(
                                        support.reply
                                    )}
                                </div>
                            `
                            : ""
                    }

                `;

            } else {

                content.innerHTML = `

                    ${escapeHtml(
                        notification.message ||
                        "اطلاعات این اعلان پیدا نشد."
                    )}

                `;

            }

        } catch (error) {

            console.error(
                "NOTIFICATION DETAILS ERROR:",
                error
            );

            content.textContent =
                "نمایش جزئیات اعلان با خطا مواجه شد.";

        }


        const close =
            modal.querySelector(
                ".pgame-notification-modal-close"
            );

        close.addEventListener(
            "click",
            () => {

                modal.remove();

            }
        );


        modal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    modal
                ) {

                    modal.remove();

                }

            }
        );


        const item =
            notifications.find(
                (item) =>
                    String(item.id) ===
                    String(
                        notification.id
                    )
            );

        if (item) {
            item.read = 1;
        }

        const unread =
            notifications.filter(
                (item) =>
                    !item.read
            ).length;

        updateNotificationButton(
            unread
        );

        renderNotifications();

    }


    button.addEventListener(
        "click",
        () => {

            panel.classList.toggle(
                "open"
            );

            if (
                panel.classList.contains(
                    "open"
                )
            ) {

                renderNotifications();

            }

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


    document.addEventListener(
        "click",
        (event) => {

            if (
                !wrapper.contains(
                    event.target
                )
            ) {

                panel.classList.remove(
                    "open"
                );

            }

        }
    );


    list.addEventListener(
        "click",
        async (event) => {

            const item =
                event.target.closest(
                    ".pgame-notification-item"
                );

            if (!item) {
                return;
            }

            const id =
                item.dataset.notificationId;

            const notification =
                notifications.find(
                    (item) =>
                        String(item.id) ===
                        String(id)
                );

            if (!notification) {
                return;
            }

            await openNotificationDetails(
                notification
            );

        }
    );


    loadNotifications();


    setInterval(
        () => {

            loadNotifications();

        },
        10000
    );

}


/* =========================================================
   MAIN INITIALIZATION
========================================================= */

function initializePGame() {

    checkFullBan();

    initializeNavigation();

    initializeButtonPress();

    initializeParallax();

    initializeAuthHeader();


    /*
       Messenger:
       هیچ‌وقت اجازه ایجاد
       Support Widget را نده.
    */

    protectMessengerFromSupport();


    if (!isMessengerPage()) {

        initializeSupportWidget();

    }


    initializeNotificationWidget();


    if (
        typeof app !== "undefined" &&
        app
    ) {

        initializeScrollReveal();

        initializeSmoothNavigation();

    }

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePGame,
        {
            once: true
        }
    );

} else {

    initializePGame();

}