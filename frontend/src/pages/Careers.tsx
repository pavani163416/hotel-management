import Layout from "@/components/Layout";
import { Briefcase, MapPin, Clock, ChevronRight } from "lucide-react";

const openings = [
  { title: "Senior Full-Stack Engineer", dept: "Engineering", location: "Remote / Bangalore", type: "Full-time" },
  { title: "Product Designer (UX/UI)", dept: "Design", location: "Mumbai", type: "Full-time" },
  { title: "Hotel Partnerships Manager", dept: "Partnerships", location: "Dubai", type: "Full-time" },
  { title: "Customer Success Specialist", dept: "Support", location: "Remote", type: "Full-time" },
  { title: "Data Analyst", dept: "Analytics", location: "Hyderabad", type: "Contract" },
];

const perks = [
  { emoji: "🌍", title: "Remote-First Culture", text: "Work from anywhere in the world" },
  { emoji: "💰", title: "Competitive Salary", text: "Top-of-market compensation packages" },
  { emoji: "🏥", title: "Health & Wellness", text: "Full medical, dental, and vision coverage" },
  { emoji: "🏖️", title: "Unlimited PTO", text: "Take the time you need to recharge" },
  { emoji: "📚", title: "Learning Budget", text: "$2,000/year for courses and conferences" },
  { emoji: "🏨", title: "Free Hotel Stays", text: "Annual credit at any AthithiGriha partner hotel" },
];

const Careers = () => (
  <Layout>
    <div className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-24 px-4">
      <div className="container max-w-3xl mx-auto text-center">
        <h1 className="font-display text-5xl font-bold mb-5">Join Our Team</h1>
        <p className="text-primary-foreground/80 text-xl leading-relaxed">
          We're building the future of luxury travel. Come shape it with us.
        </p>
      </div>
    </div>

    <div className="container max-w-4xl mx-auto py-16 px-4">
      {/* Perks */}
      <h2 className="font-display text-3xl font-bold text-foreground mb-2 text-center">Why AthithiGriha?</h2>
      <p className="text-muted-foreground text-center mb-10">We take care of our team as well as we take care of our guests.</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mb-16">
        {perks.map((p) => (
          <div key={p.title} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
            <div className="text-3xl mb-3">{p.emoji}</div>
            <div className="font-semibold text-foreground mb-1">{p.title}</div>
            <p className="text-muted-foreground text-sm">{p.text}</p>
          </div>
        ))}
      </div>

      {/* Open Roles */}
      <h2 className="font-display text-3xl font-bold text-foreground mb-2">Open Positions</h2>
      <p className="text-muted-foreground mb-8">Join a growing team of passionate hospitality innovators.</p>
      <div className="space-y-4">
        {openings.map((job) => (
          <div key={job.title}
            className="group bg-card border border-border rounded-2xl p-6 flex items-center justify-between hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
            <div>
              <div className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">{job.title}</div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.dept}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.type}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        ))}
      </div>

      <div className="mt-10 text-center bg-primary/5 border border-primary/20 rounded-2xl p-8">
        <h3 className="font-display text-2xl font-bold text-foreground mb-2">Don't see your role?</h3>
        <p className="text-muted-foreground mb-4">We're always looking for extraordinary talent. Send your resume to us.</p>
        <a href="mailto:careers@athithigriha.com"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          careers@athithigriha.com
        </a>
      </div>
    </div>
  </Layout>
);

export default Careers;
