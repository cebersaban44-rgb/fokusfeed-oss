import { ScreenStateCards } from "@/components/screen-states";

export default function WeeklyReviewPage() {
  return (
    <main>
      <h1 className="page-title">Weekly Review</h1>
      <p className="page-sub">Highlights, change deltas, and revisit priorities from saved knowledge.</p>
      <section className="panel">
        <ul>
          <li>Critical saved items</li>
          <li>Topic shifts week-over-week</li>
          <li>Next revisit queue</li>
        </ul>
      </section>
      <section className="panel">
        <ScreenStateCards />
      </section>
    </main>
  );
}
