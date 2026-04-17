import { NextRequest, NextResponse } from "next/server";

// Simple password-based gate for admin routes. The password lives in the
// ADMIN_PASSWORD env var (set in Vercel); requests send it as the
// `x-admin-password` header. If the env var is unset the admin API refuses
// all requests — this is a fail-safe so a misconfigured deploy doesn't
// accidentally expose the editor.

export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD is not set on the server. Ask the admin to configure it in Vercel env vars.",
      },
      { status: 503 },
    );
  }
  const provided = req.headers.get("x-admin-password");
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
