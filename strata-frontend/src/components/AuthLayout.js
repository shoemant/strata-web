"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthLayout({ children }) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    const isDark = mounted && theme === "dark";

    return (
        <div className="fixed inset-0 flex flex-col md:flex-row portrait:flex-col overflow-hidden">
            {/* ---------- Left column (image) ---------- */}
            <div
                className="
          h-1/3 md:h-auto
          md:basis-1/2 xl:basis-3/5
          portrait:h-1/3
          relative overflow-hidden
          bg-background 
        "
            >
                {/* Light image */}
                <Image
                    src="/images/apartment.svg"
                    alt="Apartment illustration light"
                    fill
                    priority
                    className={`transition-opacity duration-700
            object-center
            portrait:object-center
            md:object-contain
            xl:object-cover xl:object-center       /* 👈 restore cover on desktops */
            ${isDark ? "opacity-0" : "opacity-100"}
          `}
                />

                {/* Dark image */}
                <Image
                    src="/images/apartment-dark.svg"
                    alt="Apartment illustration dark"
                    fill
                    priority
                    className={`transition-opacity duration-700
            object-center
            portrait:object-center
            md:object-contain
            xl:object-cover xl:object-center
            ${isDark ? "opacity-100" : "opacity-0"}
          `}
                />

                {/* Optional subtle overlay for better contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/5 dark:from-black/30 dark:to-transparent pointer-events-none" />
            </div>

            {/* ---------- Right column (content) ---------- */}
            <div
                className="
          flex-1 flex flex-col items-center justify-center
          bg-background relative
          px-4 sm:px-6 md:px-8 lg:px-10
          portrait:h-2/3 portrait:justify-center
        "
            >
                {/* Dark mode toggle */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6">
                    <ThemeToggle />
                </div>

                {/* Login/signup container */}
                <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl portrait:flex portrait:items-center portrait:justify-center">
                    {children}
                </div>
            </div>
        </div>
    );
}
