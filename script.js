/* =========================
   VEXON PAGE LOADER
========================= */

const app = document.querySelector("#app");


/* =========================
   LIVE PLAYER UPDATE
========================= */

let vexonPlayerUpdateTimer = null;


/* =========================
   LOAD HTML SECTION
========================= */

async function loadSection(file) {

    try {

        const response = await fetch(
            `sections/${file}.html`
        );

        if (!response.ok) {

            throw new Error(
                `Failed to load ${file}.html`
            );

        }

        return await response.text();

    } catch (error) {

        console.error(error);

        return `
            <div class="section-error">
                <strong>خطا در بارگذاری VEXON</strong>
                <span>${file}.html پیدا نشد.</span>
            </div>
        `;

    }

}


/* =========================
   LOAD ALL SECTIONS
========================= */

async function loadVexon() {

    /*
     * index.html اصلی #app ندارد.
     * بنابراین اگر روی index هستیم،
     * فقط Header را آپدیت می‌کنیم.
     */

    if (!app) {

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
            sections.map(section =>
                loadSection(section)
            )
        );


    app.innerHTML =
        loadedSections.join("\n");


    initializeVexon();

}


/* =========================
   STANDALONE INITIALIZE
========================= */

function initializeStandaloneVexon() {

    initializeNavigation();

    initializeButtonPress();

    initializeParallax();

    initializeAuthHeader();

}


/* =========================
   INITIALIZE VEXON
========================= */

function initializeVexon() {

    initializeNavigation();

    initializeScrollReveal();

    initializeSmoothNavigation();

    initializeButtonPress();

    initializeParallax();

    initializeAuthHeader();

}


/* =========================
   AUTH HEADER
========================= */

async function updateAuthHeader() {

    const headerProfiles =
        document.querySelectorAll(
            ".header-profile"
        );


    if (!headerProfiles.length) {

        return;

    }


    /*
     * حالت مهمان
     * تا زمانی که وضعیت واقعی حساب مشخص شود.
     */

    setGuestHeader(
        headerProfiles
    );


    try {

        const response =
            await fetch(
                "/api/me",
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );


        /*
         * اگر API جواب معتبر نداد،
         * همان حالت مهمان باقی می‌ماند.
         */

        if (!response.ok) {

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


        const user =
            data.user;


        const level =
            Number(
                user.level ?? 1
            );


        const xp =
            Number(
                user.xp ?? 0
            );


        const coins =
            Number(
                user.coins ?? 0
            );


        /*
         * XP مورد نیاز برای Level فعلی
         *
         * همان منطق Bangame
         */

        const xpNeededMap = {

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


        const nextXp =
            Number(
                user.next_xp ??
                xpNeededMap[level] ??
                (level * 700)
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
                        ) * 100
                    )
                )
                : 0;


        /*
         * آپدیت همه Headerها
         */

        headerProfiles.forEach(
            (headerProfile) => {

                /*
                 * کاربر وارد شده
                 */

                headerProfile.href =
                    "sections/profile.html";


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


                /*
                 * Username
                 */

                if (strong) {

                    strong.textContent =
                        user.username ||
                        "بازیکن VEXON";

                }


                /*
                 * XP / Level / Coins
                 */

                if (span) {

                    span.textContent =
                        `LV ${level} • XP ${xp}/${nextXp} • 🪙 ${coins}`;


                    span.classList.add(
                        "header-player-stats"
                    );

                }


                /*
                 * XP Bar
                 */

                if (xpBar) {

                    xpBar.style.display =
                        "block";

                }


                if (xpFill) {

                    /*
                     * فقط وقتی مقدار تغییر کرده،
                     * انیمیشن را اجرا کن.
                     */

                    const currentWidth =
                        xpFill.style.width;


                    const targetWidth =
                        `${progress}%`;


                    if (
                        currentWidth !==
                        targetWidth
                    ) {

                        xpFill.style.width =
                            "0%";


                        requestAnimationFrame(
                            () => {

                                requestAnimationFrame(
                                    () => {

                                        xpFill.style.width =
                                            targetWidth;

                                    }
                                );

                            }
                        );

                    }

                }

            }
        );


    } catch (error) {

        console.error(
            "AUTH_HEADER_ERROR:",
            error
        );


        /*
         * اگر ارتباط قطع شد،
         * اطلاعات فعلی پاک نمی‌شود.
         *
         * فقط دفعه بعدی دوباره تلاش می‌کنیم.
         */

    }

}


/* =========================
   INITIALIZE AUTH + LIVE UPDATE
========================= */

function initializeAuthHeader() {

    /*
     * اگر Timer قبلی وجود دارد،
     * پاکش کن تا چند Timer همزمان ساخته نشود.
     */

    if (
        vexonPlayerUpdateTimer
    ) {

        clearInterval(
            vexonPlayerUpdateTimer
        );

    }


    /*
     * اولین بار فوراً اطلاعات را بگیر.
     */

    updateAuthHeader();


    /*
     * هر 10 ثانیه
     */

    vexonPlayerUpdateTimer =
        setInterval(
            () => {

                updateAuthHeader();

            },
            10000
        );


    /*
     * وقتی کاربر دوباره به تب برمی‌گردد،
     * همان لحظه اطلاعات جدید را بگیر.
     */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                updateAuthHeader();

            }

        }
    );


    /*
     * وقتی Window دوباره Focus می‌شود.
     */

    window.addEventListener(
        "focus",
        () => {

            updateAuthHeader();

        }
    );

}


/* =========================
   GUEST HEADER
========================= */

function setGuestHeader(
    headerProfiles
) {

    headerProfiles.forEach(
        (headerProfile) => {

            headerProfile.href =
                "sections/login.html";


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


            if (strong) {

                strong.textContent =
                    "ورود / ثبت‌نام";

            }


            if (span) {

                span.textContent =
                    "ورود به حساب";


                span.classList.remove(
                    "header-player-stats"
                );

            }


            if (xpBar) {

                xpBar.style.display =
                    "none";

            }


            if (xpFill) {

                xpFill.style.width =
                    "0%";

            }

        }
    );

}


/* =========================
   NAVIGATION
========================= */

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
        (item) => {

            item.addEventListener(
                "click",
                () => {

                    mobileNavItems.forEach(
                        (nav) => {

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
        (link) => {

            link.addEventListener(
                "click",
                () => {

                    desktopNavLinks.forEach(
                        (nav) => {

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


    if (!sections.length) {

        return;

    }


    const sectionObserver =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(
                    (entry) => {

                        if (
                            !entry.isIntersecting
                        ) {

                            return;

                        }


                        const id =
                            entry.target.id;


                        desktopNavLinks.forEach(
                            (link) => {

                                const href =
                                    link.getAttribute(
                                        "href"
                                    );


                                link.classList.toggle(
                                    "active",
                                    href === `#${id}`
                                );

                            }
                        );


                        mobileNavItems.forEach(
                            (item) => {

                                const href =
                                    item.getAttribute(
                                        "href"
                                    );


                                item.classList.toggle(
                                    "active",

                                    href === `#${id}` ||

                                    (
                                        id ===
                                        "games-all" &&
                                        href === "#games"
                                    )
                                );

                            }
                        );

                    }
                );

            },
            {
                threshold: 0.2,

                rootMargin:
                    "-20% 0px -55% 0px"
            }
        );


    sections.forEach(
        (section) => {

            sectionObserver.observe(
                section
            );

        }
    );

}


/* =========================
   SCROLL REVEAL
========================= */

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
        (element) => {

            element.classList.add(
                "reveal"
            );

        }
    );


    if (!revealElements.length) {

        return;

    }


    const revealObserver =
        new IntersectionObserver(
            (entries, observer) => {

                entries.forEach(
                    (entry) => {

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
                threshold: 0.12
            }
        );


    revealElements.forEach(
        (element) => {

            revealObserver.observe(
                element
            );

        }
    );

}


/* =========================
   SMOOTH NAVIGATION
========================= */

function initializeSmoothNavigation() {

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach(
            (link) => {

                link.addEventListener(
                    "click",
                    (event) => {

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


                        if (!target) {

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


/* =========================
   BUTTON PRESS
========================= */

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
            (button) => {

                button.addEventListener(
                    "mousedown",
                    () => {

                        button.style.transform =
                            "scale(0.97)";

                    }
                );


                button.addEventListener(
                    "mouseup",
                    () => {

                        button.style.transform =
                            "";

                    }
                );


                button.addEventListener(
                    "mouseleave",
                    () => {

                        button.style.transform =
                            "";

                    }
                );

            }
        );

}


/* =========================
   PARALLAX
========================= */

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
        !heroV
    ) {

        return;

    }


    window.addEventListener(
        "mousemove",
        (event) => {

            if (
                window.innerWidth <= 850
            ) {

                return;

            }


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


            heroV.style.transform =
                `translate(${x}px, ${y}px)`;

        }
    );


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth <= 850
            ) {

                heroV.style.transform =
                    "";

            }

        }
    );

}


/* =========================
   START VEXON
========================= */

loadVexon();