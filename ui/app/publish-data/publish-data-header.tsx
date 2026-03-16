"use client"
import Image from "next/image"
import Link from "next/link"
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

type PublishDataHeaderProps = {
  viewMode: "assets" | "contracts"
  isRefreshing: boolean
  onRefresh: () => void
  onCheckApi: () => void
  onViewModeChange: (mode: "assets" | "contracts") => void
}

export function PublishDataHeader({
  viewMode,
  isRefreshing,
  onRefresh,
  onCheckApi,
  onViewModeChange,
}: PublishDataHeaderProps) {
  const { language, setLanguage, t } = useLanguage()
  const { isFlDataAppEnabled, setIsFlDataAppEnabled } = useAppSettings()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white p-4 flex items-center justify-between border-b-2 border-lime-500">
      {/* Logo Mondragon Assembly - izquierda */}
      <Link
        href="https://www.mondragon-assembly.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-transform duration-300 hover:scale-110"
      >
        <div className="h-12 w-48 relative">
          <Image
            src="https://www.mondragon-assembly.com/wp-content/themes/ma2019/assets/layout/img/header-logo-mondragonassembly-40-v3.png"
            alt="Mondragon Assembly Logo"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </Link>

      {/* Centered title */}
      <div className="flex-1 flex justify-center">
        <h1 className="text-2xl font-bold text-white">Document Sharing</h1>
      </div>

      {/* Logo Ikerlan - derecha con menú settings */}
      <div className="flex items-center gap-4">
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

        {/* Settings dropdown with hamburger menu in green */}
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
