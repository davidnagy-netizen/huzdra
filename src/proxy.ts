import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimista védelem: süti nélkül az admin oldalak a belépésre irányítanak, az admin API 401-et ad.
 * A süti aláírásának teljes ellenőrzése minden oldalon / végponton szerveroldalon történik.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const has = req.cookies.has("huzdra_admin");
  if (pathname.startsWith("/api/admin/") && !pathname.startsWith("/api/admin/login") && !has) {
    return NextResponse.json({ error: "Nincs jogosultság" }, { status: 401 });
  }
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !has) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
