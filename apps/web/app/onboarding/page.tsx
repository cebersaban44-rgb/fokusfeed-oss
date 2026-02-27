export default function OnboardingPage() {
  return (
    <main>
      <h1 className="page-title">Onboarding</h1>
      <p className="page-sub">Connect Twitter/X, auto-assign RSS sources, and build the first profile in under 5 minutes.</p>
      <section className="panel">
        <ol>
          <li>Start OAuth: POST /v1/auth/twitter/start</li>
          <li>Complete callback: GET /v1/auth/twitter/callback</li>
          <li>Seed profile from follows and interactions</li>
          <li>Generate first digest</li>
        </ol>
      </section>
    </main>
  );
}
