import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import Layout from "@/components/Layout";
import Stepper from "@/components/Stepper";
import { useBooking, GuestDetails as GuestDetailsType } from "@/context/BookingContext";

const GuestDetails = () => {
  const nav = useNavigate();
  const { selectedHotel, selectedRoom, setGuest, guest } = useBooking();

  const { register, control, handleSubmit, formState: { errors } } = useForm<GuestDetailsType>({
    defaultValues: guest || { name: "", email: "", phone: "", specialRequests: "", adults: [], children: [] }
  });

  const { fields: adultFields, append: appendAdult, remove: removeAdult } = useFieldArray({ control, name: "adults" });
  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({ control, name: "children" });

  useEffect(() => { if (!selectedHotel || !selectedRoom) nav("/hotels"); }, [selectedHotel, selectedRoom, nav]);

  const onSubmit = (data: GuestDetailsType) => { setGuest(data); nav("/review"); };

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <Stepper current={1} />
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Guest Details</h1>
        <p className="text-muted-foreground mb-8">Enter the lead guest information for this reservation.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-2xl p-6 space-y-8">
          {/* Lead Guest */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <span className="grid place-items-center w-10 h-10 rounded-lg bg-primary/10 text-primary"><User className="w-5 h-5" /></span>
              <h2 className="font-semibold text-primary">Lead Guest</h2>
            </div>
            <Field label="Full Name" error={errors.name?.message}>
              <input {...register("name", { required: "Please enter a valid name", minLength: { value: 2, message: "Please enter a valid name" } })}
                placeholder="e.g. James Wilson" className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Email Address" error={errors.email?.message}>
                <input type="email" {...register("email", { required: "Please enter a valid email", pattern: { value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/, message: "Please enter a valid email" } })}
                  placeholder="you@example.com" className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
              </Field>
              <Field label="Phone Number" error={errors.phone?.message}>
                <input {...register("phone", { required: "Enter a valid number", pattern: { value: /^\+?\d{7,15}$/, message: "Enter a valid number" } })}
                  placeholder="+919876543210 or 9876543210" className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
              </Field>
            </div>
            <Field label="Special Requests (optional)">
              <textarea rows={3} {...register("specialRequests")} placeholder="Late check-in, dietary requirements, room preferences..."
                className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-none" />
            </Field>
          </div>

          {/* Additional Adults */}
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-semibold text-primary">Additional Adults</h2>
              <button type="button" onClick={() => appendAdult({ name: "", email: "", phone: "", specialRequests: "", id: "" })}
                className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-base">
                <Plus className="w-4 h-4" /> Add Adult
              </button>
            </div>
            <div className="space-y-6">
              {adultFields.map((field, index) => (
                <div key={field.id} className="relative p-5 border border-border rounded-xl bg-card/50">
                  <button type="button" onClick={() => removeAdult(index)}
                    className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-base" aria-label="Remove adult">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-4">Adult {index + 1}</h3>
                  <div className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Full Name" error={errors.adults?.[index]?.name?.message}>
                        <input {...register(`adults.${index}.name`, { required: "Name is required" })} placeholder="Full Name"
                          className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                      </Field>
                      <Field label="Aadhaar Number (Govt ID)" error={errors.adults?.[index]?.id?.message}>
                        <input {...register(`adults.${index}.id`, { required: "Enter a valid number", pattern: { value: /^\d{12}$/, message: "Enter a valid number" } })} placeholder="12-digit Aadhaar number"
                          className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                      </Field>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Email Address" error={errors.adults?.[index]?.email?.message}>
                        <input type="email" {...register(`adults.${index}.email`, { required: "Please enter a valid email", pattern: { value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/, message: "Please enter a valid email" } })}
                          placeholder="you@example.com" className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                      </Field>
                      <Field label="Phone Number" error={errors.adults?.[index]?.phone?.message}>
                        <input {...register(`adults.${index}.phone`, { required: "Enter a valid number", pattern: { value: /^\+?\d{7,15}$/, message: "Enter a valid number" } })}
                          placeholder="+919876543210 or 9876543210" className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                      </Field>
                    </div>
                    <Field label="Special Requests (optional)">
                      <textarea rows={2} {...register(`adults.${index}.specialRequests`)} placeholder="Dietary requirements, room preferences..."
                        className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-none" />
                    </Field>
                  </div>
                </div>
              ))}
              {adultFields.length === 0 && <p className="text-sm text-muted-foreground italic">No additional adults.</p>}
            </div>
          </div>

          {/* Children */}
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-semibold text-primary">Children</h2>
              <button type="button" onClick={() => appendChild({ name: "", age: "", id: "" })}
                className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-base">
                <Plus className="w-4 h-4" /> Add Child
              </button>
            </div>
            <div className="space-y-4">
              {childFields.map((field, index) => (
                <div key={field.id} className="relative p-5 border border-border rounded-xl bg-card/50">
                  <button type="button" onClick={() => removeChild(index)}
                    className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-base" aria-label="Remove child">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-4">Child {index + 1}</h3>
                  <div className="grid sm:grid-cols-[2fr_1fr_2fr] gap-5">
                    <Field label="Full Name" error={errors.children?.[index]?.name?.message}>
                      <input {...register(`children.${index}.name`, { required: "Name is required" })} placeholder="Full Name"
                        className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                    </Field>
                    <Field label="Age" error={errors.children?.[index]?.age?.message}>
                      <input type="number" {...register(`children.${index}.age`, { required: "Enter a valid number", min: { value: 0, message: "Enter a valid number" }, max: { value: 17, message: "Enter a valid number" }, valueAsNumber: true })} placeholder="e.g. 5"
                        className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                    </Field>
                    <Field label="Aadhaar Number (Govt ID)" error={errors.children?.[index]?.id?.message}>
                      <input {...register(`children.${index}.id`, { required: "Enter a valid number", pattern: { value: /^\d{12}$/, message: "Enter a valid number" } })} placeholder="12-digit Aadhaar"
                        className="w-full px-4 py-2.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm" />
                    </Field>
                  </div>
                </div>
              ))}
              {childFields.length === 0 && <p className="text-sm text-muted-foreground italic">No children.</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-base">
              Continue to Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <label className="block w-full">
    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
    <div className="mt-1.5">{children}</div>
    {error && <span className="text-destructive text-xs mt-1 block">{error}</span>}
  </label>
);

export default GuestDetails;
