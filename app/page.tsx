import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      {/* Top bar */}
      <header className="topbar">
        <div className="brand">
          <span className="dot" aria-hidden="true" />
          <span className="brandText">QuickDocs</span>
        </div>

        <nav className="nav">
          <Link className="btn btnGhost" href="/">
            Home
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="heroCard">
        <h1 className="heroTitle">Write it. Export it. Done.</h1>

        <p className="heroSub">
          QuickDocs generates clean estimates/proposals and exports a
          customer-ready PDF. No login. No database. No stress.
        </p>

        <div className="heroActions">
          <Link className="btn btnPrimary" href={`/documents/doc-${Date.now()}`}>
            Create New Document
          </Link>
        </div>
      </section>

      <style jsx>{`
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 18px 60px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 6px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #0a84ff;
          box-shadow: 0 0 0 6px rgba(10, 132, 255, 0.12);
        }

        .brandText {
          font-weight: 900;
          letter-spacing: -0.02em;
          font-size: 18px;
          color: rgba(0, 0, 0, 0.88);
        }

        .nav {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .heroCard {
          margin-top: 18px;
          border-radius: 26px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(10px);
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.08);
          padding: 34px 28px;
        }

        .heroTitle {
          margin: 0;
          font-size: clamp(34px, 4.2vw, 56px);
          line-height: 1.04;
          letter-spacing: -0.04em;
          font-weight: 950;
          color: rgba(0, 0, 0, 0.9);
        }

        .heroSub {
          margin: 14px 0 0;
          max-width: 680px;
          font-size: 16px;
          line-height: 1.6;
          color: rgba(0, 0, 0, 0.64);
        }

        .heroActions {
          margin-top: 18px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Buttons (match your apple-ish styling) */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          text-decoration: none;
          font-weight: 800;
          color: rgba(0, 0, 0, 0.8);
          background: rgba(255, 255, 255, 0.55);
          transition: transform 0.12s ease, box-shadow 0.12s ease,
            background 0.12s ease;
          user-select: none;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.8);
        }

        .btnPrimary {
          border-color: rgba(10, 132, 255, 0.28);
          background: rgba(10, 132, 255, 0.12);
          color: rgba(0, 0, 0, 0.88);
        }

 /* keep your existing globals if you prefer */
        .btnPrimary:hover {
          background: rgba(10, 132, 255, 0.18);
        }

        .btnGhost {
          background: rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </main>
  );
}
