// src/components/AuthLayout.js
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
        <div className="fixed inset-0 flex overflow-hidden">
            {/* ---------- Left column with fading image ---------- */}
            <div className="basis-3/5 bg-accent relative overflow-hidden">
                {/* Light image */}
                <Image
                    src="/images/apartment.svg"
                    alt="Apartment illustration light"
                    fill
                    priority
                    className={`object-cover transition-opacity duration-700 ${isDark ? "opacity-0" : "opacity-100"
                        }`}
                />
                {/* Dark image */}
                <Image
                    src="/images/apartment-dark.png"
                    alt="Apartment illustration dark"
                    fill
                    priority
                    className={`object-cover transition-opacity duration-700 absolute inset-0 ${isDark ? "opacity-100" : "opacity-0"
                        }`}
                />
            </div>

            {/* ---------- Right column ---------- */}
            <div className="basis-2/5 flex flex-col items-center justify-center bg-background overflow-hidden relative">
                {/* Dark mode toggle in corner */}
                <div className="absolute top-4 right-4">
                    <ThemeToggle />
                </div>
                <div className="w-full max-w-lg px-6">{children}</div>
            </div>
        </div>
    );
}
