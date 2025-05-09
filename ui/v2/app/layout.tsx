import type React from "react"
import { LanguageProvider } from "@/contexts/language-context"
import "@/app/globals.css"

export const metadata = {
  title: "EDC Management Interface",
  description: "Interface for managing EDC Provider and Consumer",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}



import './globals.css'