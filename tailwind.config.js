/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "rgba(2, 6, 23, <alpha-value>)",
        secondary: "rgba(51, 65, 85, <alpha-value>)",
      },
      variants: {
        extend: {
          width: ["print"],
          height: ["print"],
        },
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
