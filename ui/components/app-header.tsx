"use client"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { RefreshCw, Terminal, Menu, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useLanguage } from "@/contexts/language-context"
import { useAppSettings } from "@/contexts/app-settings-context"

type AppHeaderProps = {
  title: string
  alternateMode: string
  isRefreshing: boolean
  onRefresh: () => void
  onCheckApi: () => void
  onToggleApiMode: () => void
  apiMode: "mock" | "live"
}

export function AppHeader({
  title,
  alternateMode,
  isRefreshing,
  onRefresh,
  onCheckApi,
  onToggleApiMode,
  apiMode,
}: AppHeaderProps) {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { isFlDataAppEnabled, setIsFlDataAppEnabled } = useAppSettings()

  const navigateToAlternateMode = () => {
    router.push(alternateMode === "Provider Mode" ? "/edc-provider" : "/edc-consumer")
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white p-4 flex items-center justify-between border-b-2 border-lime-500">
      {/* Logo with hover effect and link */}
      <Link
        href="https://www.ikerlan.es/"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-transform duration-300 hover:scale-110"
      >
        <div className="h-12 w-36 relative">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ikerlan_BRTA_V2-kEfpkdzKLTDdzKZuFRUfTexpzGyQMk.png"
            alt="Ikerlan Logo"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </Link>

      {/* Centered title with larger font */}
      <div className="flex-1 flex justify-center">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-2xl font-bold hover:bg-gray-800 px-6 py-2">
                {title}
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 bg-black border-gray-700 text-white">
              <DropdownMenuItem
                className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                onClick={navigateToAlternateMode}
              >
                {alternateMode}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Settings dropdown with hamburger menu in green */}
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-gray-800">
              <Menu className="h-6 w-6 text-lime-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-black border-gray-700 text-white">
            <DropdownMenuItem
              className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
              onClick={onRefresh}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {t("refreshData")}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
              onClick={onCheckApi}
            >
              <Terminal className="h-4 w-4 mr-2" />
              {t("checkApi")}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
              onClick={onToggleApiMode}
            >
              <div className={`h-3 w-3 rounded-full mr-2 ${apiMode === "live" ? "bg-lime-500" : "bg-gray-500"}`} />
              {apiMode === "live" ? t("switchToMock") : t("switchToLive")}
            </DropdownMenuItem>

            {/* Proper horizontal separator */}
            <DropdownMenuSeparator className="bg-gray-700 my-1" />

            {/* Data Apps section */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="hover:bg-gray-800 focus:bg-gray-800 data-[state=open]:bg-lime-500 data-[state=open]:text-black font-medium">
                Data Apps
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-black border-gray-700 text-white">
                <div className="px-2 py-1.5 flex items-center space-x-2">
                  <Checkbox
                    id="fl-data-app"
                    checked={isFlDataAppEnabled}
                    onCheckedChange={(checked) => setIsFlDataAppEnabled(checked === true)}
                    className="data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
                  />
                  <Label htmlFor="fl-data-app" className="text-sm cursor-pointer">
                    FL Data App
                  </Label>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator className="bg-gray-700 my-1" />

            <DropdownMenuItem className="flex items-center hover:bg-gray-800 focus:bg-gray-800">
              {t("language")}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800 pl-6"
              onClick={() => setLanguage("en")}
            >
              <div className={`h-3 w-3 rounded-full mr-2 ${language === "en" ? "bg-lime-500" : "bg-gray-500"}`} />
              {t("english")}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center cursor-pointer hover:bg-gray-800 focus:bg-gray-800 pl-6"
              onClick={() => setLanguage("es")}
            >
              <div className={`h-3 w-3 rounded-full mr-2 ${language === "es" ? "bg-lime-500" : "bg-gray-500"}`} />
              {t("spanish")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
