export default function HomePage() {
  const id = `doc-${Date.now()}`;

  return (
    <main className="container">
      <section className="card" style={{ padding: 22 }}>
        <h1 className="h1">Write it. Export it. Done.</h1>
        <p className="p">
          QuickDocs is a simple MVP to generate clean estimates/proposals and export them as a PDF.
          No login. No database. No stress.
        </p>

        <div className="row" style={{ marginTop: 18 }}>
          <a className="btn btnPrimary" href={`/documents/${id}`}>
            Create New Document
          </a>
          <a className="btn" href="/documents/demo-doc">
            Open Demo
          </a>
        </div>

        <hr className="hr" />

        <div className="row">
          <span className="pill">Apple-like UI</span>
          <span className="pill">Local drafts</span>
          <span className="pill">Customer-ready PDF</span>
        </div>

        <p className="small" style={{ marginTop: 14 }}>
          Next: recent documents list + deploy to Vercel.
        </p>
      </section>
    </main>
  );
}
