import { ScreenStateCards } from "@/components/screen-states";

export default function SessionEndPage() {
  return (
    <main>
      <h1 className="page-title">Session End</h1>
      <p className="page-sub">Session is force-stopped at budget end. Show time saved summary and next action.</p>
      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Time Saved</h3>
        <p>Estimated this session: 5m 36s</p>
        <p className="footer-note">Weekly median target: 35+ minutes</p>
      </section>
      <section className="panel">
        <ScreenStateCards />
      </section>
    </main>
  );
}
