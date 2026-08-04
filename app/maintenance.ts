import type { ChatGPTUser } from "./chatgpt-auth";

const enabledValues = new Set(["1", "true", "on", "enabled"]);

export function maintenanceModeEnabled(): boolean {
  return enabledValues.has((process.env.SITE_MAINTENANCE_MODE ?? "").trim().toLowerCase());
}

export function isMaintenanceOwner(user: ChatGPTUser | null): boolean {
  if (!user) return false;
  const allowedEmails = (process.env.SITE_MAINTENANCE_OWNER_EMAILS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(user.email.trim().toLowerCase());
}

export function maintenanceResponse(user: ChatGPTUser | null): Response | null {
  if (!maintenanceModeEnabled() || isMaintenanceOwner(user)) return null;
  return Response.json(
    { error: "FRAME 当前处于维护模式，请稍后再试。", code: "SITE_MAINTENANCE" },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } },
  );
}
