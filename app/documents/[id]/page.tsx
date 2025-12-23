"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LineItem = {
  id: string;
  title: string;
  qty: string; // keep as string for input simplicity
  rate: string;
};

type DocData = {
  // Branding
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  logoDataUrl: string | null; // data:image/png;base64,...

  // Customer + doc
  customerName: string;
  projectTitle: string;

  // Items + totals
  items: LineItem[];
  taxRate: string; // percent string

  // Notes/terms/payment
  notes: string;
  terms: string;
  paymentInfo: string;

  updatedAt: number;
};

function docKey(id: string) {
  return `qd:doc:${id}`;
}
function recentKey() {
  return "qd:recent";
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toNumber(input: string) {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DocumentPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Branding
  const [companyName, setCompanyName] = useState("Your Company");
  const [companyEmail, setCompanyEmail] = useState("you@email.com");
  const [companyPhone, setCompanyPhone] = useState("(555) 123-4567");
  const [companyAddress, setCompanyAddress] = useState("123 Main St, City, ST");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Customer + doc
  const [customerName, setCustomerName] = useState("");
  const [projectTitle, setProjectTitle] = useState("Estimate");

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), title: "Labor", qty: "1", rate: "0" },
  ]);

  // Totals
  const [taxRate, setTaxRate] = useState("0"); // %
  const subtotal = items.reduce((sum, it) => sum + toNumber(it.qty) * toNumber(it.rate), 0);
  const tax = subtotal * (toNumber(taxRate) / 100);
  const total = subtotal + tax;

  // Notes/terms/payment
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Valid for 14 days. Price includes labor and materials unless stated otherwise.");
  const [paymentInfo, setPaymentInfo] = useState("Payment due upon completion. Accepted: cash, check, Zelle, card.");

  // Status chip
  const [status, setStatus] = useState<"idle" | "saved" | "loaded" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const statusTimer = useRef<number | null>(null);

  function flash(next: typeof status) {
    setStatus(next);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus("idle"), 1200);
  }

  // Save / load
  function saveNow() {
    try {
      const data: DocData = {
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        logoDataUrl,

        customerName,
        projectTitle,

        items,
        taxRate,

        notes,
        terms,
        paymentInfo,

        updatedAt: Date.now(),
      };

      localStorage.setItem(docKey(id), JSON.stringify(data));

      const current = JSON.parse(localStorage.getItem(recentKey()) || "[]") as string[];
      const next = [id, ...current.filter((x) => x !== id)].slice(0, 12);
      localStorage.setItem(recentKey(), JSON.stringify(next));

      setLastSaved(data.updatedAt);
      flash("saved");
    } catch {
      flash("error");
    }
  }

  function clearDoc() {
    localStorage.removeItem(docKey(id));

    setCompanyName("Your Company");
    setCompanyEmail("you@email.com");
    setCompanyPhone("(555) 123-4567");
    setCompanyAddress("123 Main St, City, ST");
    setLogoDataUrl(null);

    setCustomerName("");
    setProjectTitle("Estimate");

    setItems([{ id: uid(), title: "Labor", qty: "1", rate: "0" }]);
    setTaxRate("0");

    setNotes("");
    setTerms("Valid for 14 days. Price includes labor and materials unless stated otherwise.");
    setPaymentInfo("Payment due upon completion. Accepted: cash, check, Zelle, card.");

    setLastSaved(null);
    flash("idle");
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(docKey(id));
      if (!raw) return;
      const d = JSON.parse(raw) as DocData;

      setCompanyName(d.companyName || "Your Company");
      setCompanyEmail(d.companyEmail || "");
      setCompanyPhone(d.companyPhone || "");
      setCompanyAddress(d.companyAddress || "");
      setLogoDataUrl(d.logoDataUrl || null);

      setCustomerName(d.customerName || "");
      setProjectTitle(d.projectTitle || "Estimate");

      setItems(Array.isArray(d.items) && d.items.length ? d.items : [{ id: uid(), title: "Labor", qty: "1", rate: "0" }]);
      setTaxRate(d.taxRate ?? "0");

      setNotes(d.notes || "");
      setTerms(d.terms || "");
      setPaymentInfo(d.paymentInfo || "");

      setLastSaved(d.updatedAt || null);
      flash("loaded");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Cmd/Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, companyEmail, companyPhone, companyAddress, logoDataUrl, customerName, projectTitle, items, taxRate, notes, terms, paymentInfo]);

  function addItem() {
    setItems((prev) => [...prev, { id: uid(), title: "New item", qty: "1", rate: "0" }]);
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((x) => x.id !== itemId));
  }

  function updateItem(itemId: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((x) => (x.id === itemId ? { ...x, ...patch } : x)));
  }

  async function onLogoUpload(file: File | null) {
    if (!file) return;

    // Keep it small to avoid URL length issues for PDF export
    // Convert to data URL (base64)
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setLogoDataUrl(result);
    };
    reader.readAsDataURL(file);
  }

  const exportUrl = useMemo(() => {
    const q = new URLSearchParams();

    // Branding
    q.set("companyName", companyName);
    q.set("companyEmail", companyEmail);
    q.set("companyPhone", companyPhone);
    q.set("companyAddress", companyAddress);
    if (logoDataUrl) q.set("logoDataUrl", logoDataUrl);

    // Customer + doc
    q.set("customerName", customerName);
    q.set("projectTitle", projectTitle);

    // Items + totals
    q.set("taxRate", taxRate);
    q.set("items", JSON.stringify(items));

    // Notes/terms/payment
    q.set("notes", notes);
    q.set("terms", terms);
    q.set("paymentInfo", paymentInfo);

    return `/api/documents/${id}/pdf?${q.toString()}`;
  }, [id, companyName, companyEmail, companyPhone, companyAddress, logoDataUrl, customerName, projectTitle, taxRate, items, notes, terms, paymentInfo]);

  return (
    <main className="container">
      {/* Header */}
      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="pill" style={{ display: "inline-flex", gap: 8 }}>
              <span>Doc</span>
              <span style={{ color: "rgba(0,0,0,.55)", fontWeight: 800 }}>{id}</span>
            </div>

            <h1 className="h1" style={{ marginTop: 10 }}>{projectTitle || "Estimate"}</h1>

            <p className="p" style={{ marginTop: 8 }}>
              Line items, terms, payment info, branding, and a customer-ready PDF.
              <span style={{ marginLeft: 10 }} className="kbd">⌘/Ctrl + S</span>
            </p>
          </div>

          <div className="row" style={{ alignItems: "center" }}>
            <StatusChip status={status} lastSaved={lastSaved} />
            <button className="btn btnPrimary" onClick={saveNow}>Save</button>
            <a className="btn" href={exportUrl} target="_blank" rel="noreferrer">Export PDF</a>
            <button className="btn btnDanger" onClick={clearDoc}>Clear</button>
          </div>
        </div>
      </section>

      <div className="grid2" style={{ marginTop: 18 }}>
        {/* Editor */}
        <section className="cardSolid" style={{ padding: 18 }}>
          {/* Branding */}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="h2">Branding</h2>
            <span className="pill">Logo + company info</span>
          </div>

          <label className="label">Logo (small PNG/JPG)</label>
          <div className="row" style={{ alignItems: "center" }}>
            <input
              className="input"
              style={{ padding: 10 }}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => onLogoUpload(e.target.files?.[0] || null)}
            />
            {logoDataUrl && (
              <button className="btn btnGhost" onClick={() => setLogoDataUrl(null)}>
                Remove logo
              </button>
            )}
          </div>

          {logoDataUrl && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,.10)",
                  background: "rgba(255,255,255,.7)",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Logo preview" src={logoDataUrl} style={{ maxWidth: "100%", maxHeight: "100%" }} />
              </div>
              <div className="small">Tip: Keep logo under ~200KB for best results.</div>
            </div>
          )}

          <label className="label">Company name</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />

          <div className="row">
            <div style={{ flex: 1, minWidth: 240 }}>
              <label className="label">Email</label>
              <input className="input" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contact@company.com" />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label className="label">Phone</label>
              <input className="input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="(516) 555-1234" />
            </div>
          </div>

          <label className="label">Address</label>
          <input className="input" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="City, State" />

          <hr className="hr" />

          {/* Customer + title */}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="h2">Customer</h2>
            <span className="pill">Estimate details</span>
          </div>

          <label className="label">Customer name</label>
          <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Smith" />

          <label className="label">Document title</label>
          <input className="input" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Estimate / Proposal / Invoice" />

          <hr className="hr" />

          {/* Line items */}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="h2">Line items</h2>
            <button className="btn btnGhost" onClick={addItem}>Add item</button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {items.map((it) => {
              const amount = toNumber(it.qty) * toNumber(it.rate);
              return (
                <div
                  key={it.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(0,0,0,.10)",
                    background: "rgba(255,255,255,.75)",
                    padding: 12,
                  }}
                >
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <input
                      className="input"
                      value={it.title}
                      onChange={(e) => updateItem(it.id, { title: e.target.value })}
                      placeholder="Item description"
                      style={{ flex: 1 }}
                    />

                    <button
                      className="btn btnDanger"
                      onClick={() => removeItem(it.id)}
                      disabled={items.length === 1}
                      title={items.length === 1 ? "Keep at least one item" : "Remove"}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="row" style={{ marginTop: 10 }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div className="label" style={{ marginTop: 0 }}>Qty</div>
                      <input
                        className="input"
                        value={it.qty}
                        onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                        inputMode="decimal"
                        placeholder="1"
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div className="label" style={{ marginTop: 0 }}>Rate</div>
                      <input
                        className="input"
                        value={it.rate}
                        onChange={(e) => updateItem(it.id, { rate: e.target.value })}
                        inputMode="decimal"
                        placeholder="1500"
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div className="label" style={{ marginTop: 0 }}>Amount</div>
                      <div
                        style={{
                          padding: "12px 12px",
                          borderRadius: 14,
                          border: "1px solid rgba(0,0,0,.10)",
                          background: "rgba(255,255,255,.55)",
                          fontWeight: 900,
                        }}
                      >
                        ${money(amount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label className="label">Tax %</label>
              <input
                className="input"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                inputMode="decimal"
                placeholder="0"
              />
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="label">Totals</div>
              <div className="row">
                <span className="pill">Subtotal: ${money(subtotal)}</span>
                <span className="pill">Tax: ${money(tax)}</span>
                <span className="pill" style={{ fontWeight: 900 }}>Total: ${money(total)}</span>
              </div>
            </div>
          </div>

          <hr className="hr" />

          {/* Notes/Terms/Payment */}
          <h2 className="h2">Notes</h2>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for the customer..." />

          <h2 className="h2" style={{ marginTop: 14 }}>Terms</h2>
          <textarea className="textarea" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Warranty, validity period, exclusions..." />

          <h2 className="h2" style={{ marginTop: 14 }}>Payment info</h2>
          <textarea className="textarea" value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} placeholder="How the customer pays, due date, deposit policy..." />

          <p className="small" style={{ marginTop: 12 }}>
            Customer-ready PDF includes branding + items + terms + payment info. (No signature line.)
          </p>
        </section>

        {/* Preview */}
        <section className="card" style={{ padding: 18 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 className="h2">Preview</h2>
            <span className="pill">Matches PDF</span>
          </div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              border: "1px solid rgba(0,0,0,.10)",
              background: "rgba(255,255,255,.55)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>{companyName || "Your Company"}</div>
                <div className="small" style={{ marginTop: 6 }}>
                  {[companyEmail, companyPhone, companyAddress].filter(Boolean).join(" • ") || "—"}
                </div>
              </div>

              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Logo" src={logoDataUrl} style={{ width: 56, height: 56, borderRadius: 14, objectFit: "contain", border: "1px solid rgba(0,0,0,.10)", background: "rgba(255,255,255,.7)" }} />
              ) : null}
            </div>

            <div style={{ marginTop: 14, fontWeight: 950, fontSize: 20, letterSpacing: "-.02em" }}>
              {projectTitle || "Estimate"}
            </div>

            <div style={{ marginTop: 8, color: "rgba(0,0,0,.65)" }}>
              Customer: <strong>{customerName || "—"}</strong>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="pill" style={{ display: "inline-flex", fontWeight: 900 }}>Line items</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {items.map((it) => {
                  const amount = toNumber(it.qty) * toNumber(it.rate);
                  return (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 850 }}>{it.title || "—"}</div>
                        <div className="small">
                          Qty {it.qty || "—"} × ${it.rate || "—"}
                        </div>
                      </div>
                      <div style={{ fontWeight: 950 }}>${money(amount)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 14, borderTop: "1px solid rgba(0,0,0,.08)", paddingTop: 12 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="small">Subtotal</span>
                <strong>${money(subtotal)}</strong>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="small">Tax ({taxRate || "0"}%)</span>
                <strong>${money(tax)}</strong>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 900 }}>Total</span>
                <span style={{ fontWeight: 950, fontSize: 18 }}>${money(total)}</span>
              </div>
            </div>

            {notes ? (
              <div style={{ marginTop: 14 }}>
                <div className="pill" style={{ display: "inline-flex", fontWeight: 900 }}>Notes</div>
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{notes}</div>
              </div>
            ) : null}

            <div style={{ marginTop: 14 }}>
              <div className="pill" style={{ display: "inline-flex", fontWeight: 900 }}>Terms</div>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{terms || "—"}</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="pill" style={{ display: "inline-flex", fontWeight: 900 }}>Payment</div>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{paymentInfo || "—"}</div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <a className="btn btnGhost" href="/" title="Back to home">Back</a>
            <span className="small">Tip: keep logo small for best PDF export.</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusChip({
  status,
  lastSaved,
}: {
  status: "idle" | "saved" | "loaded" | "error";
  lastSaved: number | null;
}) {
  const text =
    status === "saved"
      ? "Saved"
      : status === "loaded"
      ? "Loaded"
      : status === "error"
      ? "Save failed"
      : lastSaved
      ? `Saved ${timeAgo(lastSaved)}`
      : "Not saved";

  const bg =
    status === "saved"
      ? "rgba(52,199,89,.14)"
      : status === "loaded"
      ? "rgba(10,132,255,.14)"
      : status === "error"
      ? "rgba(255,59,48,.14)"
      : "rgba(255,255,255,.55)";

  const border =
    status === "saved"
      ? "rgba(52,199,89,.30)"
      : status === "loaded"
      ? "rgba(10,132,255,.30)"
      : status === "error"
      ? "rgba(255,59,48,.30)"
      : "rgba(0,0,0,.10)";

  return (
    <span
      className="pill"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        color: "rgba(0,0,0,.72)",
        fontWeight: 900,
      }}
    >
      {text}
    </span>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
