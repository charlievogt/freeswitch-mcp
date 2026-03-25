export const metadata = {
  title: "FreeSWITCH Docs MCP Server",
  description: "MCP server providing FreeSWITCH, Kamailio, and Verto documentation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
