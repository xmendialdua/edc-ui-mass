import { redirect } from "next/navigation"

// Redirect from root to edc-provider
export default function Home() {
  redirect("/edc-provider")
  return null
}

