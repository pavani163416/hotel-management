import Layout from "@/components/Layout";
import { Users, Globe, Award, Heart } from "lucide-react";

const stats = [
  { label: "Hotels Worldwide", value: "500+" },
  { label: "Happy Guests", value: "1M+" },
  { label: "Countries", value: "45+" },
  { label: "Years of Excellence", value: "12" },
];

const team = [
  { name: "Alexandra Chen", role: "CEO & Co-Founder", img: "https://api.dicebear.com/7.x/notionists/svg?seed=alex" },
  { name: "Raj Patel", role: "CTO", img: "https://api.dicebear.com/7.x/notionists/svg?seed=raj" },
  { name: "Maria Santos", role: "Head of Operations", img: "https://api.dicebear.com/7.x/notionists/svg?seed=maria" },
];

const About = () => (
  <Layout>
    <section className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-28 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Redefining Luxury Hospitality
          </h1>
          <p className="text-primary-foreground/80 text-xl leading-relaxed">
            At AthithiGriha, we believe every stay should be extraordinary. Our mission is to connect
            discerning travelers with the finest hotels and most seamless booking experience in the world.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="container -mt-10 z-10 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label}
              className="bg-card border border-border rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-muted-foreground text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Story */}
      <div className="container py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <Globe className="w-4 h-4" /> Our Story
            </div>
            <h2 className="font-display text-4xl font-bold mb-5 text-foreground leading-tight">
              Born from a passion for travel
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              AthithiGriha was founded in 2012 by a group of avid travelers who were frustrated with
              the fragmented hotel booking experience. We set out to build a platform that treats
              every guest like royalty — with curated selections, transparent pricing, and
              white-glove digital service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Today, we partner with over 500 premium properties across 45 countries, delivering
              memorable stays to millions of guests each year.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Award, title: "Award Winning", text: "Recognized as the best luxury booking platform 3 years running." },
              { icon: Heart, title: "Guest First", text: "Every decision we make starts with our guests' comfort and delight." },
              { icon: Users, title: "Expert Curation", text: "Our team personally vets every property in our portfolio." },
              { icon: Globe, title: "Global Reach", text: "Serving guests in 45+ countries with 24/7 multilingual support." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                <Icon className="w-6 h-6 text-primary mb-3" />
                <div className="font-semibold text-foreground mb-1 text-sm">{title}</div>
                <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-secondary/30 py-16">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold mb-2 text-foreground">Meet the Leadership</h2>
          <p className="text-muted-foreground mb-10">The visionaries driving AthithiGriha forward</p>
          <div className="flex flex-wrap justify-center gap-8">
            {team.map((m) => (
              <div key={m.name} className="bg-card border border-border rounded-2xl p-6 w-52 text-center hover:shadow-lg transition-shadow">
                <img src={m.img} alt={m.name} className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-primary/20" />
                <div className="font-semibold text-foreground">{m.name}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
