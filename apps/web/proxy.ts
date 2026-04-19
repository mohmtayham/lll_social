import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/session";

export default async function proxy(req: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile"],
};
