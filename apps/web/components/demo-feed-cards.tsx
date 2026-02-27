const items = [
  {
    id: "feed-1",
    category: "following",
    title: "Node.js 24 release deep dive",
    reason: "Takip ettigin kaynak",
    score: "0.84"
  },
  {
    id: "feed-2",
    category: "must_see",
    title: "Security advisory in OAuth app flows",
    reason: "Piyasada hizli yukselen gelisme",
    score: "0.88"
  },
  {
    id: "feed-3",
    category: "trend_now",
    title: "Counter analysis for the same advisory",
    reason: "Karsit gorus dengesi",
    score: "0.82"
  }
];

export function DemoFeedCards({ mode }: { mode: "digest" | "live" }) {
  const visible = mode === "digest" ? items.filter((item) => item.category !== "trend_now") : items;

  return (
    <div className="stack">
      {visible.map((item) => (
        <article key={item.id} className="panel">
          <span className="badge">{item.category}</span>
          <h3>{item.title}</h3>
          <p className="page-sub">Reason: {item.reason}</p>
          <p className="page-sub">Score: {item.score}</p>
          <div className="controls">
            <button className="btn" type="button">
              like
            </button>
            <button className="btn" type="button">
              save
            </button>
            <button className="btn" type="button">
              skip
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
