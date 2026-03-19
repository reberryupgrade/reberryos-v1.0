export const metadata = {
  title: "REBERRYOS",
  description: "Marketing Management System",
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon.png", type: "image/png" }], apple: "/icon.png" },
};
export default function RootLayout({ children }) {
  return <html lang="ko"><body style={{ margin: 0, padding: 0 }}>{children}</body></html>;
}
