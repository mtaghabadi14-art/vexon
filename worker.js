const PASSWORD_ITERATIONS = 100000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hashPassword(password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * =========================
     * REGISTER
     * =========================
     */
    if (
      url.pathname === "/api/register" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();

        const username =
          typeof body.username === "string"
            ? body.username.trim()
            : "";

        const password =
          typeof body.password === "string"
            ? body.password
            : "";

        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
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
              message: "رمز عبور باید حداقل ۸ کاراکتر باشد."
            },
            400
          );
        }

        const existingUser = await env.DB
          .prepare(
            "SELECT id FROM users WHERE username = ?1 LIMIT 1"
          )
          .bind(username)
          .first();

        if (existingUser) {
          return json(
            {
              success: false,
              message: "این نام کاربری قبلاً ثبت شده است."
            },
            409
          );
        }

        const passwordHash = await hashPassword(password);

        await env.DB
          .prepare(
            `
            INSERT INTO users
            (username, password_hash)
            VALUES (?1, ?2)
            `
          )
          .bind(username, passwordHash)
          .run();

        return json(
          {
            success: true,
            message: "حساب VEXON با موفقیت ساخته شد."
          },
          201
        );
      } catch (error) {
        console.error("REGISTER_ERROR", error);

        return json(
          {
            success: false,
            message: "خطایی در ساخت حساب رخ داد."
          },
          500
        );
      }
    }

    /*
     * =========================
     * API TEST
     * =========================
     */
    if (
      url.pathname === "/api/test" &&
      request.method === "GET"
    ) {
      return json({
        success: true,
        message: "VEXON API is online!"
      });
    }

    /*
     * =========================
     * STATIC WEBSITE
     * =========================
     */
    return env.ASSETS.fetch(request);
  }
};
