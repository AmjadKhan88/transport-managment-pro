import AuditLog from "../models/AuditLog.js";

const SENSITIVE = /pass|token|secret|cookie|authorization/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const ACTIONS = {
  POST: "create",
  PATCH: "update",
  PUT: "update",
  DELETE: "delete",
};

// Copy of the request body that is safe to store: secrets hidden, long text cut
function sanitize(value, depth = 0) {
  if (depth > 4) return "…";
  if (Array.isArray(value))
    return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SENSITIVE.test(k) ? "[hidden]" : sanitize(v, depth + 1),
      ]),
    );
  }
  if (typeof value === "string" && value.length > 300)
    return `${value.slice(0, 300)}…`;
  return value;
}

/**
 * Records who changed what. Logs every successful create/update/delete, logins (and failures),
 * logouts, password changes, backups/restores and blocked (403) attempts. GET requests are not logged.
 */
export function auditLogger(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const send = res.json.bind(res);
  res.json = (body) => {
    res.locals.auditBody = body;
    return send(body);
  };

  res.on("finish", () => {
    const status = res.statusCode;
    const path = req.originalUrl
      .split("?")[0]
      .replace(/^\/api\//, "")
      .replace(/\/$/, "");
    const [resource = "", second = "", third = ""] = path.split("/");

    let action = ACTIONS[req.method] ?? req.method.toLowerCase();
    let keep = status < 300;

    if (path === "auth/login") {
      action = status < 400 ? "login" : "login_failed";
      keep = true;
    } else if (path === "auth/logout") action = "logout";
    else if (path === "auth/change-password") action = "password_change";
    else if (resource === "backups" && third === "restore") action = "restore";
    else if (resource === "backups" && req.method === "POST") action = "backup";

    if (status === 403 && path !== "auth/login") {
      action = "forbidden";
      keep = true;
    }
    if (!keep) return;

    const loginUser = res.locals.auditBody?.data?.user;
    const who = req.user ?? null;
    const responseId = res.locals.auditBody?.data?.id;
    const details = path === "auth/login" ? undefined : sanitize(req.body);

    AuditLog.create({
      user: who?._id ?? loginUser?.id,
      userName: who?.name ?? loginUser?.name,
      userEmail:
        who?.email ??
        loginUser?.email ??
        (path === "auth/login"
          ? String(req.body?.email || "").toLowerCase()
          : undefined),
      role: who?.role ?? loginUser?.role,
      action,
      method: req.method,
      path: `/${path}`,
      resource,
      resourceId: OBJECT_ID.test(second)
        ? second
        : responseId
          ? String(responseId)
          : undefined,
      status,
      ip: req.ip,
      userAgent: (req.get("user-agent") || "").slice(0, 200),
      details: details && Object.keys(details).length ? details : undefined,
    }).catch((err) => console.error("Audit log failed:", err.message));
  });

  next();
}
