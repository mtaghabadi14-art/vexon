(function () {
    "use strict";

    const items = [
        ["index.html", "P", "خانه"],
        ["sections/games.html", "🎮", "بازی‌ها"],
        ["sections/leaderboard.html", "🏆", "لیدربورد"],
        ["sections/cafe.html", "☕", "کافه بازی"],
        ["sections/news.html", "📢", "اخبار"],
        ["sections/guide.html", "❓", "راهنما"],
        ["sections/creators.html", "👨‍💻", "سازندگان"],
        ["sections/messenger.html", "💬", "پیام‌رسان"],
        ["sections/friends.html", "👥", "دوستان"]
    ];

    function insideSections() {
        return location.pathname.includes("/sections/");
    }

    function resolveUrl(href) {
        if (insideSections()) {
            return href.startsWith("sections/")
                ? href.slice("sections/".length)
                : `../${href}`;
        }
        return href;
    }

    function isActive(href) {
        const path = location.pathname.replace(/\\/g, "/");
        if (href === "index.html") {
            return path.endsWith("/") || path.endsWith("/index.html");
        }
        const clean = href.replace(/^sections\//, "");
        return path.endsWith(`/${clean}`) || path.endsWith(`/${href}`);
    }

    function addStyles() {
        if (document.getElementById("pgame-menu-styles")) return;

        const style = document.createElement("style");
        style.id = "pgame-menu-styles";
        style.textContent = `
            .navbar {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .navbar > .logo {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                z-index: 20;
                font-family: "Orbitron", sans-serif;
                font-weight: 900;
                letter-spacing: 0 !important;
                text-transform: none;
                white-space: nowrap;
            }

            .navbar > .header-profile {
                position: absolute;
                right: 18px;
                left: auto;
                top: 50%;
                transform: translateY(-50%);
                z-index: 20;
                margin: 0;
            }

            .vexon-global-menu-trigger {
                position: absolute !important;
                left: 18px;
                right: auto !important;
                top: 50%;
                transform: translateY(-50%);
                z-index: 25;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: 1px solid rgba(255,255,255,.07);
                border-radius: 12px;
                background: rgba(255,255,255,.04);
                color: #fff;
                font: inherit;
                font-size: 21px;
                line-height: 1;
                cursor: pointer;
                transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
            }

            .vexon-global-menu-trigger:hover {
                background: rgba(116,77,255,.10);
                border-color: rgba(116,77,255,.30);
                box-shadow: 0 0 18px rgba(116,77,255,.10);
            }

            .logo-p {
                color: #9b6cff !important;
                text-shadow: 0 0 9px rgba(155,108,255,.75), 0 0 20px rgba(116,77,255,.42);
            }

            .logo-rest {
                color: #fff !important;
            }

            .navbar .nav-links {
                display: none !important;
            }

            .pgame-menu-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                visibility: hidden;
                opacity: 0;
                pointer-events: none;
                background: rgba(0,0,0,.58);
                transition: opacity .24s ease, visibility .24s ease;
            }

            .pgame-menu-overlay.open {
                visibility: visible;
                opacity: 1;
                pointer-events: auto;
            }

            .pgame-menu-drawer {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                width: min(300px, 82vw);
                display: flex;
                flex-direction: column;
                padding: 16px 12px 14px;
                background: rgba(6,10,18,.99);
                border-right: 1px solid rgba(116,77,255,.16);
                box-shadow: 18px 0 55px rgba(0,0,0,.45);
                transform: translateX(-100%);
                transition: transform .28s cubic-bezier(.22,.8,.24,1);
            }

            .pgame-menu-overlay.open .pgame-menu-drawer {
                transform: translateX(0);
            }

            .pgame-menu-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 3px 5px 13px;
                margin-bottom: 6px;
                border-bottom: 1px solid rgba(255,255,255,.06);
            }

            .pgame-menu-brand {
                font: 900 19px "Orbitron", sans-serif;
                letter-spacing: 0;
            }

            .pgame-menu-brand .p {
                color: #9b6cff;
                text-shadow: 0 0 10px rgba(116,77,255,.55);
            }

            .pgame-menu-brand .rest {
                color: #fff;
            }

            .pgame-menu-subtitle {
                margin-top: 3px;
                color: #6f7084;
                font-size: 8px;
            }

            .pgame-menu-close {
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: 0;
                border-radius: 10px;
                background: rgba(255,255,255,.05);
                color: #fff;
                font-size: 19px;
                cursor: pointer;
            }

            .pgame-menu-links {
                display: grid;
                gap: 4px;
                overflow-y: auto;
                padding: 2px 0;
            }

            .pgame-menu-links a {
                width: 100%;
                min-height: 38px;
                display: flex;
                align-items: center;
                gap: 9px;
                padding: 6px 8px;
                box-sizing: border-box;
                border: 1px solid transparent;
                border-radius: 10px;
                background: rgba(255,255,255,.022);
                color: #fff;
                text-decoration: none;
                font-size: 10px;
                transition: background .18s ease, border-color .18s ease, transform .18s ease;
            }

            .pgame-menu-links a:hover {
                transform: translateX(2px);
                background: rgba(116,77,255,.06);
                border-color: rgba(116,77,255,.28);
            }

            .pgame-menu-links a.active {
                background: rgba(116,77,255,.07);
            }

            .pgame-menu-icon {
                width: 28px;
                height: 28px;
                flex: 0 0 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                background: rgba(255,255,255,.035);
                font-size: 13px;
            }

            .pgame-menu-title {
                flex: 1;
                text-align: right;
            }

            .pgame-menu-arrow {
                flex: 0 0 auto;
                color: rgba(255,255,255,.45);
                font-size: 15px;
                line-height: 1;
            }

            .pgame-menu-footer {
                margin-top: auto;
                padding: 11px 5px 2px;
                border-top: 1px solid rgba(255,255,255,.06);
                text-align: center;
                color: #6c6d80;
                font-size: 8px;
                line-height: 1.9;
            }

            @media (max-width: 900px) {
                .navbar {
                    min-height: 64px;
                    padding-left: 60px !important;
                    padding-right: 145px !important;
                }

                .navbar > .header-profile {
                    right: 10px;
                    min-width: 118px;
                }

                .vexon-global-menu-trigger {
                    left: 10px;
                    width: 42px;
                    height: 42px;
                }

                .navbar > .logo {
                    font-size: 20px;
                }
            }

            @media (max-width: 520px) {
                .navbar {
                    padding-right: 118px !important;
                }

                .navbar > .header-profile {
                    min-width: 105px;
                    padding: 7px 8px;
                    gap: 6px;
                }

                .navbar > .header-profile-icon {
                    width: 34px;
                    height: 34px;
                }

                .navbar > .logo {
                    font-size: 18px;
                }

                .pgame-menu-drawer {
                    width: min(285px, 82vw);
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createTrigger() {
        let trigger = document.getElementById("vexon-menu-trigger");
        if (trigger) return trigger;

        const navbar = document.querySelector(".navbar");
        if (!navbar) return null;

        trigger = document.createElement("button");
        trigger.type = "button";
        trigger.id = "vexon-menu-trigger";
        trigger.className = "vexon-global-menu-trigger";
        trigger.textContent = "☰";
        trigger.setAttribute("aria-label", "باز کردن منوی PGame");
        trigger.title = "منوی PGame";
        navbar.insertBefore(trigger, navbar.firstChild);
        return trigger;
    }

    function buildMenu(trigger) {
        if (!trigger || document.getElementById("pgame-global-menu")) return;

        const overlay = document.createElement("div");
        overlay.id = "pgame-global-menu";
        overlay.className = "pgame-menu-overlay";
        overlay.setAttribute("aria-hidden", "true");

        const drawer = document.createElement("aside");
        drawer.className = "pgame-menu-drawer";

        const head = document.createElement("div");
        head.className = "pgame-menu-head";
        head.innerHTML = `
            <div>
                <div class="pgame-menu-brand">
                    <span class="p">P</span><span class="rest">Game</span>
                </div>
                <div class="pgame-menu-subtitle">PLAY • COMPETE • LEVEL UP.</div>
            </div>
            <button type="button" class="pgame-menu-close" aria-label="بستن منو">×</button>
        `;

        const links = document.createElement("nav");
        links.className = "pgame-menu-links";

        items.forEach(([href, icon, title]) => {
            const link = document.createElement("a");
            link.href = resolveUrl(href);
            if (isActive(href)) link.classList.add("active");

            const iconEl = document.createElement("span");
            iconEl.className = "pgame-menu-icon";
            iconEl.textContent = icon;

            const titleEl = document.createElement("span");
            titleEl.className = "pgame-menu-title";
            titleEl.textContent = title;

            const arrow = document.createElement("span");
            arrow.className = "pgame-menu-arrow";
            arrow.textContent = ">";

            link.append(iconEl, titleEl, arrow);
            links.appendChild(link);
        });

        const footer = document.createElement("div");
        footer.className = "pgame-menu-footer";
        footer.innerHTML = `PLAY • COMPETE • LEVEL UP.<br>© 2026 PGame`;

        drawer.append(head, links, footer);
        overlay.appendChild(drawer);
        document.body.appendChild(overlay);

        const closeButton = head.querySelector(".pgame-menu-close");

        function openMenu() {
            overlay.classList.add("open");
            overlay.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        }

        function closeMenu() {
            overlay.classList.remove("open");
            overlay.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        trigger.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openMenu();
        });

        closeButton.addEventListener("click", closeMenu);

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) closeMenu();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeMenu();
        });
    }

    function build() {
        addStyles();
        const trigger = createTrigger();
        buildMenu(trigger);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }
})();
