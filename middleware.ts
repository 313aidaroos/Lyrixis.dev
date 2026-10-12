import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";

function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function middleware(request: NextRequest) {
  // Handle token_hash magic links BEFORE updateSession
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/auth/callback") {
    const token_hash = searchParams.get("token_hash");
    if (token_hash) {
      const next = safeNext(searchParams.get("next"));
      const response = NextResponse.redirect(new URL(next, request.url));

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(
              cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
            ) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        }
      );

      // CRITICAL: type: "email" accepts both signup + magiclink tokens
      const { error } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash,
      });

      if (error) {
        console.error("[auth/callback middleware] verifyOtp error:", error.message);
        return NextResponse.redirect(
          new URL(`/login?error=link_expired&next=${encodeURIComponent(next)}`, request.url)
        );
      }

      return response;
    }
  }

  // Standard session refresh for all other routes
  return updateSession(request);
}

export const config = {
  matcher: [
    "/auth/callback",
    "/dashboard/:path*",
    "/upload/:path*",
    "/tracks/:path*",
    "/team/:path*",
    "/admin/:path*",
    "/voice-songs/:path*",
    "/login",
    "/signup",
  ],
};
