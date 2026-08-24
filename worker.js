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
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "no-store"
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

  const salt = crypto.getRandomValues(
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
        iterations: PASSWORD_ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );

  return [
    "pbkdf2",
    PASSWORD_ITERATIONS,
    toBase64(salt),
    toBase64(new Uint8Array(derivedBits))
  ].join("$");
}

async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");

    if (
      parts.length !== 4 ||
      parts[0] !== "pbkdf2"
    ) {
      return false;
    }

    const iterations = Number(parts[1]);
    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);

    const keyMaterial =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
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

    const actual = new Uint8Array(derivedBits);

    if (actual.length !== expected.length) {
      return false;
    }

    let difference = 0;

    for (let i = 0; i < actual.length; i++) {
      difference |= actual[i] ^ expected[i];
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
  const bytes = crypto.getRandomValues(
    new Uint8Array(32)
  );

  return Array.from(bytes)
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

async function hashSessionToken(token) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );

  return Array.from(new Uint8Array(digest))
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

function getCookie(request, name) {
  const cookieHeader =
    request.headers.get("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [
      key,
      ...valueParts
    ] = cookie.trim().split("=");

    if (key === name) {
      return valueParts.join("=") || null;
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

  return levels[level] ?? (level * 700);
}

/* =========================================================
   GET PLAYER FROM RENDER / SUPABASE
========================================================= */

async function getPlayerFromRender(env, rubikaUserId) {
  if (!env.VEXON_RUBIKA_API_KEY) {
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

    if (!response.ok) {
      console.error(
        "RENDER_PLAYER_ERROR",
        response.status
      );

      return null;
    }

    const data = await response.json();

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

async function getCurrentUser(request, env) {
  const sessionToken =
    getCookie(
      request,
      "vexon_session"
    );

  if (!sessionToken) {
    return null;
  }

  const tokenHash =
    await hashSessionToken(sessionToken);

  const session =
    await env.DB
      .prepare(
        `
        SELECT
          sessions.user_id,
          users.username
        FROM sessions
        INNER JOIN users
          ON users.id = sessions.user_id
        WHERE
          sessions.token_hash = ?1
          AND sessions.expires_at > datetime('now')
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

  /*
   * روبیکا متصل است:
   * Render → Supabase
   */

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
        Number(player.level ?? 1);

      const xp =
        Number(player.xp ?? 0);

      const coins =
        Number(player.coins ?? 0);

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
                (xp / nextXp) * 100
              )
            )
          : 0;

      return {
        id: session.user_id,

        username:
          session.username,

        rubika_user_id:
          String(
            player.user_id ??
            rubikaLink.rubika_sender_id
          ),

        nickname:
          player.nickname ?? null,

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
            player.typing_games ?? 0
          ),

        typing_best_time:
          Number(
            player.typing_best_time ?? 0
          ),

        typing_best_wpm:
          Number(
            player.typing_best_wpm ?? 0
          )
      };
    }
  }

  /*
   * Fallback → D1
   */

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
    Number(localStats?.xp ?? 0);

  const level =
    Number(localStats?.level ?? 1);

  const coins =
    Number(localStats?.coins ?? 0);

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
    id: session.user_id,

    username:
      session.username,

    rubika_user_id: null,
    nickname: null,

    title:
      "🥉 تازه‌کار",

    xp,
    level,

    next_xp:
      nextXp,

    xp_progress:
      progress,

    coins,

    typing_games: 0,
    typing_best_time: 0,
    typing_best_wpm: 0
  };
}

/* =========================================================
   ADMIN CHECK
========================================================= */

function isAdminUser(user, env) {
  if (!user) {
    return false;
  }

  const adminUsername =
    typeof env.ADMIN_USERNAME === "string"
      ? env.ADMIN_USERNAME.trim()
      : "";

  if (!adminUsername) {
    return false;
  }

  return user.username === adminUsername;
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

  if (!isAdminUser(user, env)) {
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

async function ensureNewsTable(env) {
  await env.DB
    .prepare(
      `
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
      `
    )
    .run();
}

/* =========================================================
   NEWS HELPERS
========================================================= */

function cleanNewsText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function normalizeNewsStatus(value) {
  return value === "published"
    ? "published"
    : "draft";
}

/* =========================================================
   RANDOM RUBIKA LINK CODE
========================================================= */

function generateLinkCode() {
  const bytes =
    crypto.getRandomValues(
      new Uint32Array(1)
    );

  return String(
    100000 +
    (bytes[0] % 900000)
  );
}

/* =========================================================
   RUBIKA SEND MESSAGE
========================================================= */

async function sendRubikaMessage(
  env,
  chatId,
  text
) {
  if (!env.RUBIKA_BOT_TOKEN) {
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

        body: JSON.stringify({
          chat_id: String(chatId),
          text: String(text)
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
   MAIN WORKER
========================================================= */

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    /* =====================================================
       REGISTER
    ===================================================== */

    if (
      url.pathname === "/api/register" &&
      request.method === "POST"
    ) {
      try {
        const body =
          await request.json();

        const username =
          typeof body.username === "string"
            ? body.username.trim()
            : "";

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

        if (password.length < 8) {
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

        if (existingUser) {
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
          await hashPassword(password);

        const insertResult =
          await env.DB
            .prepare(
              `
              INSERT INTO users
                (
                  username,
                  password_hash
                )
              VALUES
                (?1, ?2)
              `
            )
            .bind(
              username,
              passwordHash
            )
            .run();

        const userId =
          insertResult.meta?.last_row_id;

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
      url.pathname === "/api/login" &&
      request.method === "POST"
    ) {
      try {
        const body =
          await request.json();

        const username =
          typeof body.username === "string"
            ? body.username.trim()
            : "";

        const password =
          typeof body.password === "string"
            ? body.password
            : "";

        if (!username || !password) {
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

        if (!passwordCorrect) {
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
      url.pathname === "/api/me" &&
      request.method === "GET"
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

        return json({
          loggedIn: true,
          user
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
       ADMIN STATUS
    ===================================================== */

    if (
      url.pathname === "/api/admin/me" &&
      request.method === "GET"
    ) {
      const result =
        await requireAdmin(
          request,
          env
        );

      if (!result.ok) {
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
       PUBLIC NEWS
    ===================================================== */

    if (
      url.pathname === "/api/news" &&
      request.method === "GET"
    ) {
      try {
        await ensureNewsTable(env);

        const limitValue =
          Number(
            url.searchParams.get("limit") ?? 20
          );

        const limit =
          Math.min(
            50,
            Math.max(
              1,
              Number.isFinite(limitValue)
                ? Math.floor(limitValue)
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
              WHERE status = 'published'
              ORDER BY
                published_at DESC,
                id DESC
              LIMIT ?1
              `
            )
            .bind(limit)
            .all();

        return json({
          success: true,
          news:
            result.results ?? []
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
       ADMIN NEWS LIST
    ===================================================== */

    if (
      url.pathname === "/api/admin/news" &&
      request.method === "GET"
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

      try {
        await ensureNewsTable(env);

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
            result.results ?? []
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
      url.pathname === "/api/admin/news" &&
      request.method === "POST"
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

      try {
        await ensureNewsTable(env);

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
            body.category || "general",
            50
          );

        const status =
          normalizeNewsStatus(
            body.status
          );

        if (title.length < 3) {
          return json(
            {
              success: false,
              message:
                "عنوان خبر حداقل باید ۳ کاراکتر باشد."
            },
            400
          );
        }

        if (content.length < 3) {
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
          status === "published"
            ? new Date().toISOString()
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
              imageUrl || null,
              category || "general",
              status,
              admin.user.username,
              publishedAt
            )
            .run();

        return json(
          {
            success: true,
            message:
              status === "published"
                ? "خبر منتشر شد."
                : "خبر به‌عنوان پیش‌نویس ذخیره شد.",
            id:
              result.meta?.last_row_id
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
       ADMIN UPDATE NEWS
    ===================================================== */

    const newsIdMatch =
      url.pathname.match(
        /^\/api\/admin\/news\/(\d+)$/
      );

    if (
      newsIdMatch &&
      request.method === "PUT"
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

      try {
        await ensureNewsTable(env);

        const newsId =
          Number(newsIdMatch[1]);

        if (
          !Number.isInteger(newsId) ||
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

        if (title.length < 3) {
          return json(
            {
              success: false,
              message:
                "عنوان خبر حداقل باید ۳ کاراکتر باشد."
            },
            400
          );
        }

        if (content.length < 3) {
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
          status === "published" &&
          !publishedAt
        ) {
          publishedAt =
            new Date().toISOString();
        }

        if (status === "draft") {
          publishedAt = null;
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
              updated_at = CURRENT_TIMESTAMP,
              published_at = ?6
            WHERE id = ?7
            `
          )
          .bind(
            title,
            content,
            imageUrl || null,
            category || "general",
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

    /* =====================================================
       ADMIN DELETE NEWS
    ===================================================== */

    if (
      newsIdMatch &&
      request.method === "DELETE"
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

      try {
        await ensureNewsTable(env);

        const newsId =
          Number(newsIdMatch[1]);

        if (
          !Number.isInteger(newsId) ||
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
       LOGOUT
    ===================================================== */

    if (
      url.pathname === "/api/logout" &&
      request.method === "POST"
    ) {
      try {
        const sessionToken =
          getCookie(
            request,
            "vexon_session"
          );

        if (sessionToken) {
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
            success: true
          }),
          {
            status: 200,

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
       CREATE RUBIKA LINK CODE
    ===================================================== */

    if (
      url.pathname ===
        "/api/rubika/create-code" &&
      request.method === "POST"
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
              code = excluded.code,
              expires_at = excluded.expires_at
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
       LINK RUBIKA FROM RENDER
    ===================================================== */

    if (
      url.pathname === "/api/rubika/link" &&
      request.method === "POST"
    ) {
      try {
        const receivedKey =
          request.headers.get(
            "X-VEXON-API-KEY"
          );

        const normalizedReceivedKey =
          typeof receivedKey === "string"
            ? receivedKey.trim()
            : "";

        const storedKey =
          typeof env.VEXON_RUBIKA_API_KEY === "string"
            ? env.VEXON_RUBIKA_API_KEY.trim()
            : "";

        if (
          !storedKey ||
          !normalizedReceivedKey ||
          normalizedReceivedKey !== storedKey
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
          typeof body.code === "string"
            ? body.code.trim()
            : "";

        const rubikaUserId =
          body.rubika_user_id !== undefined
            ? String(
                body.rubika_user_id
              ).trim()
            : "";

        if (
          !/^\d{6}$/.test(code) ||
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
          ).getTime() <= Date.now()
        ) {
          await env.DB
            .prepare(
              `
              DELETE FROM rubika_link_codes
              WHERE user_id = ?1
              `
            )
            .bind(linkCode.user_id)
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

        if (existingLink) {
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
          .bind(linkCode.user_id)
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
      url.pathname === "/api/test" &&
      request.method === "GET"
    ) {
      return json({
        success: true,
        message:
          "VEXON API is online!"
      });
    }

    /* =====================================================
       STATIC WEBSITE
    ===================================================== */

    return env.ASSETS.fetch(request);
  }
};