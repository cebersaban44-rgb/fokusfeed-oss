import Link from "next/link";
import { ScreenStateCards } from "@/components/screen-states";

export default function SavedPage() {
  return (
    <main>
      <h1 className="page-title">Saved Library</h1>
      <p className="page-sub">Smart save, semantic recall, weekly reviews, and revisit queue.</p>
      <section className="panel">
        <div className="controls">
          <button className="btn" type="button">
            save
          </button>
          <button className="btn" type="button">
            note
          </button>
          <button className="btn" type="button">
            remind
          </button>
        </div>
        <p className="footer-note">Use Ask Saved for natural language search.</p>
        <Link className="btn primary" href="/saved/ask">
          Go to Ask Saved
        </Link>
      </section>
      <section className="panel">
        <ScreenStateCards />
      </section>
    </main>
  );
}
