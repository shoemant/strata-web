import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

async function resolveBuildingIdsForRole(supabase, userId, role, profile) {
  // 1) Fast path: profile has building_id (common for tenants / simple setups)
  if (profile?.building_id) return [profile.building_id];

  // 2) Role-based lookup tables (adjust table/column names to your schema)
  if (role === "tenant") {
    // Option A: tenant belongs to one unit (unit has building_id)
    // Tables: tenant_units(user_id, unit_id) -> units(id, building_id)
    const { data, error } = await supabase
      .from("tenant_units")
      .select("unit:units(building_id)")
      .eq("user_id", userId);

    if (error) return null;

    const ids =
      (data || [])
        .map((r) => r.unit?.building_id)
        .filter(Boolean);

    return [...new Set(ids)];
  }

  if (role === "owner") {
    // Option A: direct mapping of owners to buildings
    // Table: owner_buildings(user_id, building_id)
    const { data, error } = await supabase
      .from("owner_buildings")
      .select("building_id")
      .eq("user_id", userId);

    if (!error) {
      const ids = (data || []).map((r) => r.building_id).filter(Boolean);
      if (ids.length) return [...new Set(ids)];
    }

    // Option B: owners mapped to units, units map to buildings
    // Tables: owner_units(user_id, unit_id) -> units(id, building_id)
    const { data: unitData, error: unitErr } = await supabase
      .from("owner_units")
      .select("unit:units(building_id)")
      .eq("user_id", userId);

    if (unitErr) return null;

    const ids =
      (unitData || [])
        .map((r) => r.unit?.building_id)
        .filter(Boolean);

    return [...new Set(ids)];
  }

  if (role === "manager") {
    const { data, error } = await supabase
      .from("manager_buildings")
      .select("building_id")
      .eq("user_id", userId);

    if (error) return null;

    const ids = (data || []).map((r) => r.building_id).filter(Boolean);
    return [...new Set(ids)];
  }

  return null;
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // IMPORTANT: select building_id too if you have it on the profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, building_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (!role) redirect("/login");

  const buildingIds = await resolveBuildingIdsForRole(
    supabase,
    user.id,
    role,
    profile
  );

  // If lookup failed, send them to a picker for that role
  if (!buildingIds) {
    if (role === "tenant") redirect("/tenant/select-building?next=dashboard");
    if (role === "owner") redirect("/owner/select-building?next=dashboard");
    if (role === "manager") redirect("/manager/select-building?next=dashboard");
    redirect("/login");
  }

  // If exactly one building, go straight to that building-scoped dashboard
  if (buildingIds.length === 1) {
    const bid = buildingIds[0];

    if (role === "tenant") redirect(`/tenant/buildings/${bid}/dashboard`);
    if (role === "owner") redirect(`/owner/buildings/${bid}/dashboard`);
    if (role === "manager") redirect(`/manager/buildings/${bid}/dashboard`);
  }

  // Zero or multiple buildings: picker flow
  if (role === "tenant") redirect("/tenant/select-building?next=dashboard");
  if (role === "owner") redirect("/owner/select-building?next=dashboard");
  if (role === "manager") redirect("/manager/select-building?next=dashboard");

  redirect("/login");
}
