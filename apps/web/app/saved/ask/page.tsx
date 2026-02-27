import { AskSavedForm } from "@/components/ask-saved-form";
import { ScreenStateCards } from "@/components/screen-states";

export default function AskSavedPage() {
  return (
    <main>
      <h1 className="page-title">Ask Saved</h1>
      <p className="page-sub">Natural language recall over saved items.</p>
      <AskSavedForm />
      <section className="panel">
        <ScreenStateCards />
      </section>
    </main>
  );
}
