import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: pages still verify the session with the API on every request.
export function proxy(req: NextRequest) {
  if (!req.cookies.has("rc_session")) {
    const url = new URL("/login", req.nextUrl);
    if (req.nextUrl.pathname !== "/") url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
