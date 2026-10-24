import withMT from "@material-tailwind/react/utils/withMT.js";

/** @type {import('tailwindcss').Config} */
export default withMT({
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {}, fontFamily: { sans: ["Inter", "sans-serif"] } },
  plugins: [],
});
