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


    const loadedSections = await Promise.all(
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

}


/* =========================
   NAVIGATION
========================= */

function initializeNavigation() {

    const desktopNavLinks =
        document.querySelectorAll(".nav-link");

    const mobileNavItems =
        document.querySelectorAll(".mobile-nav-item");


    mobileNavItems.forEach((item) => {

        item.addEventListener("click", () => {

            mobileNavItems.forEach((nav) => {
                nav.classList.remove("active");
            });

            item.classList.add("active");

        });

    });


    desktopNavLinks.forEach((link) => {

        link.addEventListener("click", () => {

            desktopNavLinks.forEach((nav) => {
                nav.classList.remove("active");
            });

            link.classList.add("active");

        });

    });


    const sections =
        document.querySelectorAll(
            "main section[id]"
        );


    const sectionObserver =
        new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (!entry.isIntersecting) {
                        return;
                    }


                    const id =
                        entry.target.id;


                    desktopNavLinks.forEach((link) => {

                        const href =
                            link.getAttribute("href");

                        link.classList.toggle(
                            "active",
                            href === `#${id}`
                        );

                    });


                    mobileNavItems.forEach((item) => {

                        const href =
                            item.getAttribute("href");

                        item.classList.toggle(
                            "active",
                            href === `#${id}` ||
                            (
                                id === "games-all" &&
                                href === "#games"
                            )
                        );

                    });

                });

            },
            {
                threshold: 0.2,
                rootMargin:
                    "-20% 0px -55% 0px"
            }
        );


    sections.forEach((section) => {

        sectionObserver.observe(section);

    });

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


    revealElements.forEach((element) => {

        element.classList.add("reveal");

    });


    const revealObserver =
        new IntersectionObserver(
            (entries, observer) => {

                entries.forEach((entry) => {

                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add(
                        "visible"
                    );

                    observer.unobserve(
                        entry.target
                    );

                });

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach((element) => {

        revealObserver.observe(element);

    });

}


/* =========================
   SMOOTH NAVIGATION
========================= */

function initializeSmoothNavigation() {

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach((link) => {

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

        });

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
        .forEach((button) => {

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

                    button.style.transform = "";

                }
            );


            button.addEventListener(
                "mouseleave",
                () => {

                    button.style.transform = "";

                }
            );

        });

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


    if (!heroVisual || !heroV) {
        return;
    }


    window.addEventListener(
        "mousemove",
        (event) => {

            if (window.innerWidth <= 850) {
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
                window.innerWidth <= 850 &&
                heroV
            ) {

                heroV.style.transform = "";

            }

        }
    );

}


/* =========================
   START VEXON
========================= */

loadVexon();


```js
/* =========================================
   VEXON AUTH HEADER
========================================= */

(async function updateAuthHeader() {
    const headerProfile =
        document.querySelector(".header-profile");

    if (!headerProfile) {
        return;
    }

    try {
        const response = await fetch("/api/me", {
            method: "GET",
            credentials: "same-origin"
        });

        const data = await response.json();

        if (response.ok && data.loggedIn && data.user) {

            // Logged in
            headerProfile.href = "profile.html";

            const strong =
                headerProfile.querySelector("strong");

            const span =
                headerProfile.querySelector("span");

            if (strong) {
                strong.textContent = "پروفایل";
            }

            if (span) {
                span.textContent =
                    data.user.username;
            }

        } else {

            // Guest
            headerProfile.href = "login.html";

            const strong =
                headerProfile.querySelector("strong");

            const span =
                headerProfile.querySelector("span");

            if (strong) {
                strong.textContent =
                    "ورود / ثبت‌نام";
            }

            if (span) {
                span.textContent =
                    "ورود به حساب";
            }
        }

    } catch (error) {

        console.error(
            "AUTH_HEADER_ERROR",
            error
        );

        // Fallback for guests
        headerProfile.href = "login.html";

        const strong =
            headerProfile.querySelector("strong");

        const span =
            headerProfile.querySelector("span");

        if (strong) {
            strong.textContent =
                "ورود / ثبت‌نام";
        }

        if (span) {
            span.textContent =
                "ورود به حساب";
        }
    }
})();
```


/* =========================================
   VEXON HEADER PLAYER STATS
========================================= */

(async function updateHeaderPlayerStats() {
    const headerProfile =
        document.querySelector(".header-profile");

    if (!headerProfile) {
        return;
    }

    const strong =
        headerProfile.querySelector("strong");

    const span =
        headerProfile.querySelector("span");

    try {
        const response = await fetch("/api/me", {
            method: "GET",
            credentials: "same-origin"
        });

        const data = await response.json();

        if (
            response.ok &&
            data.loggedIn &&
            data.user
        ) {
            const user = data.user;

            headerProfile.href = "profile.html";

            if (strong) {
                strong.textContent =
                    user.username;
            }

            if (span) {
                span.textContent =
                    `LV ${user.level} • XP ${user.xp} • 🪙 ${user.coins}`;

                span.classList.add(
                    "header-player-stats"
                );
            }

        } else {
            setGuestHeader();
        }

    } catch (error) {
        console.error(
            "HEADER_STATS_ERROR:",
            error
        );

        setGuestHeader();
    }


    function setGuestHeader() {
        headerProfile.href = "login.html";

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
})();
