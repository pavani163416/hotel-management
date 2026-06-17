import { jsPDF } from "jspdf";
import type { Booking } from "@/context/BookingContext";

export type ReceiptData = {
  id: string;
  hotelName: string;
  hotelLocation?: string;
  roomName?: string;
  guestName: string;
  guestEmail?: string;
  checkIn: string;
  checkOut: string;
  nights?: number | string;
  total: number;
  status: string;
  createdAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string;
};

const BRAND = { primary: [26, 26, 26] as [number, number, number], accent: [180, 155, 120] as [number, number, number], muted: [100, 100, 100] as [number, number, number], danger: [185, 28, 28] as [number, number, number] };

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function row(doc: jsPDF, y: number, label: string, value: string, bold = false) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text(label, 20, y);
  doc.setTextColor(...BRAND.primary);
  doc.text(value, 75, y);
  return y + 7;
}

/** Generate and download a booking or cancellation receipt PDF. */
export function downloadBookingReceipt(data: ReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const isCancelled = data.status === "Cancelled";
  const pageW = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("AthithiGriha", 20, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Premium Hotel Reservations", 20, 25);

  // Title badge
  let y = 44;
  doc.setFillColor(...(isCancelled ? BRAND.danger : BRAND.accent));
  doc.roundedRect(20, y - 6, isCancelled ? 72 : 58, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(isCancelled ? "CANCELLATION RECEIPT" : "BOOKING RECEIPT", 24, y);

  y += 16;
  doc.setTextColor(...BRAND.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Booking #${data.id}`, 20, y);
  y += 10;

  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, pageW - 20, y);
  y += 10;

  y = row(doc, y, "Hotel", data.hotelName, true);
  if (data.hotelLocation) y = row(doc, y, "Location", data.hotelLocation);
  if (data.roomName) y = row(doc, y, "Room", data.roomName);
  y = row(doc, y, "Guest", data.guestName);
  if (data.guestEmail) y = row(doc, y, "Email", data.guestEmail);
  y = row(doc, y, "Check-in", data.checkIn);
  y = row(doc, y, "Check-out", data.checkOut);
  if (data.nights) y = row(doc, y, "Nights", String(data.nights));
  y = row(doc, y, "Booked on", fmtDate(data.createdAt));

  if (isCancelled) {
    y += 4;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(18, y - 4, pageW - 36, 28, 3, 3, "F");
    y = row(doc, y + 2, "Status", "CANCELLED");
    y = row(doc, y, "Cancelled on", fmtDate(data.cancelledAt));
    if (data.cancellationReason) y = row(doc, y, "Reason", data.cancellationReason);
    y = row(doc, y, "Refund amount", fmtMoney(data.total));
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text("Refund will be processed to your original payment method within 5–7 business days.", 20, y + 4);
    y += 12;
  }

  y += 6;
  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageW - 20, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.primary);
  doc.text(isCancelled ? "Original amount paid" : "Total paid", 20, y);
  doc.setFontSize(16);
  doc.setTextColor(...(isCancelled ? BRAND.danger : BRAND.accent));
  doc.text(fmtMoney(data.total), pageW - 20, y, { align: "right" });

  y += 20;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "normal");
  const footer = isCancelled
    ? "This document confirms your booking cancellation. Keep it for your records."
    : "Thank you for choosing AthithiGriha. Present this receipt at check-in.";
  doc.text(footer, 20, y, { maxWidth: pageW - 40 });
  doc.text("support@athithigriha.com · www.athithigriha.com", 20, 280);

  const filename = isCancelled
    ? `AthithiGriha-Cancellation-${String(data.id).replace(/[^a-zA-Z0-9-]/g, "")}.pdf`
    : `AthithiGriha-Receipt-${String(data.id).replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
  doc.save(filename);
}

export function bookingToReceipt(booking: Booking): ReceiptData {
  return {
    id: booking.id,
    hotelName: booking.hotel.name,
    hotelLocation: booking.hotel.location || booking.hotel.city,
    roomName: booking.room.name,
    guestName: booking.guest.name,
    guestEmail: booking.guest.email,
    checkIn: booking.search.checkIn,
    checkOut: booking.search.checkOut,
    nights: booking.nights,
    total: booking.total,
    status: booking.status,
    createdAt: booking.createdAt,
    cancelledAt: booking.status === "Cancelled" ? booking.createdAt : null,
  };
}

export function historyItemToReceipt(b: {
  id: string;
  hotelName: string;
  hotelLoc?: string;
  roomName?: string;
  guestName?: string;
  checkIn: string;
  checkOut: string;
  nights?: number | string;
  total: number;
  status: string;
  createdAt?: string | null;
  raw?: any;
}): ReceiptData {
  const raw = b.raw || {};
  return {
    id: b.id,
    hotelName: b.hotelName,
    hotelLocation: b.hotelLoc || raw.hotel?.location,
    roomName: b.roomName,
    guestName: b.guestName || raw.guest?.name || raw.guestSnapshot?.name || "Guest",
    guestEmail: raw.guest?.email || raw.guestSnapshot?.email,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    nights: b.nights || raw.nights,
    total: b.total,
    status: b.status,
    createdAt: b.createdAt || raw.createdAt,
    cancelledAt: raw.cancelledAt || null,
    cancellationReason: raw.cancellationReason || undefined,
  };
}
