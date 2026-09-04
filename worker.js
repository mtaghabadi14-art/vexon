const PASSWORD_ITERATIONS = 100000;
const SESSION_DAYS = 7;
const RUBIKA_CODE_MINUTES = 10;

const ALLOWED_BAN_TYPES = new Set([
    "full",
    "messages",
    "reactions"
]);

const ALLOWED_REACTIONS = new Set([
    "like",
    "love",
    "laugh",
    "wow",
    "angry",
    "dislike"
]);

/* =========================================================
   RESPONSE
========================================================= */

function json(data, status = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",
                "Cache-Control":
                    "no-store"
            }
        }
    );
}

/* =========================================================
   BASE64
========================================================= */

function b64(bytes) {
    let s = "";

    for (const b of bytes) {
        s += String.fromCharCode(b);
    }

    return btoa(s);
}

function unb64(value) {
    const s = atob(value);

    return Uint8Array.from(
        s,
        char => char.charCodeAt(0)
    );
}

/* =========================================================
   PASSWORD HASH
========================================================= */

async function hashPassword(password) {
    const salt =
        crypto.getRandomValues(
            new Uint8Array(16)
        );

    const key =
        await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );

    const bits =
        await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt,
                iterations: PASSWORD_ITERATIONS,
                hash: "SHA-256"
            },
            key,
            256
        );

    return [
        "pbkdf2",
        PASSWORD_ITERATIONS,
        b64(salt),
        b64(new Uint8Array(bits))
    ].join("$");
}

async function verifyPassword(password, stored) {
    try {
        const parts = stored.split("$");

        if (
            parts.length !== 4 ||
            parts[0] !== "pbkdf2"
        ) {
            return false;
        }

        const key =
            await crypto.subtle.importKey(
                "raw",
                new TextEncoder().encode(password),
                "PBKDF2",
                false,
                ["deriveBits"]
            );

        const expected =
            unb64(parts[3]);

        const bits =
            await crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt: unb64(parts[2]),
                    iterations: Number(parts[1]),
                    hash: "SHA-256"
                },
                key,
                expected.length * 8
            );

        const actual =
            new Uint8Array(bits);

        let diff = 0;

        for (
            let i = 0;
            i < actual.length;
            i++
        ) {
            diff |=
                actual[i] ^
                expected[i];
        }

        return diff === 0;

    } catch {
        return false;
    }
}

/* =========================================================
   SESSION
========================================================= */

function createSessionToken() {
    const bytes =
        crypto.getRandomValues(
            new Uint8Array(32)
        );

    return Array.from(
        bytes,
        byte =>
            byte
                .toString(16)
                .padStart(2, "0")
    ).join("");
}

async function hashToken(token) {
    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(token)
        );

    return Array.from(
        new Uint8Array(digest),
        byte =>
            byte
                .toString(16)
                .padStart(2, "0")
    ).join("");
}

function getCookie(request, name) {
    const header =
        request.headers.get("Cookie") || "";

    for (const item of header.split(";")) {
        const [
            key,
            ...value
        ] =
            item
                .trim()
                .split("=");

        if (key === name) {
            return (
                value.join("=") ||
                null
            );
        }
    }

    return null;
}

/* =========================================================
   XP
========================================================= */

function nextXp(level) {
    return (
        {
            1: 100,
            2: 250,
            3: 500,
            4: 800,
            5: 1200,
            6: 1700,
            7: 2500,
            8: 3500,
            9: 5000
        }[level] ??
        level * 700
    );
}

/* =========================================================
   ADMIN
========================================================= */

function adminName(env) {
    return typeof env.ADMIN_USERNAME === "string"
        ? env.ADMIN_USERNAME.trim()
        : "";
}

function isAdmin(user, env) {
    return Boolean(
        user &&
        adminName(env) &&
        user.username === adminName(env)
    );
}

/* =========================================================
   RUBIKA PLAYER
========================================================= */

async function renderPlayer(env, rubikaId) {

    if (!env.VEXON_RUBIKA_API_KEY) {
        return null;
    }

    try {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                1500
            );


        const response =
            await fetch(
                `https://bangame.onrender.com/vexon/player?rubika_user_id=${encodeURIComponent(
                    String(rubikaId)
                )}`,
                {
                    headers: {
                        "X-VEXON-API-KEY":
                            env.VEXON_RUBIKA_API_KEY
                    },

                    signal:
                        controller.signal
                }
            );


        clearTimeout(
            timeout
        );


        if (!response.ok) {
            return null;
        }


        const data =
            await response.json();


        return data?.success
            ? data.player
            : null;


    } catch {

        return null;

    }
}

/* =========================================================
   CURRENT USER
========================================================= */

async function getCurrentUser(request, env) {
    const token =
        getCookie(
            request,
            "vexon_session"
        );

    if (!token) {
        return null;
    }

    const tokenHash =
        await hashToken(token);

    const session =
        await env.DB
            .prepare(`
                SELECT
                    sessions.user_id,
                    users.username
                FROM sessions
                INNER JOIN users
                    ON users.id =
                       sessions.user_id
                WHERE
                    sessions.token_hash = ?1
                    AND sessions.expires_at >
                        datetime('now')
                LIMIT 1
            `)
            .bind(tokenHash)
            .first();

    if (!session) {
        return null;
    }

    const rubikaLink =
        await env.DB
            .prepare(`
                SELECT
                    rubika_sender_id,
                    rubika_chat_id
                FROM rubika_links
                WHERE user_id = ?1
                LIMIT 1
            `)
            .bind(session.user_id)
            .first();

    let xp = 0;
    let level = 1;
    let coins = 0;
    let nickname = null;
    let title = "🥉 تازه‌کار";
    let typingGames = 0;
    let typingBestTime = 0;
    let typingBestWpm = 0;
    let rubikaUserId = null;

    if (rubikaLink?.rubika_sender_id) {
        const player =
            await renderPlayer(
                env,
                rubikaLink.rubika_sender_id
            );

        if (player) {
            level =
                Number(
                    player.level ?? 1
                );

            xp =
                Number(
                    player.xp ?? 0
                );

            coins =
                Number(
                    player.coins ?? 0
                );

            nickname =
                player.nickname ?? null;

            title =
                player.title ?? title;

            typingGames =
                Number(
                    player.typing_games ?? 0
                );

            typingBestTime =
                Number(
                    player.typing_best_time ?? 0
                );

            typingBestWpm =
                Number(
                    player.typing_best_wpm ?? 0
                );

            rubikaUserId =
                String(
                    player.user_id ??
                    rubikaLink.rubika_sender_id
                );
        }
    }

    if (!rubikaUserId) {
        const stats =
            await env.DB
                .prepare(`
                    SELECT
                        xp,
                        level,
                        coins
                    FROM player_stats
                    WHERE user_id = ?1
                    LIMIT 1
                `)
                .bind(session.user_id)
                .first();

        xp =
            Number(
                stats?.xp ?? 0
            );

        level =
            Number(
                stats?.level ?? 1
            );

        coins =
            Number(
                stats?.coins ?? 0
            );
    }

    const requiredXp =
        Number(
            nextXp(level)
        );

    return {
        id: session.user_id,
        username: session.username,

        rubika_user_id:
            rubikaUserId,

        nickname,
        title,

        xp,
        level,

        next_xp:
            requiredXp,

        xp_progress:
            requiredXp
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        xp /
                        requiredXp *
                        100
                    )
                )
                : 0,

        coins,

        typing_games:
            typingGames,

        typing_best_time:
            typingBestTime,

        typing_best_wpm:
            typingBestWpm
    };
}

/* =========================================================
   BAN
========================================================= */

async function activeBan(userId, env) {
    return await env.DB
        .prepare(`
            SELECT
                id,
                reason,
                ban_type,
                banned_until,
                created_at
            FROM user_bans
            WHERE
                user_id = ?1
                AND active = 1
                AND (
                    banned_until IS NULL
                    OR banned_until = ''
                    OR banned_until >
                        CURRENT_TIMESTAMP
                )
            ORDER BY
                id DESC
            LIMIT 1
        `)
        .bind(userId)
        .first();
}

async function access(request, env) {
    const user =
        await getCurrentUser(
            request,
            env
        );

    if (!user) {
        return {
            ok: false,
            status: 401,
            user: null,
            ban: null
        };
    }

    const ban =
        await activeBan(
            user.id,
            env
        );

    return {
        ok:
            !(
                ban &&
                ban.ban_type === "full"
            ),

        status:
            ban &&
            ban.ban_type === "full"
                ? 403
                : 200,

        user,
        ban
    };
}

async function requireAdmin(request, env) {
    const user =
        await getCurrentUser(
            request,
            env
        );

    if (!user) {
        return {
            ok: false,
            status: 401,
            user: null
        };
    }

    if (!isAdmin(user, env)) {
        return {
            ok: false,
            status: 403,
            user
        };
    }

    return {
        ok: true,
        status: 200,
        user
    };
}

/* =========================================================
   NEWS TABLE
========================================================= */

async function ensureNews(env) {
    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                image_url TEXT,
                category TEXT DEFAULT 'general',
                status TEXT NOT NULL DEFAULT 'draft',
                author_username TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                published_at TEXT
            )
        `)
        .run();
}

/* =========================================================
   NEWS REACTIONS
========================================================= */

async function ensureNewsReactions(env) {
    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS news_reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                news_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                reaction TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(news_id, user_id),
                FOREIGN KEY(news_id)
                    REFERENCES news(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_news_reactions_news
            ON news_reactions(news_id)
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_news_reactions_user
            ON news_reactions(user_id)
        `)
        .run();
}

/* =========================================================
   POLLS
========================================================= */

async function ensurePolls(env) {
    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS polls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                author_username TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                published_at TEXT
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS poll_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                poll_id INTEGER NOT NULL,
                option_text TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(poll_id)
                    REFERENCES polls(id)
                    ON DELETE CASCADE
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS poll_votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                poll_id INTEGER NOT NULL,
                option_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(poll_id, user_id),
                FOREIGN KEY(poll_id)
                    REFERENCES polls(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(option_id)
                    REFERENCES poll_options(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_poll_options_poll
            ON poll_options(poll_id)
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_poll_votes_poll
            ON poll_votes(poll_id)
        `)
        .run();
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

async function ensureNotifications(env) {
    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                reference_id INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_at TEXT,
                FOREIGN KEY(user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_notifications_user
            ON notifications(user_id, id)
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_notifications_unread
            ON notifications(user_id, read_at)
        `)
        .run();
}

/* =========================================================
   FRIEND REQUESTS
========================================================= */

async function ensureFriendRequests(env) {
    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS friend_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requester_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                CHECK (
                    requester_id != receiver_id
                ),

                UNIQUE(
                    requester_id,
                    receiver_id
                ),

                FOREIGN KEY(requester_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE,

                FOREIGN KEY(receiver_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_friend_requests_receiver
            ON friend_requests(
                receiver_id,
                status
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_friend_requests_requester
            ON friend_requests(
                requester_id,
                status
            )
        `)
        .run();
}

/* =========================================================
   NOTIFICATION HELPERS
========================================================= */

async function notifyAllUsers(
    env,
    type,
    title,
    message,
    referenceId = null
) {
    await ensureNotifications(env);

    await env.DB
        .prepare(`
            INSERT INTO notifications(
                user_id,
                type,
                title,
                message,
                reference_id
            )
            SELECT
                id,
                ?1,
                ?2,
                ?3,
                ?4
            FROM users
        `)
        .bind(
            type,
            title,
            message,
            referenceId
        )
        .run();
}

async function notifyUser(
    env,
    userId,
    type,
    title,
    message,
    referenceId = null
) {
    await ensureNotifications(env);

    await env.DB
        .prepare(`
            INSERT INTO notifications(
                user_id,
                type,
                title,
                message,
                reference_id
            )
            VALUES(
                ?1,
                ?2,
                ?3,
                ?4,
                ?5
            )
        `)
        .bind(
            userId,
            type,
            title,
            message,
            referenceId
        )
        .run();
}

/* =========================================================
   MESSENGER TABLES
========================================================= */

async function ensureMessenger(env) {
    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS conversation_members (
                conversation_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                last_read_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(
                    conversation_id,
                    user_id
                ),
                FOREIGN KEY(conversation_id)
                    REFERENCES conversations(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                FOREIGN KEY(conversation_id)
                    REFERENCES conversations(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(sender_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_conversation_members_user
            ON conversation_members(user_id)
        `)
        .run();

    await env.DB
        .prepare(`
            CREATE INDEX IF NOT EXISTS
            idx_messages_conversation
            ON messages(
                conversation_id,
                id
            )
        `)
        .run();
}

/* =========================================================
   HELPERS
========================================================= */

function clean(value, maxLength) {
    return typeof value === "string"
        ? value
            .trim()
            .slice(0, maxLength)
        : "";
}

function banType(value) {
    return (
        typeof value === "string" &&
        ALLOWED_BAN_TYPES.has(
            value.trim()
        )
    )
        ? value.trim()
        : "full";
}

function banLabel(value) {
    if (value === "messages") {
        return "💬 محرومیت از پیام";
    }

    if (value === "reactions") {
        return "❤️ محرومیت از واکنش";
    }

    return "🚫 بن کامل سایت";
}

function leaderboardType(value) {
    return value === "coins"
        ? "coins"
        : "level";
}

function limitParam(
    value,
    max,
    defaultValue
) {
    const number =
        Number(
            value ?? defaultValue
        );

    return Math.min(
        max,
        Math.max(
            1,
            Number.isFinite(number)
                ? Math.floor(number)
                : defaultValue
        )
    );
}

/* =========================================================
   LEADERBOARD
========================================================= */

async function leaderboard(env) {
    const result =
        await env.DB
            .prepare(`
                SELECT
                    u.id,
                    u.username,

                    COALESCE(
                        ps.level,
                        1
                    ) AS level,

                    COALESCE(
                        ps.coins,
                        0
                    ) AS coins,

                    rl.rubika_sender_id

                FROM users u

                LEFT JOIN player_stats ps
                    ON ps.user_id = u.id

                LEFT JOIN rubika_links rl
                    ON rl.user_id = u.id

                ORDER BY
                    u.id ASC
            `)
            .all();

    return Promise.all(
        (
            result.results ?? []
        ).map(
            async player => {
                let level =
                    Number(
                        player.level ?? 1
                    );

                let coins =
                    Number(
                        player.coins ?? 0
                    );

                if (
                    player.rubika_sender_id
                ) {
                    const rubikaPlayer =
                        await renderPlayer(
                            env,
                            player.rubika_sender_id
                        );

                    if (rubikaPlayer) {
                        level =
                            Number(
                                rubikaPlayer.level ??
                                level
                            );

                        coins =
                            Number(
                                rubikaPlayer.coins ??
                                coins
                            );
                    }
                }

                return {
                    id:
                        player.id,

                    username:
                        player.username,

                    level,
                    coins
                };
            }
        )
    );
}

/* =========================================================
   MAIN WORKER
========================================================= */

export default {

    async fetch(request, env) {

        const url =
            new URL(
                request.url
            );

        const path =
            url.pathname;

        const method =
            request.method;

        try {

            /* =================================================
               REGISTER
            ================================================= */

            if (
                path === "/api/register" &&
                method === "POST"
            ) {
                const body =
                    await request.json();

                const username =
                    clean(
                        body.username,
                        20
                    );

                const password =
                    typeof body.password === "string"
                        ? body.password
                        : "";

                if (
                    !/^[A-Za-z0-9_]{3,20}$/.test(
                        username
                    )
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "نام کاربری باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، عدد یا _ باشد."
                        },
                        400
                    );
                }

                if (
                    password.length < 8
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "رمز عبور باید حداقل ۸ کاراکتر باشد."
                        },
                        400
                    );
                }

                const existing =
                    await env.DB
                        .prepare(`
                            SELECT id
                            FROM users
                            WHERE username = ?1
                            LIMIT 1
                        `)
                        .bind(username)
                        .first();

                if (existing) {
                    return json(
                        {
                            success: false,
                            message:
                                "این نام کاربری قبلاً ثبت شده است."
                        },
                        409
                    );
                }

                const inserted =
                    await env.DB
                        .prepare(`
                            INSERT INTO users(
                                username,
                                password_hash,
                                created_at
                            )
                            VALUES(
                                ?1,
                                ?2,
                                CURRENT_TIMESTAMP
                            )
                        `)
                        .bind(
                            username,
                            await hashPassword(password)
                        )
                        .run();

                const userId =
                    inserted.meta?.last_row_id;

                if (!userId) {
                    throw new Error(
                        "no user id"
                    );
                }

                await env.DB
                    .prepare(`
                        INSERT OR IGNORE INTO player_stats(
                            user_id,
                            xp,
                            level,
                            coins
                        )
                        VALUES(
                            ?1,
                            0,
                            1,
                            0
                        )
                    `)
                    .bind(userId)
                    .run();

                return json(
                    {
                        success: true,
                        message:
                            "حساب PGame با موفقیت ساخته شد."
                    },
                    201
                );
            }

            /* =================================================
               LOGIN
            ================================================= */

            if (
                path === "/api/login" &&
                method === "POST"
            ) {
                const body =
                    await request.json();

                const username =
                    clean(
                        body.username,
                        20
                    );

                const password =
                    typeof body.password === "string"
                        ? body.password
                        : "";

                const user =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                username,
                                password_hash
                            FROM users
                            WHERE username = ?1
                            LIMIT 1
                        `)
                        .bind(username)
                        .first();

                if (
                    !user ||
                    !(
                        await verifyPassword(
                            password,
                            user.password_hash
                        )
                    )
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "نام کاربری یا رمز عبور اشتباه است."
                        },
                        401
                    );
                }

                await env.DB
                    .prepare(`
                        INSERT OR IGNORE INTO player_stats(
                            user_id,
                            xp,
                            level,
                            coins
                        )
                        VALUES(
                            ?1,
                            0,
                            1,
                            0
                        )
                    `)
                    .bind(user.id)
                    .run();

                const token =
                    createSessionToken();

                const tokenHash =
                    await hashToken(
                        token
                    );

                const expires =
                    new Date(
                        Date.now() +
                        SESSION_DAYS *
                        86400000
                    ).toISOString();

                await env.DB
                    .prepare(`
                        INSERT INTO sessions(
                            user_id,
                            token_hash,
                            expires_at
                        )
                        VALUES(
                            ?1,
                            ?2,
                            ?3
                        )
                    `)
                    .bind(
                        user.id,
                        tokenHash,
                        expires
                    )
                    .run();

                return new Response(
                    JSON.stringify(
                        {
                            success: true,
                            message:
                                "ورود موفق بود.",
                            username:
                                user.username
                        }
                    ),
                    {
                        status: 200,

                        headers: {
                            "Content-Type":
                                "application/json; charset=UTF-8",

                            "Cache-Control":
                                "no-store",

                            "Set-Cookie":
                                `vexon_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`
                        }
                    }
                );
            }

            /* =================================================
               CURRENT USER
            ================================================= */

            if (
                path === "/api/me" &&
                method === "GET"
            ) {
                const user =
                    await getCurrentUser(
                        request,
                        env
                    );

                if (!user) {
                    return json(
                        {
                            loggedIn: false
                        },
                        401
                    );
                }

                const ban =
                    await activeBan(
                        user.id,
                        env
                    );

                return json({
                    loggedIn: true,

                    user: {
                        ...user,

                        banned:
                            Boolean(ban),

                        ban_type:
                            ban?.ban_type ?? null,

                        ban_reason:
                            ban?.reason ?? null,

                        banned_until:
                            ban?.banned_until ?? null
                    }
                });
            }


            /* =====================================================
   CHANGE PASSWORD
===================================================== */

if (
    url.pathname ===
        "/api/change-password" &&
    request.method ===
        "POST"
) {

    try {

        const user =
            await getCurrentUser(
                request,
                env
            );


        if (!user) {

            return json(
                {
                    success: false,
                    message:
                        "ابتدا وارد حساب PGame شو."
                },
                401
            );

        }


        const body =
            await request.json();


        const currentPassword =
            typeof body.current_password === "string"
                ? body.current_password
                : "";


        const newPassword =
            typeof body.new_password === "string"
                ? body.new_password
                : "";


        if (
            !currentPassword ||
            !newPassword
        ) {

            return json(
                {
                    success: false,
                    message:
                        "رمز فعلی و رمز جدید را وارد کن."
                },
                400
            );

        }


        if (
            newPassword.length < 8
        ) {

            return json(
                {
                    success: false,
                    message:
                        "رمز جدید باید حداقل ۸ کاراکتر باشد."
                },
                400
            );

        }


        if (
            currentPassword ===
            newPassword
        ) {

            return json(
                {
                    success: false,
                    message:
                        "رمز جدید باید با رمز فعلی متفاوت باشد."
                },
                400
            );

        }


        const account =
            await env.DB
                .prepare(`
                    SELECT
                        id,
                        password_hash
                    FROM users
                    WHERE id = ?1
                    LIMIT 1
                `)
                .bind(
                    user.id
                )
                .first();


        if (
            !account ||
            !account.password_hash
        ) {

            return json(
                {
                    success: false,
                    message:
                        "اطلاعات حساب پیدا نشد."
                },
                404
            );

        }


        const currentPasswordCorrect =
            await verifyPassword(
                currentPassword,
                account.password_hash
            );


        if (
            !currentPasswordCorrect
        ) {

            return json(
                {
                    success: false,
                    message:
                        "رمز فعلی اشتباه است."
                },
                401
            );

        }


        const newPasswordHash =
            await hashPassword(
                newPassword
            );


        await env.DB
            .prepare(`
                UPDATE users
                SET password_hash = ?1
                WHERE id = ?2
            `)
            .bind(
                newPasswordHash,
                user.id
            )
            .run();


        return json({
            success: true,
            message:
                "رمز عبور با موفقیت تغییر کرد."
        });


    } catch (error) {

        console.error(
            "CHANGE_PASSWORD_ERROR",
            error
        );


        return json(
            {
                success: false,
                message:
                    "تغییر رمز عبور انجام نشد."
            },
            500
        );

    }

}

            /* =================================================
               LOGOUT
            ================================================= */

            if (
                path === "/api/logout" &&
                method === "POST"
            ) {
                const token =
                    getCookie(
                        request,
                        "vexon_session"
                    );

                if (token) {
                    await env.DB
                        .prepare(`
                            DELETE FROM sessions
                            WHERE token_hash = ?1
                        `)
                        .bind(
                            await hashToken(token)
                        )
                        .run();
                }

                return new Response(
                    JSON.stringify({
                        success: true
                    }),
                    {
                        headers: {
                            "Content-Type":
                                "application/json; charset=UTF-8",

                            "Cache-Control":
                                "no-store",

                            "Set-Cookie":
                                "vexon_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
                        }
                    }
                );
            }

            /* =================================================
               COMMUNITY STATS
            ================================================= */

            if (
                path === "/api/community/stats" &&
                method === "GET"
            ) {
                const total =
                    await env.DB
                        .prepare(`
                            SELECT
                                COUNT(*) AS total_users
                            FROM users
                        `)
                        .first();

                const today =
                    await env.DB
                        .prepare(`
                            SELECT
                                COUNT(*) AS today_users
                            FROM users
                            WHERE date(created_at) =
                                  date('now')
                        `)
                        .first();

                return json({
                    success: true,

                    total_users:
                        Number(
                            total?.total_users ?? 0
                        ),

                    today_users:
                        Number(
                            today?.today_users ?? 0
                        )
                });
            }

            /* =================================================
               LEADERBOARD
            ================================================= */

            if (
                path === "/api/leaderboard" &&
                method === "GET"
            ) {
                const type =
                    leaderboardType(
                        url.searchParams.get(
                            "type"
                        )
                    );

                const limit =
                    limitParam(
                        url.searchParams.get(
                            "limit"
                        ),
                        100,
                        50
                    );

                const players =
                    await leaderboard(env);

                players.sort(
                    (a, b) => {
                        if (
                            type === "coins"
                        ) {
                            return (
                                b.coins -
                                a.coins
                            )
                            ||
                            (
                                b.level -
                                a.level
                            )
                            ||
                            (
                                a.id -
                                b.id
                            );
                        }

                        return (
                            b.level -
                            a.level
                        )
                        ||
                        (
                            b.coins -
                            a.coins
                        )
                        ||
                        (
                            a.id -
                            b.id
                        );
                    }
                );

                return json({
                    success: true,
                    type,

                    leaderboard:
                        players
                            .slice(
                                0,
                                limit
                            )
                            .map(
                                (
                                    player,
                                    index
                                ) => ({
                                    rank:
                                        index + 1,

                                    id:
                                        player.id,

                                    username:
                                        player.username,

                                    ...(type === "coins"
                                        ? {
                                            coins:
                                                player.coins
                                        }
                                        : {
                                            level:
                                                player.level
                                        })
                                })
                            )
                });
            }

            /* =================================================
               ADMIN ME
            ================================================= */

            if (
                path === "/api/admin/me" &&
                method === "GET"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            isAdmin: false
                        },
                        admin.status
                    );
                }

                return json({
                    success: true,
                    isAdmin: true,
                    username:
                        admin.user.username
                });
            }

            /* =================================================
               FRIENDS — SEARCH
            ================================================= */

            if (
                path === "/api/friends/search" &&
                method === "GET"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب شوید."
                        },
                        accessResult.status
                    );
                }

                await ensureFriendRequests(env);

                const query =
                    clean(
                        url.searchParams.get("q") || "",
                        40
                    ).toLowerCase();

                if (
                    query.length < 2
                ) {
                    return json({
                        success: true,
                        users: []
                    });
                }

                const users =
                    await env.DB
                        .prepare(`
                            SELECT
                                u.id,
                                u.username,

                                CASE

                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM friend_requests fr
                                        WHERE
                                            (
                                                (
                                                    fr.requester_id = ?1
                                                    AND
                                                    fr.receiver_id = u.id
                                                )
                                                OR
                                                (
                                                    fr.requester_id = u.id
                                                    AND
                                                    fr.receiver_id = ?1
                                                )
                                            )
                                            AND
                                            fr.status = 'accepted'
                                    )
                                    THEN 'friend'

                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM friend_requests fr
                                        WHERE
                                            fr.requester_id = ?1
                                            AND
                                            fr.receiver_id = u.id
                                            AND
                                            fr.status = 'pending'
                                    )
                                    THEN 'outgoing'

                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM friend_requests fr
                                        WHERE
                                            fr.requester_id = u.id
                                            AND
                                            fr.receiver_id = ?1
                                            AND
                                            fr.status = 'pending'
                                    )
                                    THEN 'incoming'

                                    ELSE 'none'

                                END AS relation

                            FROM users u

                            WHERE
                                u.id != ?1

                                AND LOWER(
                                    u.username
                                ) LIKE ?2

                            ORDER BY
                                LOWER(
                                    u.username
                                ) ASC

                            LIMIT 30
                        `)
                        .bind(
                            accessResult.user.id,
                            `%${query}%`
                        )
                        .all();

                return json({
                    success: true,

                    users:
                        users.results ?? []
                });
            }

            /* =================================================
               FRIENDS — SEND REQUEST
            ================================================= */

            if (
                path === "/api/friends/request" &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب شوید."
                        },
                        accessResult.status
                    );
                }

                await ensureFriendRequests(env);

                let body = {};

                try {
                    body =
                        await request.json();

                } catch {
                    return json(
                        {
                            success: false,
                            message:
                                "داده درخواست نامعتبر است."
                        },
                        400
                    );
                }

                const targetUserId =
                    Number(body.user_id);

                if (
                    !Number.isInteger(
                        targetUserId
                    ) ||
                    targetUserId <= 0
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "کاربر نامعتبر است."
                        },
                        400
                    );
                }

                if (
                    targetUserId ===
                    accessResult.user.id
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "نمی‌توانی خودت را به دوستانت اضافه کنی."
                        },
                        400
                    );
                }

                const targetUser =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                username
                            FROM users
                            WHERE id = ?1
                            LIMIT 1
                        `)
                        .bind(targetUserId)
                        .first();

                if (!targetUser) {
                    return json(
                        {
                            success: false,
                            message:
                                "این کاربر پیدا نشد."
                        },
                        404
                    );
                }

                const existing =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                requester_id,
                                receiver_id,
                                status
                            FROM friend_requests
                            WHERE
                                (
                                    requester_id = ?1
                                    AND
                                    receiver_id = ?2
                                )
                                OR
                                (
                                    requester_id = ?2
                                    AND
                                    receiver_id = ?1
                                )
                            ORDER BY
                                id DESC
                            LIMIT 1
                        `)
                        .bind(
                            accessResult.user.id,
                            targetUserId
                        )
                        .first();

                if (
                    existing?.status ===
                    "accepted"
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "این کاربر از قبل دوستت است."
                        },
                        409
                    );
                }

                if (
                    existing?.status ===
                    "pending"
                ) {
                    if (
                        Number(
                            existing.requester_id
                        ) ===
                        Number(
                            accessResult.user.id
                        )
                    ) {
                        return json(
                            {
                                success: false,
                                message:
                                    "درخواست دوستی قبلاً ارسال شده."
                            },
                            409
                        );
                    }

                    return json(
                        {
                            success: false,
                            message:
                                "این کاربر قبلاً برای تو درخواست فرستاده است."
                        },
                        409
                    );
                }

                let requestId = null;

                if (existing) {
                    await env.DB
                        .prepare(`
                            UPDATE friend_requests

                            SET
                                requester_id = ?1,
                                receiver_id = ?2,
                                status = 'pending',
                                updated_at =
                                    CURRENT_TIMESTAMP
                            WHERE id = ?3
                        `)
                        .bind(
                            accessResult.user.id,
                            targetUserId,
                            existing.id
                        )
                        .run();

                    requestId =
                        existing.id;

                } else {
                    const inserted =
                        await env.DB
                            .prepare(`
                                INSERT INTO friend_requests(
                                    requester_id,
                                    receiver_id,
                                    status
                                )
                                VALUES(
                                    ?1,
                                    ?2,
                                    'pending'
                                )
                            `)
                            .bind(
                                accessResult.user.id,
                                targetUserId
                            )
                            .run();

                    requestId =
                        inserted.meta?.last_row_id ??
                        null;
                }

                await notifyUser(
                    env,
                    targetUserId,
                    "friend_request",
                    "👥 درخواست دوستی جدید",
                    `${accessResult.user.username} برایت درخواست دوستی فرستاد.`,
                    requestId
                );

                return json({
                    success: true,

                    message:
                        "✅ درخواست دوستی ارسال شد.",

                    request_id:
                        requestId,

                    user: {
                        id:
                            targetUser.id,

                        username:
                            targetUser.username
                    }
                });
            }

            /* =================================================
               FRIENDS — STATUS
            ================================================= */

            if (
                path === "/api/friends/status" &&
                method === "GET"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب شوید."
                        },
                        accessResult.status
                    );
                }

                await ensureFriendRequests(env);

                const userId =
                    accessResult.user.id;

                const friendsResult =
                    await env.DB
                        .prepare(`
                            SELECT
                                u.id,
                                u.username,
                                fr.updated_at,

                                CASE
                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM sessions s
                                        WHERE
                                            s.user_id = u.id
                                            AND
                                            s.expires_at >
                                                CURRENT_TIMESTAMP
                                    )
                                    THEN 1
                                    ELSE 0
                                END AS online

                            FROM friend_requests fr

                            INNER JOIN users u
                                ON u.id =
                                    CASE
                                        WHEN
                                            fr.requester_id = ?1
                                        THEN
                                            fr.receiver_id
                                        ELSE
                                            fr.requester_id
                                    END

                            WHERE
                                (
                                    fr.requester_id = ?1
                                    OR
                                    fr.receiver_id = ?1
                                )

                                AND
                                fr.status = 'accepted'

                            ORDER BY
                                online DESC,
                                LOWER(
                                    u.username
                                ) ASC
                        `)
                        .bind(userId)
                        .all();

                const incomingResult =
                    await env.DB
                        .prepare(`
                            SELECT
                                fr.id,
                                fr.created_at,

                                u.id AS user_id,
                                u.username,

                                CASE
                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM sessions s
                                        WHERE
                                            s.user_id = u.id
                                            AND
                                            s.expires_at >
                                                CURRENT_TIMESTAMP
                                    )
                                    THEN 1
                                    ELSE 0
                                END AS online

                            FROM friend_requests fr

                            INNER JOIN users u
                                ON u.id =
                                    fr.requester_id

                            WHERE
                                fr.receiver_id = ?1
                                AND
                                fr.status = 'pending'

                            ORDER BY
                                fr.id DESC
                        `)
                        .bind(userId)
                        .all();

                const outgoingResult =
                    await env.DB
                        .prepare(`
                            SELECT
                                fr.id,
                                fr.created_at,

                                u.id AS user_id,
                                u.username,

                                CASE
                                    WHEN EXISTS (
                                        SELECT 1
                                        FROM sessions s
                                        WHERE
                                            s.user_id = u.id
                                            AND
                                            s.expires_at >
                                                CURRENT_TIMESTAMP
                                    )
                                    THEN 1
                                    ELSE 0
                                END AS online

                            FROM friend_requests fr

                            INNER JOIN users u
                                ON u.id =
                                    fr.receiver_id

                            WHERE
                                fr.requester_id = ?1
                                AND
                                fr.status = 'pending'

                            ORDER BY
                                fr.id DESC
                        `)
                        .bind(userId)
                        .all();

                return json({
                    success: true,

                    friends:
                        friendsResult.results ?? [],

                    incoming:
                        incomingResult.results ?? [],

                    outgoing:
                        outgoingResult.results ?? []
                });
            }

            /* =================================================
               FRIENDS — ACCEPT / REJECT
            ================================================= */

            if (
                path === "/api/friends/respond" &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب شوید."
                        },
                        accessResult.status
                    );
                }

                await ensureFriendRequests(env);

                let body = {};

                try {
                    body =
                        await request.json();

                } catch {
                    return json(
                        {
                            success: false,
                            message:
                                "داده درخواست نامعتبر است."
                        },
                        400
                    );
                }

                const requestId =
                    Number(
                        body.request_id
                    );

                const action =
                    typeof body.action === "string"
                        ? body.action
                            .trim()
                            .toLowerCase()
                        : "";

                if (
                    !Number.isInteger(
                        requestId
                    ) ||
                    requestId <= 0
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "شناسه درخواست نامعتبر است."
                        },
                        400
                    );
                }

                if (
                    action !== "accept" &&
                    action !== "reject"
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "عملیات نامعتبر است."
                        },
                        400
                    );
                }

                const friendRequest =
                    await env.DB
                        .prepare(`
                            SELECT
                                fr.id,
                                fr.requester_id,
                                fr.receiver_id,
                                fr.status,

                                u.username
                                    AS requester_username

                            FROM friend_requests fr

                            INNER JOIN users u
                                ON u.id =
                                    fr.requester_id

                            WHERE
                                fr.id = ?1
                                AND
                                fr.receiver_id = ?2

                            LIMIT 1
                        `)
                        .bind(
                            requestId,
                            accessResult.user.id
                        )
                        .first();

                if (!friendRequest) {
                    return json(
                        {
                            success: false,
                            message:
                                "درخواست دوستی پیدا نشد."
                        },
                        404
                    );
                }

                if (
                    friendRequest.status !==
                    "pending"
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "این درخواست قبلاً تعیین تکلیف شده است."
                        },
                        409
                    );
                }

                const newStatus =
                    action === "accept"
                        ? "accepted"
                        : "rejected";

                await env.DB
                    .prepare(`
                        UPDATE friend_requests

                        SET
                            status = ?1,

                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            id = ?2
                    `)
                    .bind(
                        newStatus,
                        requestId
                    )
                    .run();

                if (
                    action === "accept"
                ) {
                    await notifyUser(
                        env,
                        friendRequest.requester_id,
                        "friend_accepted",
                        "✅ درخواست دوستی پذیرفته شد",
                        `${accessResult.user.username} درخواست دوستی‌ات را پذیرفت.`,
                        requestId
                    );

                    return json({
                        success: true,

                        message:
                            "✅ درخواست دوستی پذیرفته شد."
                    });
                }

                await notifyUser(
                    env,
                    friendRequest.requester_id,
                    "friend_rejected",
                    "👥 درخواست دوستی رد شد",
                    `${accessResult.user.username} درخواست دوستی‌ات را رد کرد.`,
                    requestId
                );

                return json({
                    success: true,

                    message:
                        "درخواست دوستی رد شد."
                });
            }

            /* =================================================
               FRIENDS — CANCEL
            ================================================= */

            if (
                path === "/api/friends/cancel" &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب شوید."
                        },
                        accessResult.status
                    );
                }

                await ensureFriendRequests(env);

                let body = {};

                try {
                    body =
                        await request.json();

                } catch {
                    return json(
                        {
                            success: false,
                            message:
                                "داده درخواست نامعتبر است."
                        },
                        400
                    );
                }

                const requestId =
                    Number(
                        body.request_id
                    );

                if (
                    !Number.isInteger(
                        requestId
                    ) ||
                    requestId <= 0
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "شناسه درخواست نامعتبر است."
                        },
                        400
                    );
                }

                const row =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                status
                            FROM friend_requests
                            WHERE
                                id = ?1
                                AND
                                requester_id = ?2
                            LIMIT 1
                        `)
                        .bind(
                            requestId,
                            accessResult.user.id
                        )
                        .first();

                if (!row) {
                    return json(
                        {
                            success: false,
                            message:
                                "درخواست دوستی پیدا نشد."
                        },
                        404
                    );
                }

                if (
                    row.status !== "pending"
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "این درخواست دیگر قابل لغو نیست."
                        },
                        409
                    );
                }

                await env.DB
                    .prepare(`
                        DELETE FROM friend_requests
                        WHERE id = ?1
                    `)
                    .bind(requestId)
                    .run();

                return json({
                    success: true,
                    message:
                        "درخواست دوستی لغو شد."
                });
            }

            /* =================================================
               FRIENDS — REMOVE
            ================================================= */

            if (
                path === "/api/friends/remove" &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب شوید."
                        },
                        accessResult.status
                    );
                }

                await ensureFriendRequests(env);

                let body = {};

                try {
                    body =
                        await request.json();

                } catch {
                    return json(
                        {
                            success: false,
                            message:
                                "داده درخواست نامعتبر است."
                        },
                        400
                    );
                }

                const friendId =
                    Number(
                        body.user_id
                    );

                if (
                    !Number.isInteger(
                        friendId
                    ) ||
                    friendId <= 0
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "کاربر نامعتبر است."
                        },
                        400
                    );
                }

                const row =
                    await env.DB
                        .prepare(`
                            SELECT
                                id
                            FROM friend_requests
                            WHERE
                                status = 'accepted'
                                AND
                                (
                                    (
                                        requester_id = ?1
                                        AND
                                        receiver_id = ?2
                                    )
                                    OR
                                    (
                                        requester_id = ?2
                                        AND
                                        receiver_id = ?1
                                    )
                                )
                            LIMIT 1
                        `)
                        .bind(
                            accessResult.user.id,
                            friendId
                        )
                        .first();

                if (!row) {
                    return json(
                        {
                            success: false,
                            message:
                                "این کاربر دوست شما نیست."
                        },
                        404
                    );
                }

                await env.DB
                    .prepare(`
                        DELETE FROM friend_requests
                        WHERE id = ?1
                    `)
                    .bind(row.id)
                    .run();

                return json({
                    success: true,
                    message:
                        "دوست با موفقیت حذف شد."
                });
            }
                        /* =================================================
               NEWS
            ================================================= */

            if (
                path === "/api/news" &&
                method === "GET"
            ) {
                await ensureNews(env);

                const limit =
                    limitParam(
                        url.searchParams.get("limit"),
                        50,
                        20
                    );

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                title,
                                content,
                                image_url,
                                category,
                                author_username,
                                created_at,
                                updated_at,
                                published_at
                            FROM news
                            WHERE status = 'published'
                            ORDER BY
                                published_at DESC,
                                id DESC
                            LIMIT ?1
                        `)
                        .bind(limit)
                        .all();

                return json({
                    success: true,
                    news:
                        result.results ?? []
                });
            }

            /* =================================================
               SINGLE NEWS
            ================================================= */

            const singleNews =
                path.match(
                    /^\/api\/news\/(\d+)$/
                );

            if (
                singleNews &&
                method === "GET"
            ) {
                await ensureNews(env);

                const news =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                title,
                                content,
                                image_url,
                                category,
                                author_username,
                                created_at,
                                updated_at,
                                published_at
                            FROM news
                            WHERE
                                id = ?1
                                AND status = 'published'
                            LIMIT 1
                        `)
                        .bind(
                            Number(
                                singleNews[1]
                            )
                        )
                        .first();

                if (!news) {
                    return json(
                        {
                            success: false,
                            message:
                                "این خبر پیدا نشد."
                        },
                        404
                    );
                }

                return json({
                    success: true,
                    news
                });
            }

            /* =================================================
               NEWS REACTIONS
            ================================================= */

            const reactionMatch =
                path.match(
                    /^\/api\/news\/(\d+)\/reaction$/
                );

            if (
                reactionMatch &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب PGame شو."
                        },
                        accessResult.status
                    );
                }

                if (
                    accessResult.ban &&
                    (
                        accessResult.ban.ban_type === "full" ||
                        accessResult.ban.ban_type === "reactions"
                    )
                ) {
                    return json(
                        {
                            success: false,

                            message:
                                accessResult.ban.ban_type === "full"
                                    ? "🚫 دسترسی این حساب به PGame محدود شده است."
                                    : "❤️ این حساب از واکنش به اخبار محروم شده است.",

                            banned: true,

                            ban_type:
                                accessResult.ban.ban_type
                        },
                        403
                    );
                }

                await ensureNewsReactions(env);

                const body =
                    await request.json();

                const newsId =
                    Number(
                        reactionMatch[1]
                    );

                const reaction =
                    typeof body.reaction === "string"
                        ? body.reaction.trim()
                        : "";

                if (
                    !Number.isInteger(newsId) ||
                    newsId < 1 ||
                    !ALLOWED_REACTIONS.has(
                        reaction
                    )
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "نوع واکنش یا شناسه خبر نامعتبر است."
                        },
                        400
                    );
                }

                const news =
                    await env.DB
                        .prepare(`
                            SELECT id
                            FROM news
                            WHERE
                                id = ?1
                                AND status = 'published'
                            LIMIT 1
                        `)
                        .bind(newsId)
                        .first();

                if (!news) {
                    return json(
                        {
                            success: false,
                            message:
                                "این خبر پیدا نشد."
                        },
                        404
                    );
                }

                const existing =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                reaction
                            FROM news_reactions
                            WHERE
                                news_id = ?1
                                AND user_id = ?2
                            LIMIT 1
                        `)
                        .bind(
                            newsId,
                            accessResult.user.id
                        )
                        .first();

                if (
                    existing &&
                    existing.reaction === reaction
                ) {
                    await env.DB
                        .prepare(`
                            DELETE FROM news_reactions
                            WHERE id = ?1
                        `)
                        .bind(existing.id)
                        .run();

                } else if (existing) {
                    await env.DB
                        .prepare(`
                            UPDATE news_reactions
                            SET
                                reaction = ?1,
                                created_at =
                                    CURRENT_TIMESTAMP
                            WHERE id = ?2
                        `)
                        .bind(
                            reaction,
                            existing.id
                        )
                        .run();

                } else {
                    await env.DB
                        .prepare(`
                            INSERT INTO news_reactions(
                                news_id,
                                user_id,
                                reaction,
                                created_at
                            )
                            VALUES(
                                ?1,
                                ?2,
                                ?3,
                                CURRENT_TIMESTAMP
                            )
                        `)
                        .bind(
                            newsId,
                            accessResult.user.id,
                            reaction
                        )
                        .run();
                }

                const countsResult =
                    await env.DB
                        .prepare(`
                            SELECT
                                reaction,
                                COUNT(*) AS count
                            FROM news_reactions
                            WHERE news_id = ?1
                            GROUP BY reaction
                        `)
                        .bind(newsId)
                        .all();

                const counts = {};

                for (
                    const item
                    of countsResult.results ?? []
                ) {
                    counts[item.reaction] =
                        Number(item.count);
                }

                const current =
                    await env.DB
                        .prepare(`
                            SELECT reaction
                            FROM news_reactions
                            WHERE
                                news_id = ?1
                                AND user_id = ?2
                            LIMIT 1
                        `)
                        .bind(
                            newsId,
                            accessResult.user.id
                        )
                        .first();

                return json({
                    success: true,

                    reactions:
                        counts,

                    my_reaction:
                        current?.reaction ?? null
                });
            }

            /* =================================================
               ADMIN NEWS LIST
            ================================================= */

            if (
                path === "/api/admin/news" &&
                method === "GET"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                admin.status === 401
                                    ? "ابتدا وارد حساب شو."
                                    : "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                await ensureNews(env);

                const result =
                    await env.DB
                        .prepare(`
                            SELECT *
                            FROM news
                            ORDER BY
                                created_at DESC,
                                id DESC
                        `)
                        .all();

                return json({
                    success: true,
                    news:
                        result.results ?? []
                });
            }

            /* =================================================
               ADMIN CREATE NEWS
            ================================================= */

            if (
                path === "/api/admin/news" &&
                method === "POST"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                admin.status === 401
                                    ? "ابتدا وارد حساب شو."
                                    : "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                await ensureNews(env);

                const body =
                    await request.json();

                const title =
                    clean(
                        body.title,
                        200
                    );

                const content =
                    clean(
                        body.content,
                        20000
                    );

                const imageUrl =
                    clean(
                        body.image_url,
                        1000
                    );

                const category =
                    clean(
                        body.category || "general",
                        50
                    ) || "general";

                const status =
                    body.status === "published"
                        ? "published"
                        : "draft";

                if (
                    title.length < 3 ||
                    content.length < 3
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "عنوان و متن خبر را کامل وارد کن."
                        },
                        400
                    );
                }

                const publishedAt =
                    status === "published"
                        ? new Date().toISOString()
                        : null;

                const inserted =
                    await env.DB
                        .prepare(`
                            INSERT INTO news(
                                title,
                                content,
                                image_url,
                                category,
                                status,
                                author_username,
                                created_at,
                                updated_at,
                                published_at
                            )
                            VALUES(
                                ?1,
                                ?2,
                                ?3,
                                ?4,
                                ?5,
                                ?6,
                                CURRENT_TIMESTAMP,
                                CURRENT_TIMESTAMP,
                                ?7
                            )
                        `)
                        .bind(
                            title,
                            content,
                            imageUrl || null,
                            category,
                            status,
                            admin.user.username,
                            publishedAt
                        )
                        .run();

                const newsId =
                    inserted.meta?.last_row_id;

                if (
                    status === "published"
                ) {
                    await notifyAllUsers(
                        env,
                        "news",
                        "📰 خبر جدید PGame",
                        title,
                        newsId ?? null
                    );
                }

                return json(
                    {
                        success: true,

                        message:
                            status === "published"
                                ? "خبر منتشر شد."
                                : "خبر به‌عنوان پیش‌نویس ذخیره شد.",

                        id:
                            newsId ?? null
                    },
                    201
                );
            }

            /* =================================================
               ADMIN UPDATE / DELETE NEWS
            ================================================= */

            const adminNewsMatch =
                path.match(
                    /^\/api\/admin\/news\/(\d+)$/
                );

            if (
                adminNewsMatch &&
                (
                    method === "PUT" ||
                    method === "DELETE"
                )
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                await ensureNews(env);

                const id =
                    Number(
                        adminNewsMatch[1]
                    );

                const existing =
                    await env.DB
                        .prepare(`
                            SELECT *
                            FROM news
                            WHERE id = ?1
                            LIMIT 1
                        `)
                        .bind(id)
                        .first();

                if (!existing) {
                    return json(
                        {
                            success: false,
                            message:
                                "خبر پیدا نشد."
                        },
                        404
                    );
                }

                if (
                    method === "DELETE"
                ) {
                    await env.DB
                        .prepare(`
                            DELETE FROM news
                            WHERE id = ?1
                        `)
                        .bind(id)
                        .run();

                    return json({
                        success: true,
                        message:
                            "خبر حذف شد."
                    });
                }

                const body =
                    await request.json();

                const title =
                    clean(
                        body.title ??
                            existing.title,
                        200
                    );

                const content =
                    clean(
                        body.content ??
                            existing.content,
                        20000
                    );

                const imageUrl =
                    clean(
                        body.image_url ??
                            existing.image_url ??
                            "",
                        1000
                    );

                const category =
                    clean(
                        body.category ??
                            existing.category ??
                            "general",
                        50
                    ) || "general";

                const status =
                    body.status === "published"
                        ? "published"
                        : "draft";

                let publishedAt =
                    existing.published_at;

                const wasPublished =
                    existing.status ===
                    "published";

                if (
                    status === "published" &&
                    !publishedAt
                ) {
                    publishedAt =
                        new Date().toISOString();
                }

                if (
                    status === "draft"
                ) {
                    publishedAt = null;
                }

                await env.DB
                    .prepare(`
                        UPDATE news
                        SET
                            title = ?1,
                            content = ?2,
                            image_url = ?3,
                            category = ?4,
                            status = ?5,
                            updated_at =
                                CURRENT_TIMESTAMP,
                            published_at = ?6
                        WHERE id = ?7
                    `)
                    .bind(
                        title,
                        content,
                        imageUrl || null,
                        category,
                        status,
                        publishedAt,
                        id
                    )
                    .run();

                if (
                    status === "published" &&
                    !wasPublished
                ) {
                    await notifyAllUsers(
                        env,
                        "news",
                        "📰 خبر جدید PGame",
                        title,
                        id
                    );
                }

                return json({
                    success: true,
                    message:
                        "خبر با موفقیت ویرایش شد."
                });
            }

            /* =================================================
               PUBLIC POLLS
            ================================================= */

            if (
                path === "/api/polls" &&
                method === "GET"
            ) {
                await ensurePolls(env);

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                question,
                                status,
                                author_username,
                                created_at,
                                updated_at,
                                published_at
                            FROM polls
                            WHERE status = 'published'
                            ORDER BY
                                published_at DESC,
                                id DESC
                            LIMIT 50
                        `)
                        .all();

                const polls = [];

                for (
                    const poll
                    of result.results ?? []
                ) {
                    const options =
                        await env.DB
                            .prepare(`
                                SELECT
                                    id,
                                    option_text,
                                    sort_order,
                                    (
                                        SELECT COUNT(*)
                                        FROM poll_votes
                                        WHERE
                                            poll_votes.option_id =
                                                poll_options.id
                                    ) AS votes
                                FROM poll_options
                                WHERE poll_id = ?1
                                ORDER BY
                                    sort_order ASC,
                                    id ASC
                            `)
                            .bind(poll.id)
                            .all();

                    const optionList =
                        options.results ?? [];

                    const totalVotes =
                        optionList.reduce(
                            (
                                total,
                                option
                            ) =>
                                total +
                                Number(
                                    option.votes ?? 0
                                ),
                            0
                        );

                    polls.push({
                        ...poll,
                        options:
                            optionList,
                        total_votes:
                            totalVotes
                    });
                }

                return json({
                    success: true,
                    polls
                });
            }

            /* =================================================
               ADMIN POLLS
            ================================================= */

            if (
                path === "/api/admin/polls" &&
                method === "GET"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                await ensurePolls(env);

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                question,
                                status,
                                author_username,
                                created_at,
                                updated_at,
                                published_at
                            FROM polls
                            ORDER BY
                                created_at DESC,
                                id DESC
                        `)
                        .all();

                const polls = [];

                for (
                    const poll
                    of result.results ?? []
                ) {
                    const options =
                        await env.DB
                            .prepare(`
                                SELECT
                                    id,
                                    option_text,
                                    sort_order
                                FROM poll_options
                                WHERE poll_id = ?1
                                ORDER BY
                                    sort_order ASC,
                                    id ASC
                            `)
                            .bind(poll.id)
                            .all();

                    polls.push({
                        ...poll,
                        options:
                            options.results ?? []
                    });
                }

                return json({
                    success: true,
                    polls
                });
            }

            /* =================================================
               ADMIN CREATE POLL
            ================================================= */

            if (
                path === "/api/admin/polls" &&
                method === "POST"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                admin.status === 401
                                    ? "ابتدا وارد حساب شو."
                                    : "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                await ensurePolls(env);

                const body =
                    await request.json();

                const question =
                    clean(
                        body.question,
                        500
                    );

                const status =
                    body.status === "published"
                        ? "published"
                        : "draft";

                let options =
                    Array.isArray(body.options)
                        ? body.options
                        : [];

                options =
                    options
                        .map(
                            option =>
                                clean(
                                    typeof option === "string"
                                        ? option
                                        : option?.option_text,
                                    250
                                )
                        )
                        .filter(Boolean)
                        .slice(0, 10);

                if (
                    question.length < 3
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "سؤال نظرسنجی را کامل وارد کن."
                        },
                        400
                    );
                }

                if (
                    options.length < 2
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "حداقل دو گزینه برای نظرسنجی لازم است."
                        },
                        400
                    );
                }

                const publishedAt =
                    status === "published"
                        ? new Date().toISOString()
                        : null;

                const inserted =
                    await env.DB
                        .prepare(`
                            INSERT INTO polls(
                                question,
                                status,
                                author_username,
                                created_at,
                                updated_at,
                                published_at
                            )
                            VALUES(
                                ?1,
                                ?2,
                                ?3,
                                CURRENT_TIMESTAMP,
                                CURRENT_TIMESTAMP,
                                ?4
                            )
                        `)
                        .bind(
                            question,
                            status,
                            admin.user.username,
                            publishedAt
                        )
                        .run();

                const pollId =
                    inserted.meta?.last_row_id;

                if (!pollId) {
                    throw new Error(
                        "poll id was not created"
                    );
                }

                for (
                    let i = 0;
                    i < options.length;
                    i++
                ) {
                    await env.DB
                        .prepare(`
                            INSERT INTO poll_options(
                                poll_id,
                                option_text,
                                sort_order
                            )
                            VALUES(
                                ?1,
                                ?2,
                                ?3
                            )
                        `)
                        .bind(
                            pollId,
                            options[i],
                            i
                        )
                        .run();
                }

                if (
                    status === "published"
                ) {
                    await notifyAllUsers(
                        env,
                        "poll",
                        "📊 نظرسنجی جدید PGame",
                        question,
                        pollId
                    );
                }

                return json(
                    {
                        success: true,

                        message:
                            status === "published"
                                ? "نظرسنجی منتشر شد."
                                : "نظرسنجی به‌عنوان پیش‌نویس ذخیره شد.",

                        id:
                            pollId
                    },
                    201
                );
            }

            /* =================================================
               VOTE POLL
            ================================================= */

            const votePollMatch =
                path.match(
                    /^\/api\/polls\/(\d+)\/vote$/
                );

            if (
                votePollMatch &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب PGame شو."
                        },
                        accessResult.status
                    );
                }

                await ensurePolls(env);

                const pollId =
                    Number(
                        votePollMatch[1]
                    );

                const body =
                    await request.json();

                const optionId =
                    Number(
                        body.option_id
                    );

                if (
                    !Number.isInteger(pollId) ||
                    !Number.isInteger(optionId)
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "شناسه نظرسنجی یا گزینه نامعتبر است."
                        },
                        400
                    );
                }

                const poll =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                question
                            FROM polls
                            WHERE
                                id = ?1
                                AND status = 'published'
                            LIMIT 1
                        `)
                        .bind(pollId)
                        .first();

                if (!poll) {
                    return json(
                        {
                            success: false,
                            message:
                                "نظرسنجی پیدا نشد."
                        },
                        404
                    );
                }

                const option =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                option_text
                            FROM poll_options
                            WHERE
                                id = ?1
                                AND poll_id = ?2
                            LIMIT 1
                        `)
                        .bind(
                            optionId,
                            pollId
                        )
                        .first();

                if (!option) {
                    return json(
                        {
                            success: false,
                            message:
                                "گزینه انتخاب‌شده معتبر نیست."
                        },
                        400
                    );
                }

                const existingVote =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                option_id
                            FROM poll_votes
                            WHERE
                                poll_id = ?1
                                AND user_id = ?2
                            LIMIT 1
                        `)
                        .bind(
                            pollId,
                            accessResult.user.id
                        )
                        .first();

                if (existingVote) {
                    await env.DB
                        .prepare(`
                            UPDATE poll_votes
                            SET
                                option_id = ?1,
                                created_at =
                                    CURRENT_TIMESTAMP
                            WHERE id = ?2
                        `)
                        .bind(
                            optionId,
                            existingVote.id
                        )
                        .run();

                } else {
                    await env.DB
                        .prepare(`
                            INSERT INTO poll_votes(
                                poll_id,
                                option_id,
                                user_id,
                                created_at
                            )
                            VALUES(
                                ?1,
                                ?2,
                                ?3,
                                CURRENT_TIMESTAMP
                            )
                        `)
                        .bind(
                            pollId,
                            optionId,
                            accessResult.user.id
                        )
                        .run();
                }

                const options =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                option_text,
                                (
                                    SELECT COUNT(*)
                                    FROM poll_votes
                                    WHERE
                                        poll_votes.option_id =
                                            poll_options.id
                                ) AS votes
                            FROM poll_options
                            WHERE
                                poll_id = ?1
                            ORDER BY
                                sort_order ASC,
                                id ASC
                        `)
                        .bind(pollId)
                        .all();

                const optionList =
                    options.results ?? [];

                const totalVotes =
                    optionList.reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            Number(
                                item.votes ?? 0
                            ),
                        0
                    );

                return json({
                    success: true,

                    poll: {
                        id:
                            poll.id,

                        question:
                            poll.question,

                        options:
                            optionList,

                        total_votes:
                            totalVotes,

                        my_option_id:
                            optionId
                    }
                });
            }
                        /* =================================================
               GET NOTIFICATIONS
            ================================================= */

            if (
                path === "/api/notifications" &&
                method === "GET"
            ) {
                const user =
                    await getCurrentUser(
                        request,
                        env
                    );

                if (!user) {
                    return json(
                        {
                            success: false,
                            notifications: [],
                            unread_count: 0
                        },
                        401
                    );
                }

                await ensureNotifications(env);

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                type,
                                title,
                                message,
                                reference_id,
                                created_at,
                                read_at
                            FROM notifications
                            WHERE user_id = ?1
                            ORDER BY id DESC
                            LIMIT 50
                        `)
                        .bind(user.id)
                        .all();

                const unread =
                    await env.DB
                        .prepare(`
                            SELECT
                                COUNT(*) AS count
                            FROM notifications
                            WHERE
                                user_id = ?1
                                AND read_at IS NULL
                        `)
                        .bind(user.id)
                        .first();

                return json({
                    success: true,

                    notifications:
                        result.results ?? [],

                    unread_count:
                        Number(
                            unread?.count ?? 0
                        )
                });
            }

            /* =================================================
               READ NOTIFICATION
            ================================================= */

            const notificationRead =
                path.match(
                    /^\/api\/notifications\/(\d+)\/read$/
                );

            if (
                notificationRead &&
                method === "POST"
            ) {
                const user =
                    await getCurrentUser(
                        request,
                        env
                    );

                if (!user) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب شو."
                        },
                        401
                    );
                }

                await ensureNotifications(env);

                await env.DB
                    .prepare(`
                        UPDATE notifications

                        SET
                            read_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            id = ?1
                            AND user_id = ?2
                    `)
                    .bind(
                        Number(
                            notificationRead[1]
                        ),
                        user.id
                    )
                    .run();

                return json({
                    success: true
                });
            }

            /* =================================================
               SUPPORT SEND
            ================================================= */

            if (
                path === "/api/support/send" &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی این حساب به PGame محدود شده است."
                        },
                        accessResult.status
                    );
                }

                if (
                    accessResult.ban &&
                    (
                        accessResult.ban.ban_type === "full" ||
                        accessResult.ban.ban_type === "messages"
                    )
                ) {
                    return json(
                        {
                            success: false,

                            message:
                                "💬 این حساب از ارسال پیام محروم شده است.",

                            banned: true,

                            ban_type:
                                accessResult.ban.ban_type
                        },
                        403
                    );
                }

                const body =
                    await request.json();

                const message =
                    clean(
                        body.message,
                        5000
                    );

                if (
                    message.length < 2
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "پیام خیلی کوتاه است."
                        },
                        400
                    );
                }

                const inserted =
                    await env.DB
                        .prepare(`
                            INSERT INTO support_messages(
                                user_id,
                                username,
                                message,
                                reply,
                                status,
                                created_at,
                                replied_at
                            )
                            VALUES(
                                ?1,
                                ?2,
                                ?3,
                                NULL,
                                'new',
                                CURRENT_TIMESTAMP,
                                NULL
                            )
                        `)
                        .bind(
                            accessResult.user.id,
                            accessResult.user.username,
                            message
                        )
                        .run();

                return json(
                    {
                        success: true,

                        message:
                            "پیامت با موفقیت برای مدیریت ارسال شد. 💚",

                        id:
                            inserted.meta?.last_row_id ??
                            null
                    },
                    201
                );
            }

            /* =================================================
               MY SUPPORT
            ================================================= */

            if (
                path === "/api/support/my" &&
                method === "GET"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            messages: []
                        },
                        accessResult.status
                    );
                }

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                message,
                                reply,
                                status,
                                created_at,
                                replied_at
                            FROM support_messages
                            WHERE user_id = ?1
                            ORDER BY
                                created_at DESC,
                                id DESC
                            LIMIT 50
                        `)
                        .bind(
                            accessResult.user.id
                        )
                        .all();

                return json({
                    success: true,

                    messages:
                        result.results ?? []
                });
            }

            /* =================================================
               ADMIN SUPPORT
            ================================================= */

            if (
                path === "/api/admin/support" &&
                method === "GET"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                user_id,
                                username,
                                message,
                                reply,
                                status,
                                created_at,
                                replied_at
                            FROM support_messages
                            ORDER BY
                                CASE
                                    WHEN status = 'new'
                                    THEN 0
                                    ELSE 1
                                END,
                                created_at DESC,
                                id DESC
                            LIMIT 200
                        `)
                        .all();

                return json({
                    success: true,

                    messages:
                        result.results ?? []
                });
            }

            /* =================================================
               ADMIN SUPPORT REPLY
            ================================================= */

            const supportReply =
                path.match(
                    /^\/api\/admin\/support\/(\d+)\/reply$/
                );

            if (
                supportReply &&
                method === "POST"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                const supportId =
                    Number(
                        supportReply[1]
                    );

                const body =
                    await request.json();

                const reply =
                    clean(
                        body.reply,
                        5000
                    );

                if (!reply) {
                    return json(
                        {
                            success: false,
                            message:
                                "متن پاسخ خالی است."
                        },
                        400
                    );
                }

                const supportMessage =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                user_id
                            FROM support_messages
                            WHERE id = ?1
                            LIMIT 1
                        `)
                        .bind(supportId)
                        .first();

                if (!supportMessage) {
                    return json(
                        {
                            success: false,
                            message:
                                "پیام پشتیبانی پیدا نشد."
                        },
                        404
                    );
                }

                await env.DB
                    .prepare(`
                        UPDATE support_messages

                        SET
                            reply = ?1,
                            status = 'replied',
                            replied_at =
                                CURRENT_TIMESTAMP

                        WHERE id = ?2
                    `)
                    .bind(
                        reply,
                        supportId
                    )
                    .run();

                await notifyUser(
                    env,
                    supportMessage.user_id,
                    "support",
                    "💬 پاسخ مدیریت",
                    "مدیریت به پیام شما پاسخ داده است.",
                    supportId
                );

                return json({
                    success: true,

                    message:
                        "پاسخ با موفقیت ارسال شد."
                });
            }

            /* =================================================
               ADMIN USERS
            ================================================= */

            if (
                path === "/api/admin/users" &&
                method === "GET"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false
                        },
                        admin.status
                    );
                }

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                u.id,
                                u.username,

                                ps.xp,
                                ps.level,
                                ps.coins,

                                ub.id AS ban_id,
                                ub.reason AS ban_reason,
                                ub.ban_type,
                                ub.banned_until,
                                ub.active AS ban_active

                            FROM users u

                            LEFT JOIN player_stats ps
                                ON ps.user_id = u.id

                            LEFT JOIN user_bans ub
                                ON ub.user_id = u.id

                                AND ub.active = 1

                                AND (
                                    ub.banned_until IS NULL
                                    OR ub.banned_until = ''
                                    OR ub.banned_until >
                                        CURRENT_TIMESTAMP
                                )

                            ORDER BY
                                u.id DESC
                        `)
                        .all();

                return json({
                    success: true,

                    users:
                        result.results ?? []
                });
            }

            /* =================================================
               ADMIN BANS
            ================================================= */

            if (
                path === "/api/admin/bans" &&
                method === "GET"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false
                        },
                        admin.status
                    );
                }

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                ub.id,
                                ub.user_id,
                                u.username,
                                ub.reason,
                                ub.ban_type,
                                ub.banned_until,
                                ub.created_at,
                                ub.active

                            FROM user_bans ub

                            INNER JOIN users u
                                ON u.id =
                                   ub.user_id

                            WHERE
                                ub.active = 1

                                AND (
                                    ub.banned_until IS NULL
                                    OR ub.banned_until = ''
                                    OR ub.banned_until >
                                        CURRENT_TIMESTAMP
                                )

                            ORDER BY
                                ub.created_at DESC
                        `)
                        .all();

                return json({
                    success: true,

                    bans:
                        result.results ?? []
                });
            }

            /* =================================================
               BAN USER
            ================================================= */

            const banMatch =
                path.match(
                    /^\/api\/admin\/users\/(\d+)\/ban$/
                );

            if (
                banMatch &&
                method === "POST"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                const userId =
                    Number(
                        banMatch[1]
                    );

                if (
                    userId ===
                    admin.user.id
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "ادمین نمی‌تواند خودش را بن کند."
                        },
                        400
                    );
                }

                const body =
                    await request.json();

                const reason =
                    clean(
                        body.reason,
                        500
                    ) ||
                    "نقض قوانین PGame";

                const ban_type =
                    banType(
                        body.ban_type
                    );

                let bannedUntil = null;

                if (
                    typeof body.banned_until ===
                        "string" &&
                    body.banned_until
                ) {
                    const date =
                        new Date(
                            body.banned_until
                        );

                    if (
                        Number.isNaN(
                            date.getTime()
                        ) ||
                        date.getTime() <=
                            Date.now()
                    ) {
                        return json(
                            {
                                success: false,
                                message:
                                    "زمان پایان بن نامعتبر است."
                            },
                            400
                        );
                    }

                    bannedUntil =
                        date.toISOString();
                }

                const target =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                username
                            FROM users
                            WHERE id = ?1
                            LIMIT 1
                        `)
                        .bind(userId)
                        .first();

                if (!target) {
                    return json(
                        {
                            success: false,
                            message:
                                "کاربر پیدا نشد."
                        },
                        404
                    );
                }

                await env.DB
                    .prepare(`
                        UPDATE user_bans
                        SET active = 0
                        WHERE
                            user_id = ?1
                            AND active = 1
                    `)
                    .bind(userId)
                    .run();

                await env.DB
                    .prepare(`
                        INSERT INTO user_bans(
                            user_id,
                            reason,
                            ban_type,
                            banned_until,
                            created_at,
                            active
                        )
                        VALUES(
                            ?1,
                            ?2,
                            ?3,
                            ?4,
                            CURRENT_TIMESTAMP,
                            1
                        )
                    `)
                    .bind(
                        userId,
                        reason,
                        ban_type,
                        bannedUntil
                    )
                    .run();

                return json({
                    success: true,

                    message:
                        "محدودیت کاربر اعمال شد.",

                    username:
                        target.username,

                    ban_type,

                    ban_label:
                        banLabel(
                            ban_type
                        ),

                    banned_until:
                        bannedUntil
                });
            }

            /* =================================================
               UNBAN
            ================================================= */

            const unbanMatch =
                path.match(
                    /^\/api\/admin\/users\/(\d+)\/unban$/
                );

            if (
                unbanMatch &&
                method === "POST"
            ) {
                const admin =
                    await requireAdmin(
                        request,
                        env
                    );

                if (!admin.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی ادمین ندارید."
                        },
                        admin.status
                    );
                }

                await env.DB
                    .prepare(`
                        UPDATE user_bans

                        SET
                            active = 0

                        WHERE
                            user_id = ?1
                            AND active = 1
                    `)
                    .bind(
                        Number(
                            unbanMatch[1]
                        )
                    )
                    .run();

                return json({
                    success: true,

                    message:
                        "محدودیت کاربر برداشته شد."
                });
            }

            /* =================================================
               RUBIKA CREATE CODE
            ================================================= */

            if (
                path === "/api/rubika/create-code" &&
                method === "POST"
            ) {
                const user =
                    await getCurrentUser(
                        request,
                        env
                    );

                if (!user) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب PGame شو."
                        },
                        401
                    );
                }

                const code =
                    String(
                        100000 +
                        (
                            crypto.getRandomValues(
                                new Uint32Array(1)
                            )[0] %
                            900000
                        )
                    );

                const expires =
                    new Date(
                        Date.now() +
                        RUBIKA_CODE_MINUTES *
                        60000
                    ).toISOString();

                await env.DB
                    .prepare(`
                        INSERT INTO rubika_link_codes(
                            user_id,
                            code,
                            expires_at
                        )
                        VALUES(
                            ?1,
                            ?2,
                            ?3
                        )

                        ON CONFLICT(user_id)

                        DO UPDATE SET
                            code =
                                excluded.code,

                            expires_at =
                                excluded.expires_at
                    `)
                    .bind(
                        user.id,
                        code,
                        expires
                    )
                    .run();

                return json({
                    success: true,
                    code,
                    expires_at: expires
                });
            }
                        /* =================================================
               RUBIKA LINK
            ================================================= */

            if (
                path === "/api/rubika/link" &&
                method === "POST"
            ) {
                const key =
                    (
                        request.headers.get(
                            "X-VEXON-API-KEY"
                        ) || ""
                    ).trim();

                if (
                    !env.VEXON_RUBIKA_API_KEY ||
                    key !==
                        String(
                            env.VEXON_RUBIKA_API_KEY
                        ).trim()
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "Unauthorized"
                        },
                        401
                    );
                }

                const body =
                    await request.json();

                const code =
                    clean(
                        body.code,
                        6
                    );

                const rubikaId =
                    body.rubika_user_id !==
                        undefined
                        ? String(
                            body.rubika_user_id
                        ).trim()
                        : "";

                if (
                    !/^\d{6}$/.test(code) ||
                    !rubikaId
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "Invalid data"
                        },
                        400
                    );
                }

                const linkCode =
                    await env.DB
                        .prepare(`
                            SELECT
                                user_id,
                                code,
                                expires_at
                            FROM rubika_link_codes
                            WHERE code = ?1
                            LIMIT 1
                        `)
                        .bind(code)
                        .first();

                if (!linkCode) {
                    return json(
                        {
                            success: false,
                            message:
                                "کد اتصال معتبر نیست."
                        },
                        404
                    );
                }

                if (
                    new Date(
                        linkCode.expires_at
                    ).getTime() <=
                    Date.now()
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "کد اتصال منقضی شده است."
                        },
                        410
                    );
                }

                const existing =
                    await env.DB
                        .prepare(`
                            SELECT id
                            FROM rubika_links
                            WHERE
                                user_id = ?1
                                OR rubika_sender_id = ?2
                            LIMIT 1
                        `)
                        .bind(
                            linkCode.user_id,
                            rubikaId
                        )
                        .first();

                if (existing) {
                    return json(
                        {
                            success: false,
                            message:
                                "این حساب PGame یا حساب روبیکا قبلاً متصل شده است."
                        },
                        409
                    );
                }

                await env.DB
                    .prepare(`
                        INSERT INTO rubika_links(
                            user_id,
                            rubika_sender_id,
                            rubika_chat_id
                        )
                        VALUES(
                            ?1,
                            ?2,
                            ?3
                        )
                    `)
                    .bind(
                        linkCode.user_id,
                        rubikaId,
                        rubikaId
                    )
                    .run();

                await env.DB
                    .prepare(`
                        DELETE FROM rubika_link_codes
                        WHERE user_id = ?1
                    `)
                    .bind(
                        linkCode.user_id
                    )
                    .run();

                return json({
                    success: true,

                    message:
                        "حساب روبیکا با موفقیت متصل شد."
                });
            }

            /* =================================================
               RUBIKA UNLINK
            ================================================= */

            if (
                path === "/api/rubika/unlink" &&
                method === "POST"
            ) {
                const user =
                    await getCurrentUser(
                        request,
                        env
                    );

                if (!user) {
                    return json(
                        {
                            success: false,
                            message:
                                "ابتدا وارد حساب PGame شو."
                        },
                        401
                    );
                }

                const linked =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                rubika_sender_id
                            FROM rubika_links
                            WHERE user_id = ?1
                            LIMIT 1
                        `)
                        .bind(user.id)
                        .first();

                if (!linked) {
                    return json(
                        {
                            success: false,
                            message:
                                "هیچ حساب روبیکایی به این حساب متصل نیست."
                        },
                        404
                    );
                }

                await env.DB
                    .prepare(`
                        DELETE FROM rubika_links
                        WHERE user_id = ?1
                    `)
                    .bind(user.id)
                    .run();

                return json({
                    success: true,

                    message:
                        "اتصال روبیکا با موفقیت لغو شد."
                });
            }

            /* =================================================
   RUBIKA UNLINK FROM BOT
================================================= */

if (
    path === "/api/rubika/unlink-bot" &&
    method === "POST"
) {
    const apiKey =
        request.headers.get("X-VEXON-API-KEY") || "";

    if (
        !env.VEXON_RUBIKA_API_KEY ||
        apiKey !== env.VEXON_RUBIKA_API_KEY
    ) {
        return json(
            {
                success: false,
                message: "Unauthorized"
            },
            401
        );
    }

    try {
        const body =
            await request.json();

        const rubikaUserId =
            typeof body.rubika_user_id === "string"
                ? body.rubika_user_id.trim()
                : "";

        if (!rubikaUserId) {
            return json(
                {
                    success: false,
                    message:
                        "شناسه روبیکا ارسال نشده است."
                },
                400
            );
        }

        const linked =
            await env.DB
                .prepare(`
                    SELECT
                        id,
                        user_id
                    FROM rubika_links
                    WHERE rubika_sender_id = ?1
                    LIMIT 1
                `)
                .bind(rubikaUserId)
                .first();

        if (!linked) {
            return json({
                success: true,
                already_unlinked: true,
                message:
                    "این حساب روبیکا به PGame متصل نیست."
            });
        }

        await env.DB
            .prepare(`
                DELETE FROM rubika_links
                WHERE rubika_sender_id = ?1
            `)
            .bind(rubikaUserId)
            .run();

        return json({
            success: true,
            message:
                "اتصال Rubika و PGame با موفقیت قطع شد."
        });

    } catch (error) {

        console.error(
            "RUBIKA_BOT_UNLINK_ERROR",
            error
        );

        return json(
            {
                success: false,
                message:
                    "قطع ارتباط انجام نشد."
            },
            500
        );
    }
}


/* =================================================
   RUBIKA CONNECTION STATUS FROM BOT
================================================= */

if (
    path === "/api/rubika/status-bot" &&
    method === "GET"
) {
    const apiKey =
        request.headers.get("X-VEXON-API-KEY") || "";

    if (
        !env.VEXON_RUBIKA_API_KEY ||
        apiKey !== env.VEXON_RUBIKA_API_KEY
    ) {
        return json(
            {
                success: false,
                message: "Unauthorized"
            },
            401
        );
    }

    try {
        const rubikaUserId =
            url.searchParams.get(
                "rubika_user_id"
            )?.trim() || "";

        if (!rubikaUserId) {
            return json(
                {
                    success: false,
                    message:
                        "شناسه روبیکا ارسال نشده است."
                },
                400
            );
        }

        const linked =
            await env.DB
                .prepare(`
                    SELECT
                        id
                    FROM rubika_links
                    WHERE rubika_sender_id = ?1
                    LIMIT 1
                `)
                .bind(rubikaUserId)
                .first();

        return json({
            success: true,
            connected: !!linked
        });

    } catch (error) {

        console.error(
            "RUBIKA_BOT_STATUS_ERROR",
            error
        );

        return json(
            {
                success: false,
                message:
                    "بررسی وضعیت اتصال انجام نشد."
            },
            500
        );
    }
}

            /* =================================================
               API TEST
            ================================================= */

            if (
                path === "/api/test" &&
                method === "GET"
            ) {
                return json({
                    success: true,
                    message:
                        "PGame API is online!"
                });
            }

            /* =================================================
               MESSENGER - CONVERSATIONS GET
            ================================================= */

            if (
                path ===
                    "/api/messenger/conversations" &&
                method === "GET"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی به پیام‌رسان محدود شده است."
                        },
                        accessResult.status
                    );
                }

                await ensureMessenger(env);

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                c.id,
                                c.updated_at,

                                other.id
                                    AS other_user_id,

                                other.username
                                    AS other_username,

                                lm.content
                                    AS last_message,

                                lm.created_at
                                    AS last_message_at,

                                (
                                    SELECT COUNT(*)
                                    FROM messages um
                                    WHERE
                                        um.conversation_id =
                                            c.id

                                        AND um.sender_id !=
                                            ?1

                                        AND um.deleted_at IS NULL

                                        AND (
                                            cm.last_read_at IS NULL
                                            OR um.created_at >
                                               cm.last_read_at
                                        )
                                ) AS unread_count

                            FROM conversations c

                            INNER JOIN conversation_members cm
                                ON cm.conversation_id =
                                   c.id

                                AND cm.user_id =
                                    ?1

                            INNER JOIN conversation_members ocm
                                ON ocm.conversation_id =
                                   c.id

                                AND ocm.user_id !=
                                    ?1

                            INNER JOIN users other
                                ON other.id =
                                   ocm.user_id

                            LEFT JOIN messages lm
                                ON lm.id = (
                                    SELECT
                                        MAX(m2.id)
                                    FROM messages m2
                                    WHERE
                                        m2.conversation_id =
                                            c.id

                                        AND m2.deleted_at IS NULL
                                )

                            ORDER BY
                                COALESCE(
                                    lm.created_at,
                                    c.created_at
                                ) DESC,

                                c.id DESC
                        `)
                        .bind(
                            accessResult.user.id
                        )
                        .all();

                return json({
                    success: true,

                    conversations:
                        result.results ?? []
                });
            }

            /* =================================================
               MESSENGER - SEARCH USERS
            ================================================= */

            if (
                path ===
                    "/api/messenger/users/search" &&
                method === "GET"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false
                        },
                        accessResult.status
                    );
                }

                const query =
                    clean(
                        url.searchParams.get("q") || "",
                        40
                    );

                if (
                    query.length < 2
                ) {
                    return json({
                        success: true,
                        users: []
                    });
                }

                const result =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                username
                            FROM users
                            WHERE
                                id != ?1
                                AND username LIKE ?2
                            ORDER BY
                                username ASC
                            LIMIT 30
                        `)
                        .bind(
                            accessResult.user.id,
                            `%${query}%`
                        )
                        .all();

                return json({
                    success: true,

                    users:
                        result.results ?? []
                });
            }

            /* =================================================
               MESSENGER - CREATE CONVERSATION
            ================================================= */

            if (
                path ===
                    "/api/messenger/conversations" &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی به پیام‌رسان محدود شده است."
                        },
                        accessResult.status
                    );
                }

                if (
                    accessResult.ban?.ban_type ===
                    "messages"
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "💬 این حساب از ارسال پیام محروم شده است."
                        },
                        403
                    );
                }

                await ensureMessenger(env);

                const body =
                    await request.json();

                const targetUserId =
                    Number(
                        body.user_id
                    );

                if (
                    !Number.isInteger(
                        targetUserId
                    ) ||
                    targetUserId < 1 ||
                    targetUserId ===
                        accessResult.user.id
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "کاربر مقصد نامعتبر است."
                        },
                        400
                    );
                }

                const target =
                    await env.DB
                        .prepare(`
                            SELECT
                                id,
                                username
                            FROM users
                            WHERE id = ?1
                            LIMIT 1
                        `)
                        .bind(
                            targetUserId
                        )
                        .first();

                if (!target) {
                    return json(
                        {
                            success: false,
                            message:
                                "کاربر پیدا نشد."
                        },
                        404
                    );
                }

                const existing =
                    await env.DB
                        .prepare(`
                            SELECT c.id

                            FROM conversations c

                            INNER JOIN conversation_members x
                                ON x.conversation_id =
                                   c.id

                                AND x.user_id =
                                    ?1

                            INNER JOIN conversation_members y
                                ON y.conversation_id =
                                   c.id

                                AND y.user_id =
                                    ?2

                            WHERE NOT EXISTS (
                                SELECT 1
                                FROM conversation_members z
                                WHERE
                                    z.conversation_id =
                                        c.id

                                    AND z.user_id NOT IN(
                                        ?1,
                                        ?2
                                    )
                            )

                            LIMIT 1
                        `)
                        .bind(
                            accessResult.user.id,
                            targetUserId
                        )
                        .first();

                let conversationId =
                    existing?.id;

                if (!conversationId) {
                    const inserted =
                        await env.DB
                            .prepare(`
                                INSERT INTO conversations
                                DEFAULT VALUES
                            `)
                            .run();

                    conversationId =
                        inserted.meta
                            ?.last_row_id;

                    await env.DB
                        .prepare(`
                            INSERT INTO conversation_members(
                                conversation_id,
                                user_id
                            )
                            VALUES(
                                ?1,
                                ?2
                            ),
                            (
                                ?1,
                                ?3
                            )
                        `)
                        .bind(
                            conversationId,
                            accessResult.user.id,
                            targetUserId
                        )
                        .run();
                }

                return json(
                    {
                        success: true,

                        conversation: {
                            id:
                                conversationId,

                            other_user_id:
                                target.id,

                            other_username:
                                target.username
                        }
                    },
                    201
                );
            }

            /* =================================================
               MESSENGER - MESSAGES
            ================================================= */

            const messagesMatch =
                path.match(
                    /^\/api\/messenger\/conversations\/(\d+)\/messages$/
                );

            if (
                messagesMatch &&
                (
                    method === "GET" ||
                    method === "POST"
                )
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی به پیام‌رسان محدود شده است."
                        },
                        accessResult.status
                    );
                }

                if (
                    method === "POST" &&
                    accessResult.ban?.ban_type ===
                        "messages"
                ) {
                    return json(
                        {
                            success: false,
                            message:
                                "💬 این حساب از ارسال پیام محروم شده است."
                        },
                        403
                    );
                }

                await ensureMessenger(env);

                const conversationId =
                    Number(
                        messagesMatch[1]
                    );

                const member =
                    await env.DB
                        .prepare(`
                            SELECT 1
                            FROM conversation_members
                            WHERE
                                conversation_id = ?1
                                AND user_id = ?2
                            LIMIT 1
                        `)
                        .bind(
                            conversationId,
                            accessResult.user.id
                        )
                        .first();

                if (!member) {
                    return json(
                        {
                            success: false,
                            message:
                                "دسترسی به این گفتگو ندارید."
                        },
                        403
                    );
                }

                if (
                    method === "GET"
                ) {
                    const result =
                        await env.DB
                            .prepare(`
                                SELECT
                                    m.id,
                                    m.sender_id,
                                    u.username
                                        AS sender_username,
                                    m.content,
                                    m.created_at
                                FROM messages m
                                INNER JOIN users u
                                    ON u.id =
                                       m.sender_id
                                WHERE
                                    m.conversation_id =
                                        ?1
                                    AND m.deleted_at IS NULL
                                ORDER BY
                                    m.id ASC
                                LIMIT 500
                            `)
                            .bind(
                                conversationId
                            )
                            .all();

                    return json({
                        success: true,

                        messages:
                            result.results ?? []
                    });
                }

                const body =
                    await request.json();

                const content =
                    clean(
                        body.content,
                        4000
                    );

                if (!content) {
                    return json(
                        {
                            success: false,
                            message:
                                "پیام خالی است."
                        },
                        400
                    );
                }

                const inserted =
                    await env.DB
                        .prepare(`
                            INSERT INTO messages(
                                conversation_id,
                                sender_id,
                                content
                            )
                            VALUES(
                                ?1,
                                ?2,
                                ?3
                            )
                        `)
                        .bind(
                            conversationId,
                            accessResult.user.id,
                            content
                        )
                        .run();

                await env.DB
                    .prepare(`
                        UPDATE conversations

                        SET
                            updated_at =
                                CURRENT_TIMESTAMP

                        WHERE id = ?1
                    `)
                    .bind(conversationId)
                    .run();

                return json(
                    {
                        success: true,

                        id:
                            inserted.meta?.last_row_id ??
                            null
                    },
                    201
                );
            }

            /* =================================================
               MESSENGER - MARK READ
            ================================================= */

            const readConversation =
                path.match(
                    /^\/api\/messenger\/conversations\/(\d+)\/read$/
                );

            if (
                readConversation &&
                method === "POST"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false
                        },
                        accessResult.status
                    );
                }

                await env.DB
                    .prepare(`
                        UPDATE conversation_members

                        SET
                            last_read_at =
                                CURRENT_TIMESTAMP

                        WHERE
                            conversation_id = ?1
                            AND user_id = ?2
                    `)
                    .bind(
                        Number(
                            readConversation[1]
                        ),
                        accessResult.user.id
                    )
                    .run();

                return json({
                    success: true
                });
            }

            /* =================================================
               MESSENGER - DELETE MESSAGE
            ================================================= */

            const deleteMessage =
                path.match(
                    /^\/api\/messenger\/messages\/(\d+)$/
                );

            if (
                deleteMessage &&
                method === "DELETE"
            ) {
                const accessResult =
                    await access(
                        request,
                        env
                    );

                if (!accessResult.ok) {
                    return json(
                        {
                            success: false
                        },
                        accessResult.status
                    );
                }

                const result =
                    await env.DB
                        .prepare(`
                            UPDATE messages

                            SET
                                deleted_at =
                                    CURRENT_TIMESTAMP

                            WHERE
                                id = ?1
                                AND sender_id = ?2
                                AND deleted_at IS NULL
                        `)
                        .bind(
                            Number(
                                deleteMessage[1]
                            ),
                            accessResult.user.id
                        )
                        .run();

                return json({
                    success: true,

                    changed:
                        Number(
                            result.meta?.changes ?? 0
                        )
                });
            }

            /* =================================================
               STATIC ASSETS
            ================================================= */

            return env.ASSETS.fetch(
                request
            );

        } catch (e) {

            console.error(
                "PGAME_WORKER_ERROR",
                e
            );

            return json(
                {
                    success: false,
                    message:
                        "خطای داخلی سرور رخ داد."
                },
                500
            );
        }
    }
};