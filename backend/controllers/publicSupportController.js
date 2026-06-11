import PublicSupportRequest from "../models/PublicSupportRequest.js";
import Notification from "../models/Notification.js";
import { Resend } from "resend";

// Helper for Cloudinary stream upload
const uploadBufferToCloudinary = async (buffer, filename, mimetype) => {
  const { v2: cloudinary } = await import("cloudinary");
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === "application/pdf" || (filename && filename.toLowerCase().endsWith(".pdf"));
    const cleanFilename = filename.includes(".") ? filename.split('.').slice(0, -1).join('.') : filename;
    const uploadOptions = {
      folder: "luxestay/support",
      resource_type: isPdf ? "image" : "auto", 
      format: isPdf ? "pdf" : undefined,
      public_id: `${cleanFilename}-${Date.now()}`,
    };
    
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    uploadStream.end(buffer);
  });
};

export const createPublicTicket = async (req, res) => {
  try {
    const { fullName, hotelName, email, phoneNumber, issueType, priority, message, captchaId, captchaAnswer, captchaToken } = req.body;

    // CAPTCHA verification
    if (!captchaToken && (!captchaId || !captchaAnswer)) {
      return res.status(400).json({
        success: false,
        message: "Security check is required. Please complete the CAPTCHA challenge."
      });
    }

    const { verifyCaptchaOrToken } = await import("../utils/captcha.js");
    const captchaValid = await verifyCaptchaOrToken({ captchaId, captchaAnswer, captchaToken });
    if (!captchaValid) {
      return res.status(400).json({
        success: false,
        message: "Incorrect security check answer. Please try again."
      });
    }

    // Resolve names to support both frontend naming variants safely
    const finalName = String(fullName || req.body.guestName || "").trim();
    const finalEmail = String(email || req.body.guestEmail || "").trim();
    const finalIssue = String(issueType || req.body.category || "Other").trim();
    const finalMessage = String(message || "").trim();

    // Validation
    if (!finalName || !finalEmail || !finalIssue || !finalMessage) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Process files if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadBufferToCloudinary(file.buffer, file.originalname, file.mimetype);
          attachments.push({
            url: result.secure_url,
            name: file.originalname,
            size: file.size,
            type: file.mimetype
          });
        } catch (err) {
          console.error("Cloudinary upload error:", err);
          return res.status(500).json({ success: false, message: "Failed to upload attachments" });
        }
      }
    }

    // Generate unique Ticket ID
    const year = new Date().getFullYear();
    const count = await PublicSupportRequest.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`)
      }
    });
    const ticketId = `HMS-${year}-${String(count + 1).padStart(4, '0')}`;

    const newTicket = await PublicSupportRequest.create({
      ticketId,
      fullName: finalName,
      hotelName: hotelName || "",
      email: finalEmail,
      phoneNumber: phoneNumber || "",
      issueType: finalIssue,
      priority: priority || "Medium",
      message: finalMessage,
      attachments,
      ipAddress: req.ip || req.socket.remoteAddress
    });

    // Create Notification for Super Admin
    await Notification.create({
      role: "admin",
      message: `New public support ticket ${ticketId} from ${fullName} - ${issueType}`,
      type: "system"
    });

    // Emit Socket.IO event to admin room
    const io = req.app.get("io");
    if (io) {
      io.to("role:admin").to("role:Super Admin").emit("support:new-public-ticket", {
        ticketId,
        fullName,
        issueType,
        priority
      });
      io.to("role:admin").to("role:Super Admin").emit("notification:new", {
        type: "system",
        message: `New public support ticket ${ticketId} from ${fullName} - ${issueType}`
      });
    }

    // Optionally send email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "LuxeStay <onboarding@resend.dev>",
          to: [process.env.ADMIN_EMAIL || "addepallipavani4@gmail.com"], // Change if needed
          subject: `New Support Request: ${ticketId} - ${issueType}`,
          html: `
            <h2>New Public Support Ticket</h2>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Issue Type:</strong> ${issueType}</p>
            <p><strong>Priority:</strong> ${priority}</p>
            <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
          `
        });
      } catch (err) {
        console.error("Failed to send Resend email for support ticket:", err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Support request submitted successfully",
      ticketId
    });
  } catch (error) {
    console.error("Create public ticket error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create support ticket" });
  }
};

export const getAllPublicTickets = async (req, res) => {
  try {
    const { status, priority, issueType, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (issueType) query.issueType = issueType;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { ticketId: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tickets = await PublicSupportRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PublicSupportRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch tickets" });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "In Progress", "Resolved", "Closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const ticket = await PublicSupportRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Emit event if needed for realtime dashboard updates
    const io = req.app.get("io");
    if (io) {
      io.to("role:admin").to("role:Super Admin").emit("support:public-ticket-updated", ticket);
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to update ticket" });
  }
};

export const getPublicTicketById = async (req, res) => {
  try {
    const ticket = await PublicSupportRequest.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch ticket" });
  }
};
