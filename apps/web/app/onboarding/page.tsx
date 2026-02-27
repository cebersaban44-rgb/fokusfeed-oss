import { TwitterConnectCard } from "@/components/twitter-connect-card";

export default function OnboardingPage() {
  return (
    <main>
      <h1 className="page-title">Onboarding</h1>
      <p className="page-sub">Feed ekranlarina gecmeden once Twitter/X hesabini baglaman gerekiyor.</p>
      <TwitterConnectCard />
      <section className="panel">
        <ol>
          <li>Twitter ile Baglan butonuna tikla.</li>
          <li>X izin ekraninda uygulamaya yetki ver.</li>
          <li>Callback tamamlaninca otomatik olarak geri donersin.</li>
          <li>Baglanti aktif oldugunda sistem seni digest ekranina yonlendirir.</li>
        </ol>
      </section>
    </main>
  );
}
