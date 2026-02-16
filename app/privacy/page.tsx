import Link from "next/link";

const lastUpdated = "February 16, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
        <header className="space-y-4">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Privacy Policy
          </div>
          <h1 className="font-display text-4xl">How Publiq handles your data.</h1>
          <p className="text-base text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </header>

        <section className="space-y-3 text-sm text-muted-foreground">
          <p>
            This Privacy Policy explains how Publiq collects, uses, and shares information when you use the Service.
            By using the Service, you agree to this policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Account details such as name, email address, and authentication credentials.</li>
            <li>Content you upload or schedule, plus metadata needed to publish it.</li>
            <li>Connection data for linked platforms (tokens and basic profile details).</li>
            <li>Usage analytics to improve performance and reliability.</li>
            <li>Support messages or feedback you send to us.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">How We Use Information</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Operate the Service and publish content on your behalf.</li>
            <li>Secure accounts, prevent abuse, and troubleshoot issues.</li>
            <li>Improve features, workflows, and platform integrations.</li>
            <li>Send service updates, billing notices, and support responses.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sharing and Disclosure</h2>
          <p className="text-sm text-muted-foreground">
            We share information only as needed to provide the Service. This includes sharing content and required
            metadata with the platforms you connect, and sharing limited information with vendors who help us run the
            Service (such as hosting or analytics providers). We do not sell personal information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Data Retention</h2>
          <p className="text-sm text-muted-foreground">
            We retain information for as long as your account is active or as needed to provide the Service. You can
            request deletion of your account data, subject to legal or operational requirements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground">
            We use reasonable administrative, technical, and organizational safeguards to protect your information. No
            system is 100% secure, so please use strong passwords and protect your devices.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your Choices</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Update account details in settings.</li>
            <li>Disconnect third-party platforms at any time.</li>
            <li>Request access, correction, or deletion of your data.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">International Transfers</h2>
          <p className="text-sm text-muted-foreground">
            We may process information in the countries where we or our service providers operate. We take steps to
            protect data consistent with this policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground">
            We may update this policy from time to time. If changes are material, we will provide notice through the
            Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Related Policies</h2>
          <p className="text-sm text-muted-foreground">
            Review our <Link href="/terms" className="text-foreground underline">Terms of Service</Link> for details on
            using Publiq.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Questions about privacy? Reach out through the in-app support channel.
          </p>
        </section>
      </div>
    </div>
  );
}
