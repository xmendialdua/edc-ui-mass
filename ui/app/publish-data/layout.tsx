import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mondragon Assembly Data Space",
  description: "Mondragon Assembly Document Sharing - Publish Data",
}

export default function PublishDataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
