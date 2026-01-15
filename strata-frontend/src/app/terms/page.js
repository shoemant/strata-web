export const metadata = {
  title: 'Terms & Conditions',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: <span className="font-medium">TBD</span>
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            This page is a placeholder. You can replace the sections below with
            your real terms at any time.
          </p>

          <div className="space-y-4 text-sm leading-6">
            <h2 className="text-lg font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground">
              Add a brief overview of your service and who these terms apply to.
            </p>

            <h2 className="text-lg font-semibold">2. Accounts</h2>
            <p className="text-muted-foreground">
              Explain account creation, user responsibilities, and security
              expectations.
            </p>

            <h2 className="text-lg font-semibold">3. Acceptable Use</h2>
            <p className="text-muted-foreground">
              Outline what users can and cannot do when using your app.
            </p>

            <h2 className="text-lg font-semibold">
              4. Payments and Fees (if applicable)
            </h2>
            <p className="text-muted-foreground">
              If you charge fees, add billing terms, refunds, and cancellation
              rules.
            </p>

            <h2 className="text-lg font-semibold">
              5. Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              Add liability limitations and disclaimers appropriate for your
              app.
            </p>

            <h2 className="text-lg font-semibold">6. Contact</h2>
            <p className="text-muted-foreground">
              Add your support or contact email here.
            </p>
          </div>
        </section>

        <footer className="text-xs text-muted-foreground">
          Tip: when you finalize the terms, update your{' '}
          <code className="px-1 py-0.5 rounded bg-muted">TERMS_VERSION</code> in{' '}
          <code className="px-1 py-0.5 rounded bg-muted">src/lib/terms.js</code>
          .
        </footer>
      </div>
    </div>
  );
}
