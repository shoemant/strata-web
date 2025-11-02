// app/login/lib/authActions.js
import { supabase } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export async function checkEmailForAccount(email) {
    const trimmed = email.trim().toLowerCase();

    // Check if user exists
    const { data, error } = await supabase
        .from("user_profiles")
        .select("id, role")
        .eq("email", trimmed)
        .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    return { exists: !!data, email: trimmed };
}

export async function getPendingInviteRole(email) {
    const { data } = await supabase
        .from("invitations")
        .select("role")
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

    return data?.role ?? null;
}

export async function signInWithPassword(email, password, rememberMe) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.session) {
        await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            options: { maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined },
        });
    }

    // Accept invites if present
    await supabase.rpc("accept_invites_for_current_user").catch(() => { });

    const { data: me } = await supabase.auth.getUser();
    return me?.user?.id ?? null;
}

export async function getProfileWithBuilding(userId) {
    const { data: profile, error } = await supabase
        .from("user_profiles")
        .select(`
      full_name,
      role,
      building_id,
      unit_id,
      units!user_profiles_unit_id_fkey ( building_id )
    `)
        .eq("id", userId)
        .maybeSingle();

    if (error) throw error;

    const buildingId = profile?.building_id || profile?.units?.building_id || null;
    return { profile, buildingId };
}

export function landingPath(role, buildingId) {
    switch (role) {
        case "manager":
            return buildingId ? `/manager/buildings/${buildingId}/dashboard` : `/manager/dashboard`;
        case "owner":
            return buildingId ? `/owner/buildings/${buildingId}/dashboard` : `/owner/dashboard`;
        case "tenant":
            return buildingId ? `/tenant/buildings/${buildingId}/dashboard` : `/tenant/dashboard`;
        default:
            return "/";
    }
}

export async function signUpUser(email, password) {
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
    });

    if (error) throw error;
}

export async function resendSignupEmail(email) {
    const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${location.origin}/` },
    });

    if (error) throw error;
}

export async function sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/login?reset=true#recover`,
    });

    if (error) throw error;
}
