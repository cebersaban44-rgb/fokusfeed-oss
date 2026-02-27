import { ApiFeedCards } from "@/components/api-feed-cards";
import { ScreenStateCards } from "@/components/screen-states";

export default function LivePage() {
  return (
    <main>
      <h1 className="page-title">Live Feed</h1>
      <p className="page-sub">Grouped fresh blocks refresh every fixed 10 minutes.</p>
      <section className="panel">
        <span className="badge">Refresh Window: 10 min</span>
        <p className="footer-note">No endless scroll. Use explicit refresh cycle.</p>
      </section>
      <ApiFeedCards mode="live" />
      <section className="panel">
        <ScreenStateCards />
      </section>
    </main>
  );
}
