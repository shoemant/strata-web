export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: <span className="font-medium">TBD</span>
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            This page is a placeholder. Replace the sections below with your
            real policy when you are ready.
          </p>

          <div className="space-y-4 text-sm leading-6">
            <h2 className="text-lg font-semibold">1. What We Collect</h2>
            <p className="text-muted-foreground">
              Describe what personal information you collect (for example:
              email, name, unit number).
            </p>

            <h2 className="text-lg font-semibold">2. How We Use Information</h2>
            <p className="text-muted-foreground">
              Explain why you collect information and how it is used in the app.
            </p>

            <h2 className="text-lg font-semibold">3. Sharing</h2>
            <p className="text-muted-foreground">
              Describe if you share data with service providers or other
              parties, and why.
            </p>

            <h2 className="text-lg font-semibold">4. Data Retention</h2>
            <p className="text-muted-foreground">
              Explain how long you keep information and how users can request
              deletion.
            </p>

            <h2 className="text-lg font-semibold">5. Security</h2>
            <p className="text-muted-foreground">
              Describe high-level security practices (do not promise anything
              you cannot guarantee).
            </p>

            <h2 className="text-lg font-semibold">6. Contact</h2>
            <p className="text-muted-foreground">
              Add your privacy contact email here.
            </p>
          </div>
        </section>

        <footer className="text-xs text-muted-foreground">
          Tip: If you change privacy practices in a way that requires renewed
          consent, bump{' '}
          <code className="px-1 py-0.5 rounded bg-muted">TERMS_VERSION</code>{' '}
          and force re-acceptance.
        </footer>
      </div>
    </div>
  );
}
