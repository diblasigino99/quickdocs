import "./globals.css";

export const metadata = {
  title: "QuickDocs",
  description: "Apple-like MVP for docs + PDF export",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <div className="navInner">
            <div className="brand">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "var(--blue)",
                }}
              />
              QuickDocs
              <span className="pill">MVP</span>
            </div>

            <div className="row">
              <a className="btn btnGhost" href="/">
                Home
              </a>
              <span className="pill">Customer-ready PDF</span>
            </div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
