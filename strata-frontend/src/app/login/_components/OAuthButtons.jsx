"use client";

import { supabase } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";

export default function OAuthButtons({ email }) {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          prompt: "select_account", // 👈 ensures account chooser appears every time
        },
      },
    });
  };

  const signInWithApple = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          prompt: "select_account", // also works on Apple
        }
      }
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={signInWithGoogle}
        className="w-full flex items-center gap-3 justify-center border border-input rounded-md py-2 
                   bg-background hover:bg-muted transition"
      >
        <FcGoogle className="h-5 w-5" />
        <span>Continue with Google</span>
      </motion.button>
    </div>
  );
}
