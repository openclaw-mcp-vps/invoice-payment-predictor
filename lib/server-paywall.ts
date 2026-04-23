import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/access";

export async function requireAccessUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const user = verifyAccessToken(token);

  if (!user) {
    redirect("/?paywall=locked");
  }

  return user;
}
