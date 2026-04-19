import { authFetch } from "@/lib/authFetch";
import { BACKEND_URL } from "@/lib/constant";
import { deleteSession } from "@/lib/session";
import { redirect, RedirectType } from "next/navigation";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await authFetch(`${BACKEND_URL}/auth/signout`, {
      method: "POST",
    });
  } finally {
    await deleteSession();
  }

  redirect("/", RedirectType.push);
}
