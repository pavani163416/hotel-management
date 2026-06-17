import Layout from "@/components/Layout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-foreground mb-3">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Terms = () => (
  <Layout>
    <div className="container max-w-3xl mx-auto py-16 px-4">
      <div className="mb-10">
        <div className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1 text-sm font-semibold mb-4">Legal</div>
        <h1 className="font-display text-4xl font-bold text-foreground mb-3">Terms of Service</h1>
        <p className="text-muted-foreground">Effective Date: January 1, 2025 · Last Updated: June 1, 2025</p>
      </div>

      <div className="prose prose-sm max-w-none">
        <Section title="1. Acceptance of Terms">
          <p>By accessing or using the AthithiGriha platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately.</p>
        </Section>
        <Section title="2. Use of the Service">
          <p>You must be at least 18 years of age to use our Service and make bookings. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.</p>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
        </Section>
        <Section title="3. Booking & Payments">
          <p>All bookings made through AthithiGriha are subject to availability and confirmation. Prices shown are inclusive of applicable taxes unless otherwise stated. Payment is processed securely via Razorpay.</p>
          <p>AthithiGriha acts as an agent between guests and hotels. Each hotel's individual policies regarding check-in, check-out, and amenities apply.</p>
        </Section>
        <Section title="4. Cancellation & Refunds">
          <p>Cancellation policies vary by property and room type. Please review the applicable cancellation policy before completing your booking. Refunds, where applicable, are processed within 5-10 business days.</p>
        </Section>
        <Section title="5. Intellectual Property">
          <p>All content on the AthithiGriha platform — including text, graphics, logos, and software — is the property of AthithiGriha Hospitality Pvt. Ltd. and is protected by applicable intellectual property laws.</p>
        </Section>
        <Section title="6. Limitation of Liability">
          <p>To the maximum extent permitted by law, AthithiGriha shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.</p>
        </Section>
        <Section title="7. Governing Law">
          <p>These Terms are governed by and construed in accordance with the laws of the Republic of India, without regard to its conflict of law provisions.</p>
        </Section>
        <Section title="8. Changes to Terms">
          <p>We reserve the right to modify these Terms at any time. Continued use of the Service after any changes constitutes acceptance of the new Terms.</p>
        </Section>
        <Section title="9. Contact">
          <p>For questions regarding these Terms, please contact us at <a href="mailto:legal@athithigriha.com" className="text-primary hover:underline">legal@athithigriha.com</a>.</p>
        </Section>
      </div>
    </div>
  </Layout>
);

export default Terms;
