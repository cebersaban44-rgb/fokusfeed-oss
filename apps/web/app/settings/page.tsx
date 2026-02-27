import { ScreenStateCards } from "@/components/screen-states";

export default function SettingsPage() {
  return (
    <main>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Fallback mode, source preferences, retention, and account deletion controls.</p>
      <section className="panel stack">
        <label>
          <span>Default session mode</span>
          <select className="select" defaultValue="15">
            <option value="10">10 dk</option>
            <option value="15">15 dk</option>
          </select>
        </label>
        <label>
          <span>Deletion request</span>
          <button className="btn warning" type="button">
            Request account deletion
          </button>
        </label>
      </section>
      <section className="panel">
        <ScreenStateCards />
      </section>
    </main>
  );
}
