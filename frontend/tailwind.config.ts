import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        mist: "#f4f7f7",
        teal: "#0f766e",
        coral: "#e85d4f",
        saffron: "#f4b63f"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(23, 32, 38, 0.10)"
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

export default config;
