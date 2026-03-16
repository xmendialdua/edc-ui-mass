import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mondragon Assembly Data Space",
  description: "Mondragon Assembly Data Space - Client Access",
}

export default function ClientAccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
