import Layout from "@/components/Layout";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-foreground mb-3">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const CookiePolicy = () => (
  <Layout>
    <div className="container max-w-3xl mx-auto py-16 px-4">
      <div className="mb-10">
        <div className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1 text-sm font-semibold mb-4">Legal</div>
        <h1 className="font-display text-4xl font-bold text-foreground mb-3">Cookie Policy</h1>
        <p className="text-muted-foreground">Effective Date: January 1, 2025 · Last Updated: June 10, 2026</p>
      </div>

      <div className="prose prose-sm max-w-none">
        <p className="text-muted-foreground mb-8 leading-relaxed">
          This Cookie Policy explains how LuxeStay ("we", "us", or "our") uses cookies and similar tracking technologies when you visit our website. It explains what these technologies are, why we use them, and your rights to control our use of them.
        </p>

        <Section title="1. What Are Cookies?">
          <p>Cookies are small data files placed on your computer or mobile device when you visit a website. They are widely used by website owners to make their websites work, or work more efficiently, as well as to provide reporting information.</p>
          <p>Cookies set by the website owner are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics).</p>
        </Section>

        <Section title="2. Why We Use Cookies">
          <p>We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Online Properties.</p>
        </Section>

        <Section title="3. Categories of Cookies We Use">
          <div className="space-y-4">
            <div className="p-4 bg-secondary/35 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-1">Essential Cookies</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">These cookies are strictly necessary to provide you with services available through our Website and to use some of its features, such as access to secure areas, currency switcher choices, and session management. Because these cookies are strictly necessary to deliver the Website to you, you cannot refuse them without impacting how our Website functions.</p>
            </div>
            <div className="p-4 bg-secondary/35 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-1">Analytics Cookies</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">These cookies collect information that is used either in aggregate form to help us understand how our Website is being used or how effective our marketing campaigns are, or to help us customize our Website for you. You can enable or disable these cookies via our Cookie Consent banner.</p>
            </div>
            <div className="p-4 bg-secondary/35 rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-1">Marketing Cookies</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">These cookies are used to make advertising messages more relevant to you. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed for advertisers, and in some cases selecting advertisements that are based on your interests. You can enable or disable these cookies via our Cookie Consent banner.</p>
            </div>
          </div>
        </Section>

        <Section title="4. How Can I Control Cookies?">
          <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking the customize options on our Cookie Consent banner that appears when you first visit the site.</p>
          <p>In addition, you can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.</p>
        </Section>

        <Section title="5. Updates to This Cookie Policy">
          <p>We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.</p>
        </Section>

        <Section title="6. Contact Us">
          <p>If you have any questions about our use of cookies or other technologies, please email us at <a href="mailto:privacy@luxestay.com" className="text-primary hover:underline">privacy@luxestay.com</a>.</p>
        </Section>
      </div>
    </div>
  </Layout>
);

export default CookiePolicy;
