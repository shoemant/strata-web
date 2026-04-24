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
            Last updated: <span className="font-medium">April 2026</span>
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 text-sm leading-6 text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              1. Introduction
            </h2>
            <p>
              These Terms & Conditions govern your use of this platform, which
              provides tools for managing residential buildings, including
              communication, bookings, and resident services. By accessing or
              using the platform, you agree to these terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              2. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account and for all activity under your account. You must provide
              accurate information and keep it up to date.
            </p>
            <p>
              Access to certain features may depend on your role (e.g., tenant,
              owner, or manager) within a building.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              3. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the platform for unlawful or harmful purposes</li>
              <li>Interfere with the operation or security of the platform</li>
              <li>
                Attempt to access data or accounts that do not belong to you
              </li>
              <li>Submit false or misleading information</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              4. Bookings and Resources
            </h2>
            <p>
              The platform may allow users to book shared resources such as
              amenities, rooms, or parking spaces. Availability and rules are
              set by building management.
            </p>
            <p>
              You are responsible for complying with all building-specific
              policies when using these resources. Misuse may result in
              restrictions or removal of access.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              5. Location-Based Features
            </h2>
            <p>
              The platform may use building location data to provide relevant
              services, such as nearby offers or recommendations. This location
              refers to the building itself and not precise tracking of
              individual users.
            </p>
            <p>We do not track your real-time personal location.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              6. Data and Privacy
            </h2>
            <p>
              We collect only essential data required to operate the platform,
              including login and account-related information. Limited cookies
              may be used for authentication and session management.
            </p>
            <p>For more details, please refer to our Privacy Policy.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              7. Availability
            </h2>
            <p>
              We aim to keep the platform available and functioning smoothly,
              but we do not guarantee uninterrupted access. Features may be
              modified, suspended, or discontinued at any time.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              8. Limitation of Liability
            </h2>
            <p>
              The platform is provided on an “as is” basis. To the extent
              permitted by law, we are not responsible for any indirect,
              incidental, or consequential damages arising from your use of the
              platform.
            </p>
            <p>
              We are not responsible for disputes, damages, or issues arising
              from the use of building resources or third-party services.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              9. Changes to Terms
            </h2>
            <p>
              We may update these Terms & Conditions from time to time. When we
              do, we will update the “Last updated” date. Continued use of the
              platform means you accept the updated terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              10. Contact
            </h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="font-medium text-foreground">
              support@mystrataapp.com
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
