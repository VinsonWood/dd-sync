"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    effectiveTheme: "light" | "dark"; // 实际应用的主题
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");
    const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(
        "light",
    );

    useEffect(() => {
        // 初始化主题
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        const initialTheme = savedTheme || "system";
        setThemeState(initialTheme);
        applyTheme(initialTheme);

        // 监听系统主题变化
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            if (theme === "system") {
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    const applyTheme = (newTheme: Theme) => {
        let isDark: boolean;

        if (newTheme === "system") {
            isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        } else {
            isDark = newTheme === "dark";
        }

        setEffectiveTheme(isDark ? "dark" : "light");

        const root = document.documentElement;
        if (isDark) {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("theme", newTheme);
        applyTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
