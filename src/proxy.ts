import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import type { SessionData } from "@/lib/auth";

const COOKIE_NAME = "dae_salary_session";
const SESSION_PASSWORD = process.env.SESSION_SECRET ?? "dae-salary-session-secret-min-32-chars!!";
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_PASSWORD,
    });
    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
