const PASSWORD_ITERATIONS = 100000;
const SESSION_DAYS = 7;
const RUBIKA_CODE_MINUTES = 10;


/* =========================================================
   JSON RESPONSE
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

function toBase64(bytes) {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}


function fromBase64(value) {
    const binary = atob(value);

    return Uint8Array.from(
        binary,
        char => char.charCodeAt(0)
    );
}


/* =========================================================
   PASSWORD HASH
========================================================= */

async function hashPassword(password) {

    const encoder = new TextEncoder();

    const salt =
        crypto.getRandomValues(
            new Uint8Array(16)
        );

    const keyMaterial =
        await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );

    const derivedBits =
        await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt,
                iterations:
                    PASSWORD_ITERATIONS,
                hash: "SHA-256"
            },
            keyMaterial,
            256
        );

    return [
        "pbkdf2",
        PASSWORD_ITERATIONS,
        toBase64(salt),
        toBase64(
            new Uint8Array(
                derivedBits
            )
        )
    ].join("$");
}


async function verifyPassword(
    password,
    storedHash
) {

    try {

        const parts =
            storedHash.split("$");

        if (
            parts.length !== 4 ||
            parts[0] !== "pbkdf2"
        ) {
            return false;
        }

        const iterations =
            Number(parts[1]);

        const salt =
            fromBase64(parts[2]);

        const expected =
            fromBase64(parts[3]);

        const keyMaterial =
            await crypto.subtle.importKey(
                "raw",
                new TextEncoder().encode(
                    password
                ),
                "PBKDF2",
                false,
                ["deriveBits"]
            );

        const derivedBits =
            await crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt,
                    iterations,
                    hash: "SHA-256"
                },
                keyMaterial,
                expected.length * 8
            );

        const actual =
            new Uint8Array(
                derivedBits
            );

        if (
            actual.length !==
            expected.length
        ) {
            return false;
        }

        let difference = 0;

        for (
            let i = 0;
            i < actual.length;
            i++
        ) {
            difference |=
                actual[i] ^
                expected[i];
        }

        return difference === 0;

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

    return Array.from(bytes)
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");
}


async function hashSessionToken(token) {

    const digest =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(token)
        );

    return Array.from(
        new Uint8Array(digest)
    )
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");
}


function getCookie(
    request,
    name
) {

    const cookieHeader =
        request.headers.get("Cookie");

    if (!cookieHeader) {
        return null;
    }

    for (
        const cookie of
        cookieHeader.split(";")
    ) {

        const [
            key,
            ...valueParts
        ] =
            cookie
                .trim()
                .split("=");

        if (
            key === name
        ) {

            return (
                valueParts.join("=") ||
                null
            );

        }

    }

    return null;
}


/* =========================================================
   XP TABLE
========================================================= */

function getNextLevelXp(level) {

    const levels = {
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

    return (
        levels[level] ??
        (level * 700)
    );
}


/* =========================================================
   RENDER PLAYER
========================================================= */

async function getPlayerFromRender(
    env,
    rubikaUserId
) {

    if (
        !env.VEXON_RUBIKA_API_KEY
    ) {

        console.error(
            "VEXON_RUBIKA_API_KEY is not configured."
        );

        return null;
    }

    const endpoint =
        "https://bangame.onrender.com/vexon/player";

    try {

        const response =
            await fetch(
                `${endpoint}?rubika_user_id=${encodeURIComponent(
                    String(rubikaUserId)
                )}`,
                {
                    method: "GET",
                    headers: {
                        "X-VEXON-API-KEY":
                            env.VEXON_RUBIKA_API_KEY
                    }
                }
            );

        if (
            !response.ok
        ) {

            console.error(
                "RENDER_PLAYER_ERROR",
                response.status
            );

            return null;
        }

        const data =
            await response.json();

        if (
            !data ||
            !data.success ||
            !data.player
        ) {

            console.error(
                "RENDER_PLAYER_INVALID_RESPONSE",
                data
            );

            return null;
        }

        return data.player;

    } catch (error) {

        console.error(
            "RENDER_PLAYER_FETCH_ERROR",
            error
        );

        return null;
    }
}


/* =========================================================
   CURRENT USER
========================================================= */

async function getCurrentUser(
    request,
    env
) {

    const sessionToken =
        getCookie(
            request,
            "vexon_session"
        );

    if (!sessionToken) {
        return null;
    }

    const tokenHash =
        await hashSessionToken(
            sessionToken
        );

    const session =
        await env.DB
            .prepare(
                `
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
                `
            )
            .bind(tokenHash)
            .first();

    if (!session) {
        return null;
    }

    const rubikaLink =
        await env.DB
            .prepare(
                `
                SELECT
                    rubika_sender_id,
                    rubika_chat_id
                FROM rubika_links
                WHERE user_id = ?1
                LIMIT 1
                `
            )
            .bind(session.user_id)
            .first();

    if (
        rubikaLink &&
        rubikaLink.rubika_sender_id
    ) {

        const player =
            await getPlayerFromRender(
                env,
                rubikaLink.rubika_sender_id
            );

        if (player) {

            const level =
                Number(
                    player.level ?? 1
                );

            const xp =
                Number(
                    player.xp ?? 0
                );

            const coins =
                Number(
                    player.coins ?? 0
                );

            const nextXp =
                Number(
                    player.next_xp ??
                    getNextLevelXp(level)
                );

            const progress =
                nextXp > 0
                    ? Math.min(
                        100,
                        Math.max(
                            0,
                            (xp / nextXp) *
                                100
                        )
                    )
                    : 0;

            return {

                id:
                    session.user_id,

                username:
                    session.username,

                rubika_user_id:
                    String(
                        player.user_id ??
                        rubikaLink.rubika_sender_id
                    ),

                nickname:
                    player.nickname ??
                    null,

                title:
                    player.title ??
                    "🥉 تازه‌کار",

                xp,
                level,
                next_xp:
                    nextXp,

                xp_progress:
                    progress,

                coins,

                typing_games:
                    Number(
                        player.typing_games ??
                        0
                    ),

                typing_best_time:
                    Number(
                        player.typing_best_time ??
                        0
                    ),

                typing_best_wpm:
                    Number(
                        player.typing_best_wpm ??
                        0
                    )
            };
        }
    }

    const localStats =
        await env.DB
            .prepare(
                `
                SELECT
                    xp,
                    level,
                    coins
                FROM player_stats
                WHERE user_id = ?1
                LIMIT 1
                `
            )
            .bind(session.user_id)
            .first();

    const xp =
        Number(
            localStats?.xp ?? 0
        );

    const level =
        Number(
            localStats?.level ?? 1
        );

    const coins =
        Number(
            localStats?.coins ?? 0
        );

    const nextXp =
        getNextLevelXp(level);

    const progress =
        nextXp > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (xp / nextXp) * 100
                )
            )
            : 0;

    return {

        id:
            session.user_id,

        username:
            session.username,

        rubika_user_id:
            null,

        nickname:
            null,

        title:
            "🥉 تازه‌کار",

        xp,
        level,

        next_xp:
            nextXp,

        xp_progress:
            progress,

        coins,

        typing_games:
            0,

        typing_best_time:
            0,

        typing_best_wpm:
            0
    };
}


/* =========================================================
   ADMIN
========================================================= */

function isAdminUser(
    user,
    env
) {

    if (!user) {
        return false;
    }

    const adminUsername =
        typeof env.ADMIN_USERNAME ===
        "string"
            ? env.ADMIN_USERNAME.trim()
            : "";

    if (!adminUsername) {
        return false;
    }

    return (
        user.username ===
        adminUsername
    );
}


async function requireAdmin(
    request,
    env
) {

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

    if (
        !isAdminUser(
            user,
            env
        )
    ) {

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
   BAN
========================================================= */

const ALLOWED_BAN_TYPES =
    new Set([
        "full",
        "messages",
        "reactions"
    ]);


function normalizeBanType(value) {

    if (
        typeof value !==
        "string"
    ) {
        return "full";
    }

    return ALLOWED_BAN_TYPES.has(
        value.trim()
    )
        ? value.trim()
        : "full";
}


function getBanLabel(type) {

    switch (type) {

        case "messages":
            return "💬 محرومیت از پیام";

        case "reactions":
            return "❤️ محرومیت از واکنش";

        case "full":
        default:
            return "🚫 بن کامل سایت";
    }
}


async function getActiveBan(
    userId,
    env
) {

    const ban =
        await env.DB
            .prepare(
                `
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
                `
            )
            .bind(userId)
            .first();

    return ban || null;
}


/* =========================================================
   NEWS TABLE
========================================================= */

async function ensureNewsTable(env) {

    await env.DB
        .prepare(
            `
            CREATE TABLE IF NOT EXISTS news (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                title TEXT NOT NULL,

                content TEXT NOT NULL,

                image_url TEXT,

                category TEXT
                    DEFAULT 'general',

                status TEXT NOT NULL
                    DEFAULT 'draft',

                author_username TEXT NOT NULL,

                created_at TEXT NOT NULL
                    DEFAULT CURRENT_TIMESTAMP,

                updated_at TEXT NOT NULL
                    DEFAULT CURRENT_TIMESTAMP,

                published_at TEXT

            )
            `
        )
        .run();
}


function cleanNewsText(
    value,
    maxLength
) {

    if (
        typeof value !==
        "string"
    ) {
        return "";
    }

    return value
        .trim()
        .slice(
            0,
            maxLength
        );
}


function normalizeNewsStatus(value) {

    return (
        value === "published"
            ? "published"
            : "draft"
    );
}


/* =========================================================
   REACTIONS
========================================================= */

const ALLOWED_REACTIONS =
    new Set([
        "like",
        "love",
        "laugh",
        "wow",
        "angry",
        "dislike"
    ]);


function isValidReaction(value) {

    return (
        typeof value === "string" &&
        ALLOWED_REACTIONS.has(
            value
        )
    );
}


/* =========================================================
   SUPPORT
========================================================= */

async function getUserAccess(
    request,
    env
) {

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

    if (
        isAdminUser(
            user,
            env
        )
    ) {

        return {
            ok: true,
            status: 200,
            user,
            ban: null
        };
    }

    const ban =
        await getActiveBan(
            user.id,
            env
        );

    return {
        ok: true,
        status: 200,
        user,
        ban
    };
}


/* =========================================================
   RUBIKA
========================================================= */

function generateLinkCode() {

    const bytes =
        crypto.getRandomValues(
            new Uint32Array(1)
        );

    return String(
        100000 +
        (
            bytes[0] %
            900000
        )
    );
}


async function sendRubikaMessage(
    env,
    chatId,
    text
) {

    if (
        !env.RUBIKA_BOT_TOKEN
    ) {

        throw new Error(
            "RUBIKA_BOT_TOKEN is not configured."
        );
    }

    const response =
        await fetch(
            `https://botapi.rubika.ir/v3/${env.RUBIKA_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        chat_id:
                            String(
                                chatId
                            ),

                        text:
                            String(
                                text
                            )
                    })
            }
        );

    if (!response.ok) {

        throw new Error(
            `Rubika API returned HTTP ${response.status}`
        );
    }

    return response.json();
}


/* =========================================================
   LEADERBOARD
========================================================= */

function normalizeLeaderboardType(value) {

    return (
        value === "coins"
            ? "coins"
            : "level"
    );
}


async function getLeaderboardPlayers(
    env
) {

    const result =
        await env.DB
            .prepare(
                `
                SELECT
                    u.id,
                    u.username,

                    COALESCE(
                        ps.level,
                        1
                    ) AS d1_level,

                    COALESCE(
                        ps.coins,
                        0
                    ) AS d1_coins,

                    rl.rubika_sender_id

                FROM users u

                LEFT JOIN player_stats ps
                    ON ps.user_id =
                        u.id

                LEFT JOIN rubika_links rl
                    ON rl.user_id =
                        u.id

                ORDER BY
                    u.id ASC
                `
            )
            .all();

    const basePlayers =
        result.results ?? [];

    return Promise.all(
        basePlayers.map(
            async player => {

                let level =
                    Number(
                        player.d1_level ??
                        1
                    );

                let coins =
                    Number(
                        player.d1_coins ??
                        0
                    );

                if (
                    player.rubika_sender_id
                ) {

                    const renderPlayer =
                        await getPlayerFromRender(
                            env,
                            player.rubika_sender_id
                        );

                    if (
                        renderPlayer
                    ) {

                        level =
                            Number(
                                renderPlayer.level ??
                                level
                            );

                        coins =
                            Number(
                                renderPlayer.coins ??
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
   VEXON MESSENGER — HELPERS
========================================================= */

async function ensureMessengerTables(env) {

    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `).run();


    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS conversation_members (
            conversation_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            last_read_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (
                conversation_id,
                user_id
            ),

            FOREIGN KEY (
                conversation_id
            )
            REFERENCES conversations(id)
            ON DELETE CASCADE,

            FOREIGN KEY (
                user_id
            )
            REFERENCES users(id)
            ON DELETE CASCADE
        )
    `).run();


    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversation_id INTEGER NOT NULL,

            sender_id INTEGER NOT NULL,

            content TEXT NOT NULL,

            created_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            deleted_at TEXT,

            FOREIGN KEY (
                conversation_id
            )
            REFERENCES conversations(id)
            ON DELETE CASCADE,

            FOREIGN KEY (
                sender_id
            )
            REFERENCES users(id)
            ON DELETE CASCADE
        )
    `).run();


    await env.DB.prepare(
        `
        CREATE INDEX IF NOT EXISTS
        idx_conversation_members_user

        ON conversation_members(user_id)
        `
    ).run();


    await env.DB.prepare(
        `
        CREATE INDEX IF NOT EXISTS
        idx_messages_conversation

        ON messages(
            conversation_id,
            id
        )
        `
    ).run();

}


async function messengerAccess(
    request,
    env
) {

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
        await getActiveBan(
            user.id,
            env
        );


    if (
        ban &&
        ban.ban_type ===
            "full"
    ) {

        return {
            ok: false,
            status: 403,
            user,
            ban
        };

    }


    return {
        ok: true,
        status: 200,
        user,
        ban
    };

}


async function messengerConversationMember(
    env,
    conversationId,
    userId
) {

    return await env.DB
        .prepare(
            `
            SELECT
                conversation_id,
                user_id,
                last_read_at

            FROM conversation_members

            WHERE
                conversation_id = ?1
                AND user_id = ?2

            LIMIT 1
            `
        )
        .bind(
            conversationId,
            userId
        )
        .first();

}


/* =========================================================
   MAIN WORKER
========================================================= */

export default {

    async fetch(
        request,
        env
    ) {

        const url =
            new URL(
                request.url
            );


        /* =====================================================
           REGISTER
        ===================================================== */

        if (
            url.pathname ===
                "/api/register" &&
            request.method ===
                "POST"
        ) {

            try {

                const body =
                    await request.json();

                const username =
                    typeof body.username ===
                    "string"
                        ? body.username.trim()
                        : "";

                const password =
                    typeof body.password ===
                    "string"
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

                const existingUser =
                    await env.DB
                        .prepare(
                            `
                            SELECT id
                            FROM users
                            WHERE username = ?1
                            LIMIT 1
                            `
                        )
                        .bind(username)
                        .first();

                if (
                    existingUser
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "این نام کاربری قبلاً ثبت شده است."
                        },
                        409
                    );
                }

                const passwordHash =
                    await hashPassword(
                        password
                    );

                const insertResult =
                    await env.DB
                        .prepare(
                            `
                            INSERT INTO users
                                (
                                    username,
                                    password_hash,
                                    created_at
                                )
                            VALUES
                                (
                                    ?1,
                                    ?2,
                                    CURRENT_TIMESTAMP
                                )
                            `
                        )
                        .bind(
                            username,
                            passwordHash
                        )
                        .run();

                const userId =
                    insertResult
                        .meta
                        ?.last_row_id;

                if (!userId) {

                    return json(
                        {
                            success: false,

                            message:
                                "حساب ساخته نشد."
                        },
                        500
                    );
                }

                await env.DB
                    .prepare(
                        `
                        INSERT OR IGNORE INTO player_stats
                            (
                                user_id,
                                xp,
                                level,
                                coins
                            )
                        VALUES
                            (?1, 0, 1, 0)
                        `
                    )
                    .bind(userId)
                    .run();

                return json(
                    {
                        success: true,

                        message:
                            "حساب VEXON با موفقیت ساخته شد."
                    },
                    201
                );

            } catch (error) {

                console.error(
                    "REGISTER_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "خطایی در ساخت حساب رخ داد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           LOGIN
        ===================================================== */

        if (
            url.pathname ===
                "/api/login" &&
            request.method ===
                "POST"
        ) {

            try {

                const body =
                    await request.json();

                const username =
                    typeof body.username ===
                    "string"
                        ? body.username.trim()
                        : "";

                const password =
                    typeof body.password ===
                    "string"
                        ? body.password
                        : "";

                if (
                    !username ||
                    !password
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "نام کاربری و رمز عبور را وارد کن."
                        },
                        400
                    );
                }

                const user =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                id,
                                username,
                                password_hash
                            FROM users
                            WHERE username = ?1
                            LIMIT 1
                            `
                        )
                        .bind(username)
                        .first();

                if (!user) {

                    return json(
                        {
                            success: false,

                            message:
                                "نام کاربری یا رمز عبور اشتباه است."
                        },
                        401
                    );
                }

                const passwordCorrect =
                    await verifyPassword(
                        password,
                        user.password_hash
                    );

                if (
                    !passwordCorrect
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
                    .prepare(
                        `
                        INSERT OR IGNORE INTO player_stats
                            (
                                user_id,
                                xp,
                                level,
                                coins
                            )
                        VALUES
                            (?1, 0, 1, 0)
                        `
                    )
                    .bind(user.id)
                    .run();

                const sessionToken =
                    createSessionToken();

                const tokenHash =
                    await hashSessionToken(
                        sessionToken
                    );

                const expiresAt =
                    new Date(
                        Date.now() +
                        SESSION_DAYS *
                        24 *
                        60 *
                        60 *
                        1000
                    ).toISOString();

                await env.DB
                    .prepare(
                        `
                        INSERT INTO sessions
                            (
                                user_id,
                                token_hash,
                                expires_at
                            )
                        VALUES
                            (?1, ?2, ?3)
                        `
                    )
                    .bind(
                        user.id,
                        tokenHash,
                        expiresAt
                    )
                    .run();

                return new Response(
                    JSON.stringify({
                        success: true,

                        message:
                            "ورود موفق بود.",

                        username:
                            user.username
                    }),
                    {
                        status: 200,

                        headers: {
                            "Content-Type":
                                "application/json; charset=UTF-8",

                            "Set-Cookie":
                                [
                                    "vexon_session=" +
                                        sessionToken,

                                    "HttpOnly",
                                    "Secure",
                                    "SameSite=Lax",
                                    "Path=/",

                                    `Max-Age=${
                                        SESSION_DAYS *
                                        24 *
                                        60 *
                                        60
                                    }`
                                ].join("; ")
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "LOGIN_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "خطایی هنگام ورود رخ داد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           CURRENT USER
        ===================================================== */

        if (
            url.pathname ===
                "/api/me" &&
            request.method ===
                "GET"
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
                            loggedIn: false
                        },
                        401
                    );
                }

                const ban =
                    await getActiveBan(
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
                            ban?.ban_type ??
                            null,

                        ban_reason:
                            ban?.reason ??
                            null,

                        banned_until:
                            ban?.banned_until ??
                            null
                    }
                });

            } catch (error) {

                console.error(
                    "ME_ERROR",
                    error
                );

                return json(
                    {
                        loggedIn: false
                    },
                    401
                );
            }
        }


        /* =====================================================
           COMMUNITY STATS
           فقط اکانت‌ها
        ===================================================== */

        if (
            url.pathname ===
                "/api/community/stats" &&
            request.method ===
                "GET"
        ) {

            try {

                const totalUsers =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                COUNT(*) AS total_users
                            FROM users
                            `
                        )
                        .first();

                const todayUsers =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                COUNT(*) AS today_users
                            FROM users
                            WHERE
                                created_at IS NOT NULL
                                AND date(created_at) =
                                    date('now')
                            `
                        )
                        .first();

                return json({
                    success: true,

                    total_users:
                        Number(
                            totalUsers?.total_users ??
                            0
                        ),

                    today_users:
                        Number(
                            todayUsers?.today_users ??
                            0
                        )
                });

            } catch (error) {

                console.error(
                    "COMMUNITY_STATS_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        total_users: 0,
                        today_users: 0
                    },
                    500
                );
            }
        }


        /* =====================================================
           LEADERBOARD
        ===================================================== */

        if (
            url.pathname ===
                "/api/leaderboard" &&
            request.method ===
                "GET"
        ) {

            try {

                const type =
                    normalizeLeaderboardType(
                        url.searchParams.get(
                            "type"
                        )
                    );

                const limitValue =
                    Number(
                        url.searchParams.get(
                            "limit"
                        ) ?? 50
                    );

                const limit =
                    Math.min(
                        100,
                        Math.max(
                            1,

                            Number.isFinite(
                                limitValue
                            )
                                ? Math.floor(
                                    limitValue
                                )
                                : 50
                        )
                    );

                const players =
                    await getLeaderboardPlayers(
                        env
                    );

                if (
                    type ===
                    "coins"
                ) {

                    players.sort(
                        (
                            a,
                            b
                        ) => {

                            if (
                                b.coins !==
                                a.coins
                            ) {
                                return (
                                    b.coins -
                                    a.coins
                                );
                            }

                            if (
                                b.level !==
                                a.level
                            ) {
                                return (
                                    b.level -
                                    a.level
                                );
                            }

                            return (
                                a.id -
                                b.id
                            );
                        }
                    );

                    return json({
                        success: true,

                        type:
                            "coins",

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

                                        coins:
                                            player.coins
                                    })
                                )
                    });
                }

                players.sort(
                    (
                        a,
                        b
                    ) => {

                        if (
                            b.level !==
                            a.level
                        ) {
                            return (
                                b.level -
                                a.level
                            );
                        }

                        if (
                            b.coins !==
                            a.coins
                        ) {
                            return (
                                b.coins -
                                a.coins
                            );
                        }

                        return (
                            a.id -
                            b.id
                        );
                    }
                );

                return json({
                    success: true,

                    type:
                        "level",

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

                                    level:
                                        player.level
                                })
                            )
                });

            } catch (error) {

                console.error(
                    "LEADERBOARD_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        leaderboard: [],

                        message:
                            "دریافت لیدربورد انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN STATUS
        ===================================================== */

        if (
            url.pathname ===
                "/api/admin/me" &&
            request.method ===
                "GET"
        ) {

            const result =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !result.ok
            ) {

                return json(
                    {
                        success: false,
                        isAdmin: false
                    },
                    result.status
                );
            }

            return json({
                success: true,
                isAdmin: true,

                username:
                    result.user.username
            });
        }


        /* =====================================================
           PUBLIC NEWS LIST
        ===================================================== */

        if (
            url.pathname ===
                "/api/news" &&
            request.method ===
                "GET"
        ) {

            try {

                await ensureNewsTable(
                    env
                );

                const limitValue =
                    Number(
                        url.searchParams.get(
                            "limit"
                        ) ?? 20
                    );

                const limit =
                    Math.min(
                        50,
                        Math.max(
                            1,

                            Number.isFinite(
                                limitValue
                            )
                                ? Math.floor(
                                    limitValue
                                )
                                : 20
                        )
                    );

                const result =
                    await env.DB
                        .prepare(
                            `
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
                            WHERE status =
                                'published'
                            ORDER BY
                                published_at DESC,
                                id DESC
                            LIMIT ?1
                            `
                        )
                        .bind(limit)
                        .all();

                const news =
                    result.results ?? [];

                return json({
                    success: true,
                    news
                });

            } catch (error) {

                console.error(
                    "PUBLIC_NEWS_ERROR",
                    error
                );

                return json(
                    {
                        success: false,
                        news: []
                    },
                    500
                );
            }
        }


        /* =====================================================
           SINGLE PUBLIC NEWS
        ===================================================== */

        const publicNewsMatch =
            url.pathname.match(
                /^\/api\/news\/(\d+)$/
            );

        if (
            publicNewsMatch &&
            request.method ===
                "GET"
        ) {

            try {

                await ensureNewsTable(
                    env
                );

                const newsId =
                    Number(
                        publicNewsMatch[1]
                    );

                if (
                    !Number.isInteger(
                        newsId
                    ) ||
                    newsId <= 0
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "شناسه خبر نامعتبر است."
                        },
                        400
                    );
                }

                const news =
                    await env.DB
                        .prepare(
                            `
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
                                AND status =
                                    'published'
                            LIMIT 1
                            `
                        )
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

                return json({
                    success: true,
                    news
                });

            } catch (error) {

                console.error(
                    "PUBLIC_SINGLE_NEWS_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "دریافت خبر انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           REACTION
        ===================================================== */

        const reactionMatch =
            url.pathname.match(
                /^\/api\/news\/(\d+)\/reaction$/
            );

        if (
            reactionMatch &&
            request.method ===
                "POST"
        ) {

            const access =
                await getUserAccess(
                    request,
                    env
                );

            if (
                !access.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            "ابتدا وارد حساب VEXON شو."
                    },
                    401
                );
            }

            if (
                access.ban &&
                (
                    access.ban.ban_type ===
                        "full" ||
                    access.ban.ban_type ===
                        "reactions"
                )
            ) {

                return json(
                    {
                        success: false,

                        message:
                            access.ban.ban_type ===
                            "full"

                                ? "🚫 دسترسی این حساب به VEXON محدود شده است."

                                : "❤️ این حساب از واکنش به اخبار محروم شده است.",

                        banned: true,

                        ban_type:
                            access.ban.ban_type,

                        ban_reason:
                            access.ban.reason,

                        banned_until:
                            access.ban.banned_until
                    },
                    403
                );
            }

            try {

                const newsId =
                    Number(
                        reactionMatch[1]
                    );

                const body =
                    await request.json();

                const reaction =
                    typeof body.reaction ===
                    "string"
                        ? body.reaction.trim()
                        : "";

                if (
                    !Number.isInteger(
                        newsId
                    ) ||
                    newsId <= 0
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "شناسه خبر نامعتبر است."
                        },
                        400
                    );
                }

                if (
                    !isValidReaction(
                        reaction
                    )
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "نوع واکنش نامعتبر است."
                        },
                        400
                    );
                }

                const news =
                    await env.DB
                        .prepare(
                            `
                            SELECT id
                            FROM news
                            WHERE
                                id = ?1
                                AND status =
                                    'published'
                            LIMIT 1
                            `
                        )
                        .bind(newsId)
                        .first();

                if (!news) {

                    return json(
                        {
                            success: false,

                            message:
                                "خبر پیدا نشد."
                        },
                        404
                    );
                }

                const existing =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                id,
                                reaction
                            FROM news_reactions
                            WHERE
                                news_id = ?1
                                AND user_id = ?2
                            LIMIT 1
                            `
                        )
                        .bind(
                            newsId,
                            access.user.id
                        )
                        .first();

                if (
                    existing &&
                    existing.reaction ===
                        reaction
                ) {

                    await env.DB
                        .prepare(
                            `
                            DELETE FROM news_reactions
                            WHERE id = ?1
                            `
                        )
                        .bind(
                            existing.id
                        )
                        .run();

                } else if (
                    existing
                ) {

                    await env.DB
                        .prepare(
                            `
                            UPDATE news_reactions
                            SET
                                reaction = ?1,
                                created_at =
                                    CURRENT_TIMESTAMP
                            WHERE id = ?2
                            `
                        )
                        .bind(
                            reaction,
                            existing.id
                        )
                        .run();

                } else {

                    await env.DB
                        .prepare(
                            `
                            INSERT INTO news_reactions
                                (
                                    news_id,
                                    user_id,
                                    reaction,
                                    created_at
                                )
                            VALUES
                                (
                                    ?1,
                                    ?2,
                                    ?3,
                                    CURRENT_TIMESTAMP
                                )
                            `
                        )
                        .bind(
                            newsId,
                            access.user.id,
                            reaction
                        )
                        .run();
                }

                const counts =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                reaction,
                                COUNT(*) AS count
                            FROM news_reactions
                            WHERE news_id = ?1
                            GROUP BY reaction
                            `
                        )
                        .bind(newsId)
                        .all();

                const reactions = {};

                for (
                    const row of
                    counts.results ?? []
                ) {

                    reactions[
                        row.reaction
                    ] =
                        Number(
                            row.count ?? 0
                        );
                }

                const current =
                    await env.DB
                        .prepare(
                            `
                            SELECT reaction
                            FROM news_reactions
                            WHERE
                                news_id = ?1
                                AND user_id = ?2
                            LIMIT 1
                            `
                        )
                        .bind(
                            newsId,
                            access.user.id
                        )
                        .first();

                return json({
                    success: true,

                    reactions,

                    my_reaction:
                        current?.reaction ??
                        null
                });

            } catch (error) {

                console.error(
                    "NEWS_REACTION_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "ثبت واکنش انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN NEWS LIST
        ===================================================== */

        if (
            url.pathname ===
                "/api/admin/news" &&
            request.method ===
                "GET"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                await ensureNewsTable(
                    env
                );

                const result =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                id,
                                title,
                                content,
                                image_url,
                                category,
                                status,
                                author_username,
                                created_at,
                                updated_at,
                                published_at
                            FROM news
                            ORDER BY
                                created_at DESC,
                                id DESC
                            `
                        )
                        .all();

                return json({
                    success: true,

                    news:
                        result.results ??
                        []
                });

            } catch (error) {

                console.error(
                    "ADMIN_NEWS_LIST_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "دریافت اخبار انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN CREATE NEWS
        ===================================================== */

        if (
            url.pathname ===
                "/api/admin/news" &&
            request.method ===
                "POST"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                await ensureNewsTable(
                    env
                );

                const body =
                    await request.json();

                const title =
                    cleanNewsText(
                        body.title,
                        200
                    );

                const content =
                    cleanNewsText(
                        body.content,
                        20000
                    );

                const imageUrl =
                    cleanNewsText(
                        body.image_url,
                        1000
                    );

                const category =
                    cleanNewsText(
                        body.category ||
                        "general",
                        50
                    );

                const status =
                    normalizeNewsStatus(
                        body.status
                    );

                if (
                    title.length < 3
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "عنوان خبر حداقل باید ۳ کاراکتر باشد."
                        },
                        400
                    );
                }

                if (
                    content.length < 3
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "متن خبر خالی است."
                        },
                        400
                    );
                }

                const publishedAt =
                    status ===
                    "published"
                        ? new Date()
                            .toISOString()
                        : null;

                const result =
                    await env.DB
                        .prepare(
                            `
                            INSERT INTO news
                                (
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
                            VALUES
                                (
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
                            `
                        )
                        .bind(
                            title,
                            content,
                            imageUrl ||
                                null,
                            category ||
                                "general",
                            status,
                            admin.user.username,
                            publishedAt
                        )
                        .run();

                return json(
                    {
                        success: true,

                        message:
                            status ===
                            "published"
                                ? "خبر منتشر شد."
                                : "خبر به‌عنوان پیش‌نویس ذخیره شد.",

                        id:
                            result.meta
                                ?.last_row_id
                    },
                    201
                );

            } catch (error) {

                console.error(
                    "ADMIN_NEWS_CREATE_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "ساخت خبر انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN NEWS UPDATE / DELETE
        ===================================================== */

        const newsIdMatch =
            url.pathname.match(
                /^\/api\/admin\/news\/(\d+)$/
            );

        if (
            newsIdMatch &&
            request.method ===
                "PUT"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                await ensureNewsTable(
                    env
                );

                const newsId =
                    Number(
                        newsIdMatch[1]
                    );

                const body =
                    await request.json();

                const existing =
                    await env.DB
                        .prepare(
                            `
                            SELECT *
                            FROM news
                            WHERE id = ?1
                            LIMIT 1
                            `
                        )
                        .bind(newsId)
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

                const title =
                    cleanNewsText(
                        body.title ??
                            existing.title,
                        200
                    );

                const content =
                    cleanNewsText(
                        body.content ??
                            existing.content,
                        20000
                    );

                const imageUrl =
                    cleanNewsText(
                        body.image_url ??
                            existing.image_url ??
                            "",
                        1000
                    );

                const category =
                    cleanNewsText(
                        body.category ??
                            existing.category ??
                            "general",
                        50
                    );

                const status =
                    normalizeNewsStatus(
                        body.status ??
                            existing.status
                    );

                if (
                    title.length < 3
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "عنوان خبر حداقل باید ۳ کاراکتر باشد."
                        },
                        400
                    );
                }

                if (
                    content.length < 3
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "متن خبر خالی است."
                        },
                        400
                    );
                }

                let publishedAt =
                    existing.published_at;

                if (
                    status ===
                        "published" &&
                    !publishedAt
                ) {

                    publishedAt =
                        new Date()
                            .toISOString();
                }

                if (
                    status ===
                    "draft"
                ) {

                    publishedAt =
                        null;
                }

                await env.DB
                    .prepare(
                        `
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
                        `
                    )
                    .bind(
                        title,
                        content,
                        imageUrl ||
                            null,
                        category ||
                            "general",
                        status,
                        publishedAt,
                        newsId
                    )
                    .run();

                return json({
                    success: true,

                    message:
                        "خبر با موفقیت ویرایش شد."
                });

            } catch (error) {

                console.error(
                    "ADMIN_NEWS_UPDATE_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "ویرایش خبر انجام نشد."
                    },
                    500
                );
            }
        }


        if (
            newsIdMatch &&
            request.method ===
                "DELETE"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                const newsId =
                    Number(
                        newsIdMatch[1]
                    );

                const existing =
                    await env.DB
                        .prepare(
                            `
                            SELECT id
                            FROM news
                            WHERE id = ?1
                            LIMIT 1
                            `
                        )
                        .bind(newsId)
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

                await env.DB
                    .prepare(
                        `
                        DELETE FROM news
                        WHERE id = ?1
                        `
                    )
                    .bind(newsId)
                    .run();

                return json({
                    success: true,

                    message:
                        "خبر حذف شد."
                });

            } catch (error) {

                console.error(
                    "ADMIN_NEWS_DELETE_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "حذف خبر انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           SUPPORT SEND
        ===================================================== */

        if (
            url.pathname ===
                "/api/support/send" &&
            request.method ===
                "POST"
        ) {

            const access =
                await getUserAccess(
                    request,
                    env
                );

            if (
                !access.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            "ابتدا وارد حساب VEXON شو."
                    },
                    401
                );
            }

            if (
                access.ban &&
                (
                    access.ban.ban_type ===
                        "full" ||
                    access.ban.ban_type ===
                        "messages"
                )
            ) {

                return json(
                    {
                        success: false,

                        message:
                            access.ban.ban_type ===
                            "full"

                                ? "🚫 دسترسی این حساب به VEXON محدود شده است."

                                : "💬 این حساب از ارسال پیام محروم شده است.",

                        banned: true,

                        ban_type:
                            access.ban.ban_type,

                        ban_reason:
                            access.ban.reason,

                        banned_until:
                            access.ban.banned_until
                    },
                    403
                );
            }

            try {

                const body =
                    await request.json();

                const message =
                    typeof body.message ===
                    "string"
                        ? body.message
                            .trim()
                            .slice(0, 5000)
                        : "";

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

                const result =
                    await env.DB
                        .prepare(
                            `
                            INSERT INTO support_messages
                                (
                                    user_id,
                                    username,
                                    message,
                                    reply,
                                    status,
                                    created_at,
                                    replied_at
                                )
                            VALUES
                                (
                                    ?1,
                                    ?2,
                                    ?3,
                                    NULL,
                                    'new',
                                    CURRENT_TIMESTAMP,
                                    NULL
                                )
                            `
                        )
                        .bind(
                            access.user.id,
                            access.user.username,
                            message
                        )
                        .run();

                return json(
                    {
                        success: true,

                        message:
                            "پیامت با موفقیت برای مدیریت ارسال شد. 💚",

                        id:
                            result.meta
                                ?.last_row_id
                    },
                    201
                );

            } catch (error) {

                console.error(
                    "SUPPORT_SEND_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "ارسال پیام انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           SUPPORT MY
        ===================================================== */

        if (
            url.pathname ===
                "/api/support/my" &&
            request.method ===
                "GET"
        ) {

            const access =
                await getUserAccess(
                    request,
                    env
                );

            if (
                !access.ok
            ) {

                return json(
                    {
                        success: false,

                        messages: [],

                        message:
                            "ابتدا وارد حساب VEXON شو."
                    },
                    401
                );
            }

            try {

                const result =
                    await env.DB
                        .prepare(
                            `
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
                            `
                        )
                        .bind(
                            access.user.id
                        )
                        .all();

                return json({
                    success: true,

                    messages:
                        result.results ??
                        []
                });

            } catch (error) {

                console.error(
                    "SUPPORT_MY_ERROR",
                    error
                );

                return json(
                    {
                        success: false,
                        messages: []
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN SUPPORT
        ===================================================== */

        if (
            url.pathname ===
                "/api/admin/support" &&
            request.method ===
                "GET"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                const result =
                    await env.DB
                        .prepare(
                            `
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
                                    WHEN status =
                                        'new'
                                    THEN 0
                                    ELSE 1
                                END,
                                created_at DESC,
                                id DESC
                            LIMIT 200
                            `
                        )
                        .all();

                return json({
                    success: true,

                    messages:
                        result.results ??
                        []
                });

            } catch (error) {

                console.error(
                    "ADMIN_SUPPORT_LIST_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        messages: [],

                        message:
                            "دریافت پیام‌ها انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN SUPPORT REPLY
        ===================================================== */

        const supportReplyMatch =
            url.pathname.match(
                /^\/api\/admin\/support\/(\d+)\/reply$/
            );

        if (
            supportReplyMatch &&
            request.method ===
                "POST"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                const messageId =
                    Number(
                        supportReplyMatch[1]
                    );

                const body =
                    await request.json();

                const reply =
                    typeof body.reply ===
                    "string"
                        ? body.reply
                            .trim()
                            .slice(0, 5000)
                        : "";

                if (
                    !Number.isInteger(
                        messageId
                    ) ||
                    messageId <= 0
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "شناسه پیام نامعتبر است."
                        },
                        400
                    );
                }

                if (
                    !reply
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "متن پاسخ خالی است."
                        },
                        400
                    );
                }

                const existing =
                    await env.DB
                        .prepare(
                            `
                            SELECT id
                            FROM support_messages
                            WHERE id = ?1
                            LIMIT 1
                            `
                        )
                        .bind(
                            messageId
                        )
                        .first();

                if (!existing) {

                    return json(
                        {
                            success: false,

                            message:
                                "پیام پیدا نشد."
                        },
                        404
                    );
                }

                await env.DB
                    .prepare(
                        `
                        UPDATE support_messages
                        SET
                            reply = ?1,
                            status = 'replied',
                            replied_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?2
                        `
                    )
                    .bind(
                        reply,
                        messageId
                    )
                    .run();

                return json({
                    success: true,

                    message:
                        "پاسخ با موفقیت ارسال شد."
                });

            } catch (error) {

                console.error(
                    "ADMIN_SUPPORT_REPLY_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "ارسال پاسخ انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN USERS
        ===================================================== */

        if (
            url.pathname ===
                "/api/admin/users" &&
            request.method ===
                "GET"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                const result =
                    await env.DB
                        .prepare(
                            `
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
                                ON ps.user_id =
                                    u.id

                            LEFT JOIN user_bans ub
                                ON ub.user_id =
                                    u.id
                                AND ub.active = 1
                                AND (
                                    ub.banned_until
                                        IS NULL
                                    OR ub.banned_until = ''
                                    OR ub.banned_until >
                                        CURRENT_TIMESTAMP
                                )

                            ORDER BY
                                u.id DESC
                            `
                        )
                        .all();

                return json({
                    success: true,

                    users:
                        result.results ??
                        []
                });

            } catch (error) {

                console.error(
                    "ADMIN_USERS_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        users: [],

                        message:
                            "دریافت کاربران انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN BANS
        ===================================================== */

        if (
            url.pathname ===
                "/api/admin/bans" &&
            request.method ===
                "GET"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                const result =
                    await env.DB
                        .prepare(
                            `
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
                            `
                        )
                        .all();

                return json({
                    success: true,

                    bans:
                        result.results ??
                        []
                });

            } catch (error) {

                console.error(
                    "ADMIN_BANS_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        bans: [],

                        message:
                            "دریافت بن‌ها انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN BAN
        ===================================================== */

        const banUserMatch =
            url.pathname.match(
                /^\/api\/admin\/users\/(\d+)\/ban$/
            );

        if (
            banUserMatch &&
            request.method ===
                "POST"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                const userId =
                    Number(
                        banUserMatch[1]
                    );

                const body =
                    await request.json();

                const reason =
                    typeof body.reason ===
                    "string"
                        ? body.reason
                            .trim()
                            .slice(0, 500)
                        : "نقض قوانین VEXON";

                const banType =
                    normalizeBanType(
                        body.ban_type
                    );

                let bannedUntil =
                    null;

                if (
                    body.banned_until &&
                    typeof body.banned_until ===
                        "string"
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

                const target =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                id,
                                username
                            FROM users
                            WHERE id = ?1
                            LIMIT 1
                            `
                        )
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
                    .prepare(
                        `
                        UPDATE user_bans
                        SET active = 0
                        WHERE
                            user_id = ?1
                            AND active = 1
                        `
                    )
                    .bind(userId)
                    .run();

                await env.DB
                    .prepare(
                        `
                        INSERT INTO user_bans
                            (
                                user_id,
                                reason,
                                ban_type,
                                banned_until,
                                created_at,
                                active
                            )
                        VALUES
                            (
                                ?1,
                                ?2,
                                ?3,
                                ?4,
                                CURRENT_TIMESTAMP,
                                1
                            )
                        `
                    )
                    .bind(
                        userId,
                        reason,
                        banType,
                        bannedUntil
                    )
                    .run();

                return json({
                    success: true,

                    message:
                        "محدودیت کاربر اعمال شد.",

                    username:
                        target.username,

                    ban_type:
                        banType,

                    ban_label:
                        getBanLabel(
                            banType
                        ),

                    banned_until:
                        bannedUntil
                });

            } catch (error) {

                console.error(
                    "ADMIN_BAN_USER_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "اعمال محدودیت انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           ADMIN UNBAN
        ===================================================== */

        const unbanUserMatch =
            url.pathname.match(
                /^\/api\/admin\/users\/(\d+)\/unban$/
            );

        if (
            unbanUserMatch &&
            request.method ===
                "POST"
        ) {

            const admin =
                await requireAdmin(
                    request,
                    env
                );

            if (
                !admin.ok
            ) {

                return json(
                    {
                        success: false,

                        message:
                            admin.status ===
                            401
                                ? "ابتدا وارد حساب شو."
                                : "دسترسی ادمین ندارید."
                    },
                    admin.status
                );
            }

            try {

                const userId =
                    Number(
                        unbanUserMatch[1]
                    );

                await env.DB
                    .prepare(
                        `
                        UPDATE user_bans
                        SET active = 0
                        WHERE
                            user_id = ?1
                            AND active = 1
                        `
                    )
                    .bind(userId)
                    .run();

                return json({
                    success: true,

                    message:
                        "محدودیت کاربر برداشته شد."
                });

            } catch (error) {

                console.error(
                    "ADMIN_UNBAN_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "رفع محدودیت انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           LOGOUT
        ===================================================== */

        if (
            url.pathname ===
                "/api/logout" &&
            request.method ===
                "POST"
        ) {

            try {

                const sessionToken =
                    getCookie(
                        request,
                        "vexon_session"
                    );

                if (
                    sessionToken
                ) {

                    const tokenHash =
                        await hashSessionToken(
                            sessionToken
                        );

                    await env.DB
                        .prepare(
                            `
                            DELETE FROM sessions
                            WHERE token_hash = ?1
                            `
                        )
                        .bind(tokenHash)
                        .run();
                }

                return new Response(
                    JSON.stringify({
                        success:
                            true
                    }),
                    {
                        status:
                            200,

                        headers: {
                            "Content-Type":
                                "application/json; charset=UTF-8",

                            "Set-Cookie":
                                [
                                    "vexon_session=",
                                    "HttpOnly",
                                    "Secure",
                                    "SameSite=Lax",
                                    "Path=/",
                                    "Max-Age=0"
                                ].join("; ")
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "LOGOUT_ERROR",
                    error
                );

                return json(
                    {
                        success: false
                    },
                    500
                );
            }
        }


        /* =====================================================
           RUBIKA CREATE CODE
        ===================================================== */

        if (
            url.pathname ===
                "/api/rubika/create-code" &&
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
                                "ابتدا وارد حساب VEXON شو."
                        },
                        401
                    );
                }

                const code =
                    generateLinkCode();

                const expiresAt =
                    new Date(
                        Date.now() +
                        RUBIKA_CODE_MINUTES *
                        60 *
                        1000
                    ).toISOString();

                await env.DB
                    .prepare(
                        `
                        INSERT INTO rubika_link_codes
                            (
                                user_id,
                                code,
                                expires_at
                            )
                        VALUES
                            (?1, ?2, ?3)
                        ON CONFLICT(user_id)
                        DO UPDATE SET
                            code =
                                excluded.code,
                            expires_at =
                                excluded.expires_at
                        `
                    )
                    .bind(
                        user.id,
                        code,
                        expiresAt
                    )
                    .run();

                return json({
                    success: true,

                    code,

                    expires_at:
                        expiresAt
                });

            } catch (error) {

                console.error(
                    "RUBIKA_CODE_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "ساخت کد اتصال روبیکا انجام نشد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           RUBIKA LINK
        ===================================================== */

        if (
            url.pathname ===
                "/api/rubika/link" &&
            request.method ===
                "POST"
        ) {

            try {

                const receivedKey =
                    request.headers.get(
                        "X-VEXON-API-KEY"
                    );

                const normalizedReceivedKey =
                    typeof receivedKey ===
                    "string"
                        ? receivedKey.trim()
                        : "";

                const storedKey =
                    typeof env.VEXON_RUBIKA_API_KEY ===
                    "string"
                        ? env.VEXON_RUBIKA_API_KEY.trim()
                        : "";

                if (
                    !storedKey ||
                    !normalizedReceivedKey ||
                    normalizedReceivedKey !==
                        storedKey
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
                    typeof body.code ===
                    "string"
                        ? body.code.trim()
                        : "";

                const rubikaUserId =
                    body.rubika_user_id !==
                    undefined
                        ? String(
                            body.rubika_user_id
                        ).trim()
                        : "";

                if (
                    !/^\d{6}$/.test(
                        code
                    ) ||
                    !rubikaUserId
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
                        .prepare(
                            `
                            SELECT
                                user_id,
                                code,
                                expires_at
                            FROM rubika_link_codes
                            WHERE code = ?1
                            LIMIT 1
                            `
                        )
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

                    await env.DB
                        .prepare(
                            `
                            DELETE FROM rubika_link_codes
                            WHERE user_id = ?1
                            `
                        )
                        .bind(
                            linkCode.user_id
                        )
                        .run();

                    return json(
                        {
                            success: false,

                            message:
                                "کد اتصال منقضی شده است."
                        },
                        410
                    );
                }

                const existingLink =
                    await env.DB
                        .prepare(
                            `
                            SELECT
                                id,
                                user_id,
                                rubika_sender_id
                            FROM rubika_links
                            WHERE
                                user_id = ?1
                                OR rubika_sender_id = ?2
                            LIMIT 1
                            `
                        )
                        .bind(
                            linkCode.user_id,
                            rubikaUserId
                        )
                        .first();

                if (
                    existingLink
                ) {

                    return json(
                        {
                            success: false,

                            message:
                                "این حساب VEXON یا حساب روبیکا قبلاً متصل شده است."
                        },
                        409
                    );
                }

                await env.DB
                    .prepare(
                        `
                        INSERT INTO rubika_links
                            (
                                user_id,
                                rubika_sender_id,
                                rubika_chat_id
                            )
                        VALUES
                            (?1, ?2, ?3)
                        `
                    )
                    .bind(
                        linkCode.user_id,
                        rubikaUserId,
                        rubikaUserId
                    )
                    .run();

                await env.DB
                    .prepare(
                        `
                        DELETE FROM rubika_link_codes
                        WHERE user_id = ?1
                        `
                    )
                    .bind(
                        linkCode.user_id
                    )
                    .run();

                return json({
                    success: true,

                    message:
                        "حساب روبیکا با موفقیت متصل شد."
                });

            } catch (error) {

                console.error(
                    "RUBIKA_LINK_ERROR",
                    error
                );

                return json(
                    {
                        success: false,

                        message:
                            "خطایی هنگام اتصال حساب رخ داد."
                    },
                    500
                );
            }
        }


        /* =====================================================
           API TEST
        ===================================================== */

        if (
            url.pathname ===
                "/api/test" &&
            request.method ===
                "GET"
        ) {

            return json({
                success: true,

                message:
                    "VEXON API is online!"
            });
        }


        /* =====================================================
   VEXON MESSENGER
===================================================== */


/* =====================================================
   GET CONVERSATIONS
===================================================== */

if (
    url.pathname ===
        "/api/messenger/conversations" &&
    request.method ===
        "GET"
) {

    const access =
        await messengerAccess(
            request,
            env
        );


    if (!access.ok) {

        return json(
            {
                success: false,

                message:
                    access.ban?.ban_type ===
                    "full"

                        ? "دسترسی این حساب به VEXON محدود شده است."

                        : "ابتدا وارد حساب شو."
            },
            access.status
        );

    }


    try {

        await ensureMessengerTables(
            env
        );


        const result =
            await env.DB
                .prepare(
                    `
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
                            SELECT
                                COUNT(*)

                            FROM messages um

                            WHERE
                                um.conversation_id =
                                    c.id

                                AND um.sender_id !=
                                    ?1

                                AND um.deleted_at
                                    IS NULL

                                AND (
                                    cm.last_read_at
                                        IS NULL

                                    OR

                                    um.created_at >
                                        cm.last_read_at
                                )

                        ) AS unread_count

                    FROM conversations c

                    INNER JOIN
                        conversation_members cm

                        ON
                            cm.conversation_id =
                                c.id

                        AND
                            cm.user_id =
                                ?1

                    INNER JOIN
                        conversation_members ocm

                        ON
                            ocm.conversation_id =
                                c.id

                        AND
                            ocm.user_id !=
                                ?1

                    INNER JOIN users other

                        ON
                            other.id =
                                ocm.user_id

                    LEFT JOIN messages lm

                        ON
                            lm.id = (

                                SELECT
                                    MAX(id)

                                FROM messages m2

                                WHERE
                                    m2.conversation_id =
                                        c.id

                                AND
                                    m2.deleted_at
                                        IS NULL
                            )

                    ORDER BY

                        COALESCE(
                            lm.created_at,
                            c.created_at
                        ) DESC,

                        c.id DESC
                    `
                )
                .bind(
                    access.user.id
                )
                .all();


        return json(
            {
                success: true,

                conversations:
                    result.results ??
                    []
            }
        );


    } catch (error) {

        console.error(
            "MESSENGER_CONVERSATIONS_ERROR",
            error
        );


        return json(
            {
                success: false,

                conversations: [],

                message:
                    "دریافت گفتگوها انجام نشد."
            },
            500
        );

    }

}


/* =====================================================
   SEARCH USERS
===================================================== */

if (
    url.pathname ===
        "/api/messenger/users/search" &&
    request.method ===
        "GET"
) {

    const access =
        await messengerAccess(
            request,
            env
        );


    if (!access.ok) {

        return json(
            {
                success: false,

                message:
                    "ابتدا وارد حساب شو."
            },
            access.status
        );

    }


    const q =
        (
            url.searchParams.get(
                "q"
            ) ||
            ""
        ).trim();


    if (
        q.length < 2
    ) {

        return json({
            success: true,

            users: []
        });

    }


    try {

        const result =
            await env.DB
                .prepare(
                    `
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
                    `
                )
                .bind(
                    access.user.id,

                    `%${q}%`
                )
                .all();


        return json({
            success: true,

            users:
                result.results ??
                []
        });


    } catch (error) {

        console.error(
            "MESSENGER_USER_SEARCH_ERROR",
            error
        );


        return json(
            {
                success: false,

                users: [],

                message:
                    "جستجوی کاربر انجام نشد."
            },
            500
        );

    }

}


/* =====================================================
   CREATE / GET CONVERSATION
===================================================== */

if (
    url.pathname ===
        "/api/messenger/conversations" &&
    request.method ===
        "POST"
) {

    const access =
        await messengerAccess(
            request,
            env
        );


    if (!access.ok) {

        return json(
            {
                success: false,

                message:
                    access.ban?.ban_type ===
                    "full"

                        ? "دسترسی این حساب به VEXON محدود شده است."

                        : "ابتدا وارد حساب شو."
            },
            access.status
        );

    }


    if (
        access.ban?.ban_type ===
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


    try {

        await ensureMessengerTables(
            env
        );


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
            targetUserId <= 0 ||
            targetUserId ===
                access.user.id
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
                .prepare(
                    `
                    SELECT
                        id,
                        username

                    FROM users

                    WHERE id = ?1

                    LIMIT 1
                    `
                )
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
                .prepare(
                    `
                    SELECT
                        c.id

                    FROM conversations c

                    INNER JOIN
                        conversation_members a

                        ON
                            a.conversation_id =
                                c.id

                        AND
                            a.user_id =
                                ?1

                    INNER JOIN
                        conversation_members b

                        ON
                            b.conversation_id =
                                c.id

                        AND
                            b.user_id =
                                ?2

                    WHERE NOT EXISTS (

                        SELECT
                            1

                        FROM conversation_members x

                        WHERE
                            x.conversation_id =
                                c.id

                            AND x.user_id NOT IN (
                                ?1,
                                ?2
                            )
                    )

                    LIMIT 1
                    `
                )
                .bind(
                    access.user.id,
                    targetUserId
                )
                .first();


        let conversationId =
            existing?.id;


        if (!conversationId) {

            const created =
                await env.DB
                    .prepare(
                        `
                        INSERT INTO
                            conversations
                        DEFAULT VALUES
                        `
                    )
                    .run();


            conversationId =
                created.meta?.last_row_id;


            if (!conversationId) {

                throw new Error(
                    "Conversation was not created."
                );

            }


            await env.DB
                .prepare(
                    `
                    INSERT INTO
                        conversation_members
                        (
                            conversation_id,
                            user_id
                        )

                    VALUES
                        (?1, ?2),
                        (?1, ?3)
                    `
                )
                .bind(
                    conversationId,
                    access.user.id,
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


    } catch (error) {

        console.error(
            "MESSENGER_CREATE_CONVERSATION_ERROR",
            error
        );


        return json(
            {
                success: false,

                message:
                    "ساخت گفتگو انجام نشد."
            },
            500
        );

    }

}


/* =====================================================
   GET MESSAGES
===================================================== */

const messengerMessagesMatch =
    url.pathname.match(
        /^\/api\/messenger\/conversations\/(\d+)\/messages$/
    );


if (
    messengerMessagesMatch &&
    request.method ===
        "GET"
) {

    const access =
        await messengerAccess(
            request,
            env
        );


    if (!access.ok) {

        return json(
            {
                success: false,

                message:
                    access.ban?.ban_type ===
                    "full"

                        ? "دسترسی این حساب به VEXON محدود شده است."

                        : "ابتدا وارد حساب شو."
            },
            access.status
        );

    }


    try {

        await ensureMessengerTables(
            env
        );


        const conversationId =
            Number(
                messengerMessagesMatch[1]
            );


        const member =
            await messengerConversationMember(
                env,
                conversationId,
                access.user.id
            );


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


        const result =
            await env.DB
                .prepare(
                    `
                    SELECT

                        m.id,

                        m.sender_id,

                        u.username
                            AS sender_username,

                        m.content,

                        m.created_at

                    FROM messages m

                    INNER JOIN users u
                        ON
                            u.id =
                                m.sender_id

                    WHERE
                        m.conversation_id =
                            ?1

                        AND
                            m.deleted_at
                                IS NULL

                    ORDER BY
                        m.id ASC

                    LIMIT 500
                    `
                )
                .bind(
                    conversationId
                )
                .all();


        return json({
            success: true,

            messages:
                result.results ??
                []
        });


    } catch (error) {

        console.error(
            "MESSENGER_MESSAGES_GET_ERROR",
            error
        );


        return json(
            {
                success: false,

                messages: [],

                message:
                    "دریافت پیام‌ها انجام نشد."
            },
            500
        );

    }

}


/* =====================================================
   SEND MESSAGE
===================================================== */

if (
    messengerMessagesMatch &&
    request.method ===
        "POST"
) {

    const access =
        await messengerAccess(
            request,
            env
        );


    if (!access.ok) {

        return json(
            {
                success: false,

                message:
                    access.ban?.ban_type ===
                    "full"

                        ? "دسترسی این حساب به VEXON محدود شده است."

                        : "ابتدا وارد حساب شو."
            },
            access.status
        );

    }


    if (
        access.ban?.ban_type ===
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


    try {

        await ensureMessengerTables(
            env
        );


        const conversationId =
            Number(
                messengerMessagesMatch[1]
            );


        const member =
            await messengerConversationMember(
                env,
                conversationId,
                access.user.id
            );


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


        const body =
            await request.json();


        const content =
            typeof body.content ===
            "string"

                ? body.content
                    .trim()
                    .slice(
                        0,
                        4000
                    )

                : "";


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


        const result =
            await env.DB
                .prepare(
                    `
                    INSERT INTO messages
                        (
                            conversation_id,
                            sender_id,
                            content
                        )

                    VALUES
                        (
                            ?1,
                            ?2,
                            ?3
                        )
                    `
                )
                .bind(
                    conversationId,
                    access.user.id,
                    content
                )
                .run();


        await env.DB
            .prepare(
                `
                UPDATE conversations

                SET
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE
                    id = ?1
                `
            )
            .bind(
                conversationId
            )
            .run();


        return json(
            {
                success: true,

                id:
                    result.meta
                        ?.last_row_id
            },
            201
        );


    } catch (error) {

        console.error(
            "MESSENGER_SEND_ERROR",
            error
        );


        return json(
            {
                success: false,

                message:
                    "ارسال پیام انجام نشد."
            },
            500
        );

    }

}


/* =====================================================
   MARK READ
===================================================== */

const messengerReadMatch =
    url.pathname.match(
        /^\/api\/messenger\/conversations\/(\d+)\/read$/
    );


if (
    messengerReadMatch &&
    request.method ===
        "POST"
) {

    const access =
        await messengerAccess(
            request,
            env
        );


    if (!access.ok) {

        return json(
            {
                success: false,

                message:
                    "ابتدا وارد حساب شو."
            },
            access.status
        );

    }


    try {

        await ensureMessengerTables(
            env
        );


        const conversationId =
            Number(
                messengerReadMatch[1]
            );


        const member =
            await messengerConversationMember(
                env,
                conversationId,
                access.user.id
            );


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


        await env.DB
            .prepare(
                `
                UPDATE
                    conversation_members

                SET
                    last_read_at =
                        CURRENT_TIMESTAMP

                WHERE
                    conversation_id =
                        ?1

                    AND user_id =
                        ?2
                `
            )
            .bind(
                conversationId,
                access.user.id
            )
            .run();


        return json({
            success: true
        });


    } catch (error) {

        console.error(
            "MESSENGER_READ_ERROR",
            error
        );


        return json(
            {
                success: false
            },
            500
        );

    }

}


/* =====================================================
   DELETE OWN MESSAGE
===================================================== */

const messengerDeleteMessageMatch =
    url.pathname.match(
        /^\/api\/messenger\/messages\/(\d+)$/
    );


if (
    messengerDeleteMessageMatch &&
    request.method ===
        "DELETE"
) {

    const access =
        await messengerAccess(
            request,
            env
        );


    if (!access.ok) {

        return json(
            {
                success: false,

                message:
                    "ابتدا وارد حساب شو."
            },
            access.status
        );

    }


    try {

        const messageId =
            Number(
                messengerDeleteMessageMatch[1]
            );


        const result =
            await env.DB
                .prepare(
                    `
                    UPDATE messages

                    SET
                        deleted_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        id = ?1

                        AND sender_id = ?2

                        AND deleted_at
                            IS NULL
                    `
                )
                .bind(
                    messageId,
                    access.user.id
                )
                .run();


        return json({
            success: true,

            changed:
                Number(
                    result.meta?.changes ??
                    0
                )
        });


    } catch (error) {

        console.error(
            "MESSENGER_DELETE_MESSAGE_ERROR",
            error
        );


        return json(
            {
                success: false,

                message:
                    "حذف پیام انجام نشد."
            },
            500
        );

    }

}


        /* =====================================================
           STATIC WEBSITE
        ===================================================== */

        return env.ASSETS.fetch(
            request
        );
    }
};