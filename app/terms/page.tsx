import Link from "next/link";

const lastUpdated = "February 16, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
        <header className="space-y-4">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Terms of Service
          </div>
          <h1 className="font-display text-4xl">The rules that keep Publiq reliable.</h1>
          <p className="text-base text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </header>

        <section className="space-y-3 text-sm text-muted-foreground">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Publiq (the &ldquo;Service&rdquo;). By accessing or using the
            Service, you agree to these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Eligibility and Accounts</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>You must be at least 13 years old, or older if required by your local laws.</li>
            <li>Provide accurate account information and keep it up to date.</li>
            <li>You are responsible for all activity under your account.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your Content</h2>
          <p className="text-sm text-muted-foreground">
            You retain ownership of the content you upload or schedule. You grant Publiq a limited, worldwide license
            to host, process, and transmit your content solely to operate the Service and publish to the platforms you
            connect.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Do not upload content that you do not have the rights to share.</li>
            <li>Do not upload content that violates any law or platform policy.</li>
            <li>You are responsible for the timing, accuracy, and legality of your posts.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Third-Party Platforms</h2>
          <p className="text-sm text-muted-foreground">
            The Service connects to third-party platforms (such as YouTube, TikTok, Instagram, or Facebook). Your use of
            those platforms is governed by their terms and policies. Publiq is not responsible for third-party platform
            outages, policy changes, or content decisions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Acceptable Use</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Do not attempt to access the Service in unauthorized ways.</li>
            <li>Do not interfere with the Service, including by introducing malware or abusive automation.</li>
            <li>Do not use the Service to send spam or violate others&apos; privacy.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Subscriptions and Billing</h2>
          <p className="text-sm text-muted-foreground">
            If you purchase a paid plan, you agree to pay the listed fees and applicable taxes. Fees are non-refundable
            except where required by law. We may change pricing with advance notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Termination</h2>
          <p className="text-sm text-muted-foreground">
            You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms or
            if we need to protect the Service, users, or partners. Where reasonable, we will provide notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Disclaimers and Limits</h2>
          <p className="text-sm text-muted-foreground">
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent permitted by law, Publiq disclaims
            warranties of any kind, and will not be liable for indirect, incidental, or consequential damages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Privacy</h2>
          <p className="text-sm text-muted-foreground">
            Please review our <Link href="/privacy" className="text-foreground underline">Privacy Policy</Link> to
            understand how we collect and use information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Changes to These Terms</h2>
          <p className="text-sm text-muted-foreground">
            We may update these Terms from time to time. If changes are material, we will provide notice through the
            Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Questions about these Terms? Reach out through the in-app support channel.
          </p>
        </section>
      </div>
    </div>
  );
}
