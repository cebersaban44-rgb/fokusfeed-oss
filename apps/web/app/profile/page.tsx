import { ScreenStateCards } from "@/components/screen-states";

export default function ProfilePage() {
  return (
    <main>
      <h1 className="page-title">Profile and Source Trust</h1>
      <p className="page-sub">Inspect interests, source trust graph, and BYOK key status.</p>
      <section className="panel">
        <div className="controls">
          <button className="btn" type="button">
            Check key status
          </button>
          <button className="btn" type="button">
            Rotate key
          </button>
          <button className="btn warning" type="button">
            Revoke key
          </button>
        </div>
      </section>
      <section className="panel">
        <ScreenStateCards />
      </section>
    </main>
  );
}
