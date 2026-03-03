export const metadata = {
  title: "REBERRYOS",
  description: "마케팅 관리 시스템",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
