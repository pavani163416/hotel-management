import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

type ContactAdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
};

export function ContactAdminModal({ isOpen, onClose }: ContactAdminModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl p-0 overflow-hidden">
        <div className="p-6 bg-primary/5 border-b border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-2 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </span>
              Contact Support
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Having trouble accessing your account or managing your hotel? Our support team is here to help.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 space-y-4"
        >
          <a href="mailto:support@luxestay.com" className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Email Support</p>
              <p className="text-sm text-muted-foreground">support@luxestay.com</p>
            </div>
          </a>

          <a href="tel:+18005550199" className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Phone Support</p>
              <p className="text-sm text-muted-foreground">+1 (800) 555-0199</p>
            </div>
          </a>

          <button 
            onClick={onClose}
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-xl font-semibold transition-base"
          >
            Close
          </button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
