"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  LayoutDashboard,
  BarChart3,
  ArrowLeftRight,
  CloudUpload,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Compare", href: "/compare", icon: ArrowLeftRight },
    { name: "Upload", href: "/upload", icon: CloudUpload },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-150">
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 z-40 h-screen w-[240px] flex-col bg-[#0F172A] text-white flex transition-colors duration-150"
        data-testid="sidebar"
      >
        <div className="flex h-16 items-center px-6 border-b border-[#1E293B]">
          <Link
            href="/"
            className="flex items-center gap-3"
            data-testid="link-home"
          >
            <TrendingUp className="h-6 w-6 text-teal-500" />
            <span className="text-lg font-bold tracking-tight text-white">
              Script Research
            </span>
          </Link>
        </div>

        <nav
          className="flex-1 space-y-1 px-3 py-6"
          data-testid="sidebar-nav"
        >
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#0D9488] text-white shadow-sm"
                    : "text-slate-300 hover:bg-[#1E293B] hover:text-white"
                }`}
                data-testid={`nav-item-${item.name.toLowerCase()}`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#1E293B] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              className="h-9 w-9 border border-slate-600 bg-[#1E293B]"
              data-testid="user-avatar"
            >
              <AvatarFallback className="bg-[#1E293B] text-slate-200">
                G
              </AvatarFallback>
            </Avatar>
            <span
              className="text-sm font-medium text-slate-200"
              data-testid="user-name"
            >
              Geeth
            </span>
          </div>
          <div
            className="flex items-center"
            data-testid="dark-mode-toggle-container"
          >
            <Switch
              checked={isDarkMode}
              onCheckedChange={setIsDarkMode}
              className="data-[state=checked]:bg-[#0D9488]"
              aria-label="Toggle dark mode"
              data-testid="dark-mode-toggle"
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[240px] flex flex-col min-h-0 bg-white dark:bg-gray-950 transition-colors duration-150">
        {children}
      </main>
    </div>
  );
}
