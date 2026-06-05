import Layout from "@/components/Layout";
import { Newspaper, Download, Mail } from "lucide-react";

const pressItems = [
  {
    date: "May 28, 2025",
    outlet: "The Economic Times",
    headline: "LuxeStay Raises $50M Series C to Expand Across Southeast Asia",
    summary: "The luxury hotel booking platform secured funding led by Sequoia India, targeting 10 new markets in 2025.",
  },
  {
    date: "April 15, 2025",
    outlet: "TechCrunch",
    headline: "LuxeStay's AI-Powered Room Matching Sees 40% Conversion Lift",
    summary: "An exclusive look at how LuxeStay's personalization engine is reshaping how travelers choose their stays.",
  },
  {
    date: "March 3, 2025",
    outlet: "Forbes India",
    headline: "LuxeStay Named Among Top 25 Most Innovative Travel Startups",
    summary: "LuxeStay joins an elite group of travel tech companies recognised for disrupting traditional hospitality distribution.",
  },
  {
    date: "January 10, 2025",
    outlet: "Business Today",
    headline: "LuxeStay Surpasses 1 Million Bookings Milestone",
    summary: "The platform celebrated a major milestone as it crossed one million cumulative hotel nights booked by guests across 45 countries.",
  },
];

const Press = () => (
  <Layout>
    <div className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-24 px-4">
      <div className="container max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary-foreground/10 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
          <Newspaper className="w-4 h-4" /> Press Room
        </div>
        <h1 className="font-display text-5xl font-bold mb-5">LuxeStay in the News</h1>
        <p className="text-primary-foreground/80 text-xl leading-relaxed">
          Read the latest news and announcements from LuxeStay Hospitality.
        </p>
      </div>
    </div>

    <div className="container max-w-4xl mx-auto py-16 px-4">
      {/* Press Kit */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12 shadow-sm">
        <div>
          <h3 className="font-semibold text-foreground text-lg mb-1">Press Kit & Brand Assets</h3>
          <p className="text-muted-foreground text-sm">Download our official logos, brand guidelines, and leadership bios.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors whitespace-nowrap">
          <Download className="w-4 h-4" /> Download Kit
        </button>
      </div>

      {/* Press Items */}
      <h2 className="font-display text-3xl font-bold text-foreground mb-8">Recent Coverage</h2>
      <div className="space-y-6">
        {pressItems.map((item) => (
          <div key={item.headline}
            className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold bg-primary/10 text-primary rounded-full px-3 py-1">{item.outlet}</span>
              <span className="text-xs text-muted-foreground">{item.date}</span>
            </div>
            <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-primary transition-colors">{item.headline}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{item.summary}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="mt-12 text-center bg-primary/5 border border-primary/20 rounded-2xl p-8">
        <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="font-display text-2xl font-bold text-foreground mb-2">Media Enquiries</h3>
        <p className="text-muted-foreground mb-4">For press enquiries, interview requests, or asset access, reach our PR team.</p>
        <a href="mailto:press@luxestay.com"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          press@luxestay.com
        </a>
      </div>
    </div>
  </Layout>
);

export default Press;
