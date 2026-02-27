import { ApiFeedCards } from "@/components/api-feed-cards";
import { ScreenStateCards } from "@/components/screen-states";
import { SessionModePicker } from "@/components/session-mode-picker";

export default function DigestPage() {
  return (
    <main>
      <h1 className="page-title">Today Digest</h1>
      <p className="page-sub">Two digest windows (08:00, 18:00), high-value cards only, infinite scroll disabled.</p>
      <SessionModePicker />
      <ApiFeedCards mode="digest" />
      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Required Screen States</h3>
        <ScreenStateCards />
      </section>
    </main>
  );
}
