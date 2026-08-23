/* =========================
   VEXON PAGE LOADER
========================= */

const app = document.querySelector("#app");


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

    if (!app) {
        console.error(
            "VEXON: #app پیدا نشد."
        );

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


    /*
        News is currently inside
        the games section.
    */


    initializeVexon();

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

    /*
     * مهم:
     * هدر بعد از loadVexon ساخته شده،
     * بنابراین Auth باید اینجا اجرا شود.
     */
    initializeAuthHeader();

}


/* =========================
   AUTH HEADER
========================= */

async function initializeAuthHeader() {

    const headerProfiles =
        document.querySelectorAll(
            ".header-profile"
        );


    /*
     * اگر چند بخش شامل هدر بودند،
     * همه را آپدیت می‌کنیم.
     */

    if (!headerProfiles.length) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/me",
                {
                    method: "GET",
                    credentials:
                        "same-origin",
                    cache: "no-store"
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = null;

        }


        /*
         * =========================
         * USER LOGGED IN
         * =========================
         */

        if (
            response.ok &&
            data?.loggedIn &&
            data?.user
        ) {

            const user =
                data.user;


            headerProfiles.forEach(
                (headerProfile) => {

                    /*
                     * چون این Header
                     * داخل sections قرار دارد،
                     * از همان فایل فعلی استفاده می‌کنیم.
                     */

                    headerProfile.href =
                        "profile.html";


                    const strong =
                        headerProfile.querySelector(
                            "strong"
                        );


                    const span =
                        headerProfile.querySelector(
                            "span"
                        );


                    /*
                     * نام کاربری
                     */

                    if (strong) {

                        strong.textContent =
                            user.username ||
                            "بازیکن VEXON";

                    }


                    /*
                     * آمار بازیکن
                     *
                     * اگر API اطلاعات واقعی
                     * Render/Supabase را برگرداند،
                     * همین‌جا نمایش داده می‌شود.
                     */

                    if (span) {

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


                        span.textContent =
                            `LV ${level} • XP ${xp} • 🪙 ${coins}`;


                        span.classList.add(
                            "header-player-stats"
                        );

                    }

                }
            );


            return;

        }


        /*
         * =========================
         * GUEST
         * =========================
         */

        setGuestHeader(
            headerProfiles
        );


    } catch (error) {

        console.error(
            "AUTH_HEADER_ERROR:",
            error
        );


        setGuestHeader(
            headerProfiles
        );

    }

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
                "login.html";


            const strong =
                headerProfile.querySelector(
                    "strong"
                );


            const span =
                headerProfile.querySelector(
                    "span"
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
                            behavior: "smooth",
                            block: "start"
                        });

                    }
                );

            }
        );

}


/* =========================
   BUTTON PRESS EFFECT
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
                &&
                heroV
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