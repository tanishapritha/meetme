import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#000000",
                foreground: "#ffffff",
                accent: {
                    primary: "#3b82f6",
                    success: "#10b981",
                    error: "#ef4444",
                    warning: "#f59e0b",
                    intel: "#8b5cf6",
                },
            },
            fontFamily: {
                mono: ["Geist Mono", "monospace"],
            },
        },
    },
    plugins: [],
};
export default config;
