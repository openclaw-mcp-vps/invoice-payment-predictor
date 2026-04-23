import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

export async function getAccessEmailFromCookie() {
  const store = await cookies();
  const cookie = store.get(ACCESS_COOKIE_NAME)?.value;
  const payload = verifyAccessToken(cookie);
  return payload?.email || null;
}

export async function requirePaidAccess() {
  const email = await getAccessEmailFromCookie();

  if (!email) {
    redirect("/unlock");
  }

  return email;
}
