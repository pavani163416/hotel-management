import Layout from "@/components/Layout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-foreground mb-3">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Privacy = () => (
  <Layout>
    <div className="container max-w-3xl mx-auto py-16 px-4">
      <div className="mb-10">
        <div className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1 text-sm font-semibold mb-4">Legal</div>
        <h1 className="font-display text-4xl font-bold text-foreground mb-3">Privacy Policy</h1>
        <p className="text-muted-foreground">Effective Date: January 1, 2025 · Last Updated: June 1, 2025</p>
      </div>

      <div className="prose prose-sm max-w-none">
        <Section title="1. Information We Collect">
          <p>We collect information you provide directly — such as your name, email address, phone number, and payment details — when you create an account or make a booking.</p>
          <p>We also automatically collect usage data such as IP addresses, browser type, pages visited, and interaction patterns to improve our Service.</p>
        </Section>
        <Section title="2. How We Use Your Information">
          <p>We use your information to process bookings, send confirmation emails, provide customer support, personalize your experience, and send promotional communications (with your consent).</p>
        </Section>
        <Section title="3. Cookies">
          <p>We use cookies and similar tracking technologies to enhance functionality, remember preferences, and analyze usage. You can control cookie preferences through your browser settings or our Cookie Consent manager.</p>
        </Section>
        <Section title="4. Data Sharing">
          <p>We do not sell your personal data. We share data only with hotels you book with, payment processors (Razorpay), and service providers who help us operate the platform — all under strict confidentiality agreements.</p>
        </Section>
        <Section title="5. Data Retention">
          <p>We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time.</p>
        </Section>
        <Section title="6. Security">
          <p>We implement industry-standard security measures including SSL/TLS encryption, secure token storage, and regular security audits to protect your personal information.</p>
        </Section>
        <Section title="7. Your Rights">
          <p>Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of your personal data. To exercise any right, contact <a href="mailto:privacy@luxestay.com" className="text-primary hover:underline">privacy@luxestay.com</a>.</p>
        </Section>
        <Section title="8. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a prominent notice on our website.</p>
        </Section>
      </div>
    </div>
  </Layout>
);

export default Privacy;
