import { useState } from "react";
import { Search, Download, X, CreditCard, Banknote, Smartphone, Building } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import Modal from "@/components/Modal";
import { useBookings, Booking } from "@/context/BookingsContext";
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";

const methodIcon: Record<string, React.ReactNode> = {
  "Credit Card": <CreditCard className="w-4 h-4" />,
  "UPI":         <Smartphone className="w-4 h-4" />,
  "Bank Transfer": <Building className="w-4 h-4" />,
  "Cash":        <Banknote className="w-4 h-4" />,
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const statusStyle: Record<string, string> = {
  Paid:     "bg-success-light text-success",
  Pending:  "bg-warning-light text-warning",
  Refunded: "bg-primary-light text-primary",
  Failed:   "bg-danger-light text-danger",
};

export default function Payments() {
  const { bookings } = useBookings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All Methods");
  const [detail, setDetail] = useState<Booking | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Only bookings that have a payment record
  const payments = bookings.filter((b) => b.payment);

  const filtered = payments.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.guestSnapshot.name.toLowerCase().includes(q) ||
      b.guestSnapshot.email.toLowerCase().includes(q) ||
      b.payment!.transactionId.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || b.payment!.status === statusFilter;
    const matchMethod = methodFilter === "All Methods" || b.payment!.method === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const totalPaid     = payments.filter((b) => b.payment?.status === "Paid").reduce((s, b) => s + b.totalAmount, 0);
  const totalPending  = payments.filter((b) => b.payment?.status === "Pending").reduce((s, b) => s + b.totalAmount, 0);
  const totalRefunded = payments.filter((b) => b.payment?.status === "Refunded").reduce((s, b) => s + b.totalAmount, 0);

  const handleExport = () => {
    const rows = [
      ["Transaction ID", "Booking ID", "Guest", "Email", "Hotel", "Room No.", "Room Type", "Check-in", "Check-out", "Nights", "Amount", "Method", "Payment Status", "Paid At", "Refunded At"],
      ...payments.map((b) => [
        b.payment!.transactionId, b.id,
        b.guestSnapshot.name, b.guestSnapshot.email,
        b.property, b.room.roomNumber, b.room.type,
        b.checkIn, b.checkOut, b.nights,
        `$${b.totalAmount}`, b.payment!.method,
        b.payment!.status,
        formatDateTime(b.payment!.paidAt),
        b.payment!.refundedAt ? formatDateTime(b.payment!.refundedAt) : "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "payments.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <Topbar title="Payments" />
      <div className="p-6">
        <PageHeader
          title="Payment Transactions"
          subtitle="All payment records linked to guest bookings."
          actions={
            <button onClick={handleExport}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Collected" value={`$${totalPaid.toLocaleString()}`} change="Confirmed payments" trend="up"
            icon={<DollarSign className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="Paid" value={payments.filter((b) => b.payment?.status === "Paid").length} change="Successful" trend="up"
            icon={<CheckCircle className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Pending" value={`$${totalPending.toLocaleString()}`} change="Awaiting payment" trend="neutral"
            icon={<Clock className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
          <StatsCard title="Refunded" value={`$${totalRefunded.toLocaleString()}`} change="Cancelled bookings"
            icon={<AlertCircle className="w-5 h-5 text-danger" />} iconBg="bg-danger-light" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          {/* Filters */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted shrink-0" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by guest, transaction ID or booking ID..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted" />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted" /></button>}
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 outline-none text-text-secondary">
              <option value="All">All Statuses</option>
              <option>Paid</option><option>Pending</option>
              <option>Refunded</option><option>Failed</option>
            </select>
            <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 outline-none text-text-secondary">
              <option>All Methods</option>
              <option>Credit Card</option><option>UPI</option>
              <option>Bank Transfer</option><option>Cash</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Transaction ID", "Guest", "Hotel & Room", "Dates", "Amount", "Paid At", "Method", "Status", "Details"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-muted text-sm">
                      No payment records found.
                    </td>
                  </tr>
                ) : paginated.map((b) => (
                  <tr key={b.payment!.transactionId} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    {/* Transaction ID */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-mono font-semibold text-primary">{b.payment!.transactionId}</p>
                      <p className="text-xs text-muted mt-0.5">#{b.id}</p>
                    </td>

                    {/* Guest */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-light grid place-items-center shrink-0">
                          <span className="text-primary text-xs font-bold">{b.guestSnapshot.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{b.guestSnapshot.name}</p>
                          <p className="text-xs text-muted">{b.guestSnapshot.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Hotel & Room */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-text-primary">{b.property}</p>
                      <p className="text-xs text-muted">Room {b.room.roomNumber} · {b.room.type}</p>
                    </td>

                    {/* Dates */}
                    <td className="px-5 py-4">
                      <p className="text-xs text-text-secondary">
                        {new Date(b.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" – "}
                        {new Date(b.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted">{b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-text-primary">${b.totalAmount.toLocaleString()}</p>
                    </td>

                    {/* Paid At */}
                    <td className="px-5 py-4">
                      <p className="text-xs text-text-secondary whitespace-nowrap">{formatDateTime(b.payment!.paidAt)}</p>
                      {b.payment!.status === "Refunded" && b.payment!.refundedAt && (
                        <p className="text-xs text-danger mt-1 whitespace-nowrap">
                          Refunded {formatDateTime(b.payment!.refundedAt)}
                        </p>
                      )}
                    </td>

                    {/* Method */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <span className="text-muted">{methodIcon[b.payment!.method]}</span>
                        {b.payment!.method}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[b.payment!.status]}`}>
                        {b.payment!.status}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="px-5 py-4">
                      <button onClick={() => setDetail(b)}
                        className="text-xs font-semibold text-primary hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted">
              Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} transactions
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">
                Previous
              </button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${page === i + 1 ? "bg-primary text-white" : "border border-border text-muted hover:bg-surface-3"}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Detail Modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Payment Details">
        {detail && (
          <div className="space-y-4">
            {/* Transaction header */}
            <div className="bg-surface-2 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-0.5">Transaction ID</p>
                <p className="font-mono font-bold text-text-primary text-lg">{detail.payment!.transactionId}</p>
              </div>
              <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusStyle[detail.payment!.status]}`}>
                {detail.payment!.status}
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Booking ID",   `#${detail.id}`],
                ["Payment Method", detail.payment!.method],
                ["Paid At",      formatDateTime(detail.payment!.paidAt)],
                ...(detail.payment!.refundedAt
                  ? [["Refunded At", formatDateTime(detail.payment!.refundedAt)] as [string, string]]
                  : []),
                ["Amount",       `$${detail.totalAmount.toLocaleString()}`],
                ["Guest Name",   detail.guestSnapshot.name],
                ["Guest Email",  detail.guestSnapshot.email],
                ["Hotel",        detail.property],
                ["Room Number",  detail.room.roomNumber],
                ["Room Type",    detail.room.type],
                ["Check-in",     new Date(detail.checkIn).toLocaleDateString("en-US", { dateStyle: "medium" })],
                ["Check-out",    new Date(detail.checkOut).toLocaleDateString("en-US", { dateStyle: "medium" })],
                ["Nights",       `${detail.nights} night${detail.nights !== 1 ? "s" : ""}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-text-primary break-all">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
