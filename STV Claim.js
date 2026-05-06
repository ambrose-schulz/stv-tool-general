type Status = "ok" | "blocked" | "error";

// Mobile-first User-Agent pool to minimize desktop bot detection.
const USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; Samsung SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
];

export interface Env {
  BLOCKED_IPS?: string;
  ORIGIN_AUTH_KEY?: string;
}

const parseList = (input: string | undefined) =>
  (input ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // auth guard
    const incomingSecret = request.headers.get("x-worker-secret") || "";
    if (env.ORIGIN_AUTH_KEY && incomingSecret !== env.ORIGIN_AUTH_KEY) {
      return json({ status: "blocked", error: "invalid_secret" }, 401);
    }

    const target = url.searchParams.get("url") || "";
    if (!target) return json({ status: "error", error: "missing_url" }, 400);
    if (!/^https?:\/\//i.test(target)) {
      return json({ status: "error", error: "invalid_url" }, 400);
    }

    const blockedIps = parseList(env.BLOCKED_IPS);
    const clientIp = request.headers.get("cf-connecting-ip") || "";
    if (clientIp && blockedIps.includes(clientIp)) {
      return json({ status: "blocked", error: "ip_blocked" }, 403);
    }

    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const started = Date.now();
    let upstream: Response;
    try {
      upstream = await fetch(target, {
        redirect: "follow",
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.8",
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      return json({ status: "error", error: String(error) }, 502);
    }

    const durationMs = Date.now() - started;
    const html = await upstream.text();

    return json(
      {
        status: "ok" satisfies Status,
        target_url: target,
        http_status: upstream.status,
        fetched_at: new Date().toISOString(),
        duration_ms: durationMs,
        html,
      },
      upstream.ok ? 200 : upstream.status || 500,
    );
  },
};
