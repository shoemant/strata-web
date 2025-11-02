"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { getProfileWithBuilding, landingPath } from "../lib/authActions";

export default function ResetStep({ direction }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      return setError(error.message);
    }

    // ✅ The user is already signed in — retrieve their profile and send them to the correct dashboard
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      // (Should not happen, but fallback)
      return router.replace("/login");
    }

    const { profile, buildingId } = await getProfileWithBuilding(user.id);
    const target = landingPath(profile?.role, buildingId);

    router.replace(target);
  };

  return (
    <motion.form
      key="reset"
      onSubmit={handleReset}
      initial={{ opacity: 0, x: -direction * 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * 100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="space-y-6"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-center">
        Choose a new password
      </h2>

      <motion.input
        whileFocus={{ scale: 1.02 }}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        required
        className="w-full p-3 rounded border border-input bg-background text-foreground
                   focus:ring-2 focus:ring-primary"
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full p-3 rounded bg-primary text-primary-foreground flex justify-center items-center gap-2"
      >
        {loading ? (
          <>
            <Spinner className="h-5 w-5" /> Updating…
          </>
        ) : (
          "Update Password"
        )}
      </button>
    </motion.form>
  );
}
