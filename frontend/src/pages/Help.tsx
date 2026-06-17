import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { Search, BookOpen, CreditCard, Bell, User, Star, ChevronRight } from "lucide-react";
import { useState } from "react";

const categories = [
  {
    icon: BookOpen,
    title: "Bookings",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    articles: [
      "How do I make a reservation?",
      "Can I modify my booking dates?",
      "What is the check-in / check-out process?",
      "How do I add additional guests?",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments & Refunds",
    color: "bg-green-50 text-green-600 border-green-200",
    articles: [
      "What payment methods are accepted?",
      "When will I receive my refund?",
      "How do I apply a promo code?",
      "Is my payment information secure?",
    ],
  },
  {
    icon: User,
    title: "Account & Profile",
    color: "bg-purple-50 text-purple-600 border-purple-200",
    articles: [
      "How do I reset my password?",
      "How do I update my profile information?",
      "How do I delete my account?",
      "Can I link multiple email addresses?",
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    color: "bg-orange-50 text-orange-600 border-orange-200",
    articles: [
      "Why am I not receiving booking confirmations?",
      "How do I opt out of marketing emails?",
      "Can I get SMS notifications?",
      "How do I enable push notifications?",
    ],
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    color: "bg-yellow-50 text-yellow-600 border-yellow-200",
    articles: [
      "How do I write a review?",
      "Can I edit my review after posting?",
      "How are star ratings calculated?",
      "Why was my review removed?",
    ],
  },
];

const Help = () => {
  const [search, setSearch] = useState("");

  const filtered = categories.map((cat) => ({
    ...cat,
    articles: cat.articles.filter((a) =>
      a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => !search || cat.articles.length > 0);

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          <h1 className="font-display text-5xl font-bold mb-5">Help Center</h1>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Find quick answers to common questions about AthithiGriha.
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              id="help-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-foreground bg-background border border-border shadow-lg outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto py-16 px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.title} className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className={`inline-flex items-center gap-2 ${cat.color} border rounded-xl px-3 py-1.5 text-sm font-semibold mb-4`}>
                  <Icon className="w-4 h-4" />
                  {cat.title}
                </div>
                <ul className="space-y-2">
                  {cat.articles.map((a) => (
                    <li key={a}>
                      <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors text-left">
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                        {a}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No articles match your search.</p>
            <Link to="/contact" className="text-primary hover:underline font-semibold">Contact our support team →</Link>
          </div>
        )}

        <div className="mt-12 bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-foreground mb-2">Still need help?</h3>
          <p className="text-muted-foreground mb-5">Our support team is available 24/7 to assist you.</p>
          <Link to="/support"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            Open a Support Ticket
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Help;
