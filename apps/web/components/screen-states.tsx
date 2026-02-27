export function ScreenStateCards() {
  return (
    <div className="state-grid">
      <section className="state-box" aria-live="polite">
        <strong>Loading</strong>
        <p>Veri yukleniyor...</p>
      </section>
      <section className="state-box">
        <strong>Empty</strong>
        <p>Gosterilecek icerik bulunamadi.</p>
      </section>
      <section className="state-box" role="alert">
        <strong>Error</strong>
        <p>Bir hata olustu. Yeniden deneyin.</p>
      </section>
      <section className="state-box">
        <strong>Retry</strong>
        <p>Baglanti toparlandiginda tekrar yuklenecek.</p>
      </section>
    </div>
  );
}
