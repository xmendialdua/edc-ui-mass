import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/contexts/language-context"
import { AppSettingsProvider } from "@/contexts/app-settings-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EDC Provider & Consumer",
  description: "EDC Provider & Consumer Interface",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider>
            <AppSettingsProvider>{children}</AppSettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'