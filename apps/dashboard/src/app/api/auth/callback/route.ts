import { Cookies } from "@/utils/constants";
import { LogEvents } from "@midday/events/events";
import { setupAnalytics } from "@midday/events/server";
import { getSession } from "@midday/supabase/cached-queries";
import { createClient } from "@midday/supabase/server";
import { addSeconds, addYears } from "date-fns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  console.log("[AUTH CALLBACK] Starting auth callback...");

  const cookieStore = await cookies();
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const client = requestUrl.searchParams.get("client");
  const returnTo = requestUrl.searchParams.get("return_to");
  const provider = requestUrl.searchParams.get("provider");

  console.log("[AUTH CALLBACK] Params:", { code: !!code, client, returnTo, provider });

  if (client === "desktop") {
    return NextResponse.redirect(`${requestUrl.origin}/verify?code=${code}`);
  }

  if (provider) {
    cookieStore.set(Cookies.PreferredSignInProvider, provider, {
      expires: addYears(new Date(), 1),
    });
  }

  if (code) {
    console.log("[AUTH CALLBACK] Exchanging code for session...");
    const supabase = await createClient();
    const exchangeResult = await supabase.auth.exchangeCodeForSession(code);
    console.log("[AUTH CALLBACK] Exchange result:", {
      success: !!exchangeResult.data.session,
      error: exchangeResult.error?.message
    });

    const {
      data: { session },
    } = await getSession();

    console.log("[AUTH CALLBACK] Session:", {
      exists: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    });

    if (session) {
      const userId = session.user.id;

      // Set cookie to force primary database reads for new users (10 seconds)
      // This prevents replication lag issues when user record hasn't replicated yet
      cookieStore.set(Cookies.ForcePrimary, "true", {
        expires: addSeconds(new Date(), 10),
        httpOnly: false, // Needs to be readable by client-side tRPC
        sameSite: "lax",
      });

      const analytics = await setupAnalytics();

      await analytics.track({
        event: LogEvents.SignIn.name,
        channel: LogEvents.SignIn.channel,
      });

      // If user is redirected from an invite, redirect to teams page to accept/decline the invite
      if (returnTo?.startsWith("teams/invite/")) {
        return NextResponse.redirect(`${requestUrl.origin}/teams`);
      }

      // If user have no teams, redirect to team creation
      console.log("[AUTH CALLBACK] Checking users_on_team for userId:", userId);
      const { count, error: teamError } = await supabase
        .from("users_on_team")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      console.log("[AUTH CALLBACK] users_on_team result:", { count, error: teamError?.message });

      if (count === 0 && !returnTo?.startsWith("teams/invite/")) {
        console.log("[AUTH CALLBACK] No teams found, redirecting to /teams/create");
        return NextResponse.redirect(`${requestUrl.origin}/teams/create`);
      }

      console.log("[AUTH CALLBACK] User has teams, proceeding...");
    } else {
      console.log("[AUTH CALLBACK] No session found after exchange!");
    }
  } else {
    console.log("[AUTH CALLBACK] No code provided!");
  }

  if (returnTo) {
    console.log("[AUTH CALLBACK] Redirecting to returnTo:", returnTo);
    return NextResponse.redirect(`${requestUrl.origin}/${returnTo}`);
  }

  console.log("[AUTH CALLBACK] Final redirect to origin:", requestUrl.origin);
  return NextResponse.redirect(requestUrl.origin);
}
