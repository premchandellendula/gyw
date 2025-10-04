"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeSwitch() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const isDark = theme === "dark";
    const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setTheme(isDark ? "light" : "dark");
    };

    return (
        <div className="flex items-center justify-between rounded-sm py-0.5">
            <span className="text-sm">Theme</span>

            <button
                onClick={handleToggle}
                aria-label="Toggle theme"
                className={`w-12 h-6 flex items-center rounded-full px-0.5 transition-colors duration-300 relative ${
                isDark ? "bg-gray-600" : "bg-gray-300"
                } cursor-pointer`}
            >
                <div
                    className={`w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                        isDark ? "translate-x-6 bg-gray-800" : "translate-x-0 bg-white"
                    }`}
                >
                    {isDark ? (
                        <Moon className="h-3.5 w-3.5 text-yellow-300" />
                    ) : (
                        <Sun className="h-3.5 w-3.5 text-yellow-500" />
                    )}
                </div>
            </button>
        </div>
    );
}
