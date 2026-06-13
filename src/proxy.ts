import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_NAME } from "@/lib/constants";
import { verifyTokenEdge } from "@/lib/session-edge";

// Routes that REQUIRE a logged-in user.
const PROTECTED = ["/upload", "/notifications", "/settings"];
// Auth pages a logged-in user shouldn't see.
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_NAME)?.value;
  const userId = token ? await verifyTokenEdge(token) : null;

  // Block protected routes for logged-out users.
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Keep logged-in users out of the auth pages.
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets, uploads, and image optimizer.
  matcher: ["/((?!_next/static|_next/image|uploads|favicon.ico).*)"],
};
