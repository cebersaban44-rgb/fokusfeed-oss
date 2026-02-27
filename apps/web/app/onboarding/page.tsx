import { TwitterConnectCard } from "@/components/twitter-connect-card";

export default function OnboardingPage() {
  return (
    <main>
      <h1 className="page-title">Onboarding</h1>
      <p className="page-sub">Feed ekranlarına geçmeden önce Twitter/X hesabını bağlaman gerekiyor.</p>
      <TwitterConnectCard />
      <section className="panel">
        <ol>
          <li>Twitter ile Bağlan butonuna tıkla</li>
          <li>X izin ekranını onayla</li>
          <li>Otomatik callback tamamlanır</li>
          <li>Bağlantı varsa sistem seni digest ekranına geçirir</li>
        </ol>
      </section>
    </main>
  );
}
