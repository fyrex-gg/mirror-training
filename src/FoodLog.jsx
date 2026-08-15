import { useState } from "react";
import { Search, Plus, Trash2 } from "lucide-react";

// ---------- Shared style tokens (kept local — this file is self-contained by design) ----------
const FONT = { fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" };
const BODY = { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" };
const CARD_BORDER = "1px solid rgba(255,255,255,0.055)";

const OFF_URL = "https://world.openfoodfacts.org/cgi/search.pl";

function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

function round(n) {
  return Math.round((n || 0) * 10) / 10;
}

function ProgressBar({ value, target, color }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 4, background: "#14171C", overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 4,
        transition: "width 0.2s ease" }} />
    </div>
  );
}

export default function FoodLog({ log, setLog, targets, color }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // Food search via Open Food Facts — free, no API key, no signup.
  // Filters out products with no calorie data (useless for logging), but treats
  // missing protein/carbs/fat as 0 rather than crashing on them.
  async function runSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const url = OFF_URL + "?search_terms=" + encodeURIComponent(term) +
        "&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments,brands";
      const r = await fetch(url);
      const j = await r.json();
      const products = (j && Array.isArray(j.products)) ? j.products : [];
      const clean = products
        .filter((p) => p && p.nutriments && p.nutriments["energy-kcal_100g"] != null && p.product_name)
        .map((p, i) => ({
          key: i + "-" + (p.product_name || ""),
          name: p.product_name,
          brand: p.brands || "",
          per100: {
            kcal: Number(p.nutriments["energy-kcal_100g"]) || 0,
            protein: Number(p.nutriments["proteins_100g"]) || 0,
            fat: Number(p.nutriments["fat_100g"]) || 0,
            carbs: Number(p.nutriments["carbohydrates_100g"]) || 0,
          },
        }));
      setResults(clean);
    } catch (err) {
      setError("Couldn't reach the food database — check your connection and try again.");
      setResults([]);
    }
    setLoading(false);
  }

  function addFood(item) {
    setLog([...log, { id: genId(), name: item.name, per100: item.per100, qty: 100 }]);
  }

  function updateQty(id, qty) {
    const n = Math.max(0, Number(qty) || 0);
    setLog(log.map((it) => (it.id === id ? { ...it, qty: n } : it)));
  }

  function removeItem(id) {
    setLog(log.filter((it) => it.id !== id));
  }

  const totals = log.reduce((acc, it) => {
    const f = it.qty / 100;
    acc.kcal += it.per100.kcal * f;
    acc.protein += it.per100.protein * f;
    acc.fat += it.per100.fat * f;
    acc.carbs += it.per100.carbs * f;
    return acc;
  }, { kcal: 0, protein: 0, fat: 0, carbs: 0 });

  const t = targets || { kcal: 0, protein: 0, fat: 0, carbs: 0 };

  return (
    <div style={BODY}>
      <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Food log</div>
      <div style={{ fontSize: 12.5, color: "#8A919C", marginBottom: 10 }}>
        Search Open Food Facts and log what you actually eat — tap a result to add it at 100g, then adjust the amount.
      </div>

      {/* ---------- Search ---------- */}
      <form onSubmit={runSearch} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods…"
          style={{ ...BODY, flex: 1, padding: "10px 12px", borderRadius: 10,
            border: "1px solid #333945", background: "#14171C", color: "#E8EAED", fontSize: 14 }}
        />
        <button type="submit" disabled={loading || !query.trim()}
          style={{ ...FONT, display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 10,
            border: "none", cursor: (loading || !query.trim()) ? "default" : "pointer", fontSize: 13.5, fontWeight: 700,
            background: (loading || !query.trim()) ? "#333945" : color,
            color: (loading || !query.trim()) ? "#8A919C" : "#14171C" }}>
          <Search size={15} />
          {loading ? "…" : "Search"}
        </button>
      </form>

      {error && (
        <div style={{ fontSize: 13, color: "#D64545", marginBottom: 10 }}>{error}</div>
      )}

      {!error && searched && !loading && results.length === 0 && (
        <div style={{ fontSize: 13, color: "#5B626C", marginBottom: 10 }}>
          No matches for "{query}". Try a simpler or more generic term.
        </div>
      )}

      {!searched && !error && (
        <div style={{ fontSize: 13, color: "#5B626C", marginBottom: 10 }}>
          Search for a food above to get started.
        </div>
      )}

      {results.length > 0 && (
        <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: "4px 12px", marginBottom: 14 }}>
          {results.map((item, i) => (
            <div key={item.key} onClick={() => addFood(item)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", cursor: "pointer",
                borderBottom: i < results.length - 1 ? "1px solid #262B33" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#E8EAED", overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap" }}>{item.name}</div>
                <div style={{ fontSize: 11.5, color: "#8A919C", marginTop: 2 }}>
                  {item.brand ? item.brand + " · " : ""}{round(item.per100.kcal)} kcal / 100g
                </div>
              </div>
              <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: "flex",
                alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", color: "#E8EAED" }}>
                <Plus size={14} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Totals ---------- */}
      <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 8, marginTop: 4 }}>Today's totals</div>
      <div style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ ...FONT, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
          {round(totals.kcal)}<span style={{ fontSize: 14, color: "#8A919C" }}> / {round(t.kcal)} kcal</span>
        </div>
        <ProgressBar value={totals.kcal} target={t.kcal} color={color} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
          {[
            ["Protein", totals.protein, t.protein],
            ["Fat", totals.fat, t.fat],
            ["Carbs", totals.carbs, t.carbs],
          ].map(([label, val, tgt]) => (
            <div key={label} style={{ background: "#14171C", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 10.5, letterSpacing: 1.4, color: "#8A919C", textTransform: "uppercase" }}>{label}</div>
              <div style={{ ...FONT, fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                {round(val)}<span style={{ fontSize: 11, color: "#8A919C", fontWeight: 500 }}> / {round(tgt)}g</span>
              </div>
              <ProgressBar value={val} target={tgt} color={color} />
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Log ---------- */}
      <div style={{ ...FONT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Logged foods</div>
      {log.length === 0 ? (
        <div style={{ fontSize: 13, color: "#5B626C", marginBottom: 10 }}>
          Nothing logged yet — add foods from the search results above.
        </div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          {log.map((it) => {
            const f = it.qty / 100;
            return (
              <div key={it.id} style={{ background: "#1D2128", border: CARD_BORDER, borderRadius: 14,
                padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "#E8EAED", overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap" }}>{it.name}</div>
                    <div style={{ fontSize: 11.5, color: "#8A919C", marginTop: 2 }}>
                      {round(it.per100.kcal * f)} kcal · {round(it.per100.protein * f)}p · {round(it.per100.carbs * f)}c · {round(it.per100.fat * f)}f
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={it.qty}
                    onChange={(e) => updateQty(it.id, e.target.value)}
                    style={{ ...BODY, width: 60, padding: "7px 8px", borderRadius: 10, border: "1px solid #333945",
                      background: "#14171C", color: "#E8EAED", fontSize: 13, textAlign: "right" }}
                  />
                  <div style={{ fontSize: 11.5, color: "#8A919C", flexShrink: 0 }}>g</div>
                  <button onClick={() => removeItem(it.id)} aria-label="Remove"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
                      borderRadius: 8, border: "none", background: "transparent", color: "#8A919C", cursor: "pointer",
                      flexShrink: 0 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
