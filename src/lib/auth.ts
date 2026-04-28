import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  cookieName: "dae_salary_session",
  password: process.env.SESSION_SECRET ?? "dae-salary-session-secret-min-32-chars!!",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};
