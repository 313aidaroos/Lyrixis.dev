"use server";

import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

async function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public env is missing");
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list: Array<{ name: string; value: string; options: CookieOptions }>) => {
        for (const cookie of list) {
          jar.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
}

function safeNext(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? "/");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

// 2026-09-28 Grok Developer Bot: plain-language auth errors for the login page.
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Invalid email or password.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first, or use a magic link.";
  if (/rate limit|too many/i.test(message)) return "Too many tries. Please wait a minute and try again.";
  if (/signups? not allowed|otp_disabled|user not found/i.test(message))
    return "No Lyrixis account uses this email yet. New here? Use Log in with Apixis ID to create your account.";
  return message;
}

/** Password sign-in (secondary option). Keeps ?next= (Grok, 2026-09-28). */
export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email.includes("@")) return { message: "Enter a valid email." };
  if (!password) return { message: "Enter your password." };
  const supabase = await client();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: friendly(error.message) };
  redirect(safeNext(form.get("next")));
}

/** Magic link: the default way in. `next` is where the user was headed */
export async function magicLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  if (!email.includes("@")) return { message: "Enter your email." };
  const supabase = await client();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://lyrixis.apixis.dev";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // 2026-10-04 (Grok): existing accounts only; new accounts use Apixis ID
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(`/set-password?next=${encodeURIComponent(next)}`)}`,
    },
  });
  if (error) return { message: friendly(error.message) };
  return { ok: true as const, message: `Check ${email} — the sign-in link is on its way.` };
}

/** Called from /set-password after a magic-link sign-in */
export async function setPassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  if (password.length < 8) return { message: "Password must be at least 8 characters." };
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Your sign-in link expired. Request a new one.", expired: true };
  const { error } = await supabase.auth.updateUser({ password, data: { password_set: true } });
  if (error) return { message: friendly(error.message) };
  redirect(next);
}
