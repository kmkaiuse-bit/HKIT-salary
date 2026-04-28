import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/auth";
import type { SessionData } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { userId, password } = await request.json();

  const validUserId = process.env.APP_USER_ID;
  const validPassword = process.env.APP_PASSWORD;

  if (!validUserId || !validPassword) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  if (userId !== validUserId || password !== validPassword) {
    return NextResponse.json({ error: "ID 或密碼錯誤" }, { status: 401 });
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.isLoggedIn = true;
  session.userId = userId;
  await session.save();

  return NextResponse.json({ ok: true });
}
