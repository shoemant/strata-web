"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"      // adds 'class="dark"' to <html>
      defaultTheme="system"  // uses system preference first
      enableSystem           // allows system dark/light preference
    >
      {children}
    </NextThemesProvider>
  )
}
