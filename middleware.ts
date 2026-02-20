import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (isOnDashboard) {
    if (isLoggedIn) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  } else if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
