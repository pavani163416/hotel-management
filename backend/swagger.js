import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "LuxeStay API",
    version: "1.0.0",
    description: "OpenAPI 3.0 documentation for the LuxeStay backend.",
  },
  servers: [
    {
      url: process.env.BASE_URL || "http://localhost:5000",
      description: "Primary API server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: { type: ["object", "array", "string", "number", "boolean", "null"] },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
        },
      },
      AuthRegister: {
        type: "object",
        required: ["name", "email", "password", "phone"],
        properties: {
          name: { type: "string", example: "Alex Morgan" },
          email: { type: "string", format: "email", example: "alex@example.com" },
          password: { type: "string", format: "password" },
          phone: { type: "string", example: "+1234567890" },
          city: { type: "string", example: "Miami" },
        },
      },
      AuthLogin: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "alex@example.com" },
          password: { type: "string", format: "password" },
        },
      },
      PasswordReset: {
        type: "object",
        required: ["email", "token", "password"],
        properties: {
          email: { type: "string", format: "email" },
          token: { type: "string" },
          password: { type: "string", format: "password" },
        },
      },
      PhoneVerify: {
        type: "object",
        required: ["phone", "code"],
        properties: {
          phone: { type: "string", example: "+1234567890" },
          code: { type: "string", example: "123456" },
        },
      },
      PromoValidation: {
        type: "object",
        required: ["code"],
        properties: {
          code: { type: "string", example: "WELCOME15" },
          subtotal: { type: "number", example: 250 },
          userEmail: { type: "string", format: "email", example: "alex@example.com" },
        },
      },
      AssistanceRequest: {
        type: "object",
        required: ["hotelId", "userId", "message"],
        properties: {
          hotelId: { type: "string", example: "hdl" },
          userId: { type: "string", example: "user-123" },
          message: { type: "string", example: "Need help with my room booking." },
        },
      },
      UploadImageRequest: {
        type: "object",
        required: ["image"],
        properties: {
          image: { type: "string", example: "data:image/jpeg;base64,/9j/4AAQ..." },
          folder: { type: "string", example: "hotels" },
        },
      },
      RoomAvailabilityRequest: {
        type: "object",
        required: ["roomId", "checkIn", "checkOut"],
        properties: {
          roomId: { type: "string", example: "6427f8b4c4d3f2001c4f6a6a" },
          checkIn: { type: "string", format: "date", example: "2026-06-01" },
          checkOut: { type: "string", format: "date", example: "2026-06-05" },
        },
      },
      BillingReassignRequest: {
        type: "object",
        required: ["newRoomId"],
        properties: {
          newRoomId: { type: "string", example: "6427f8b4c4d3f2001c4f6a6b" },
        },
      },
      CreatePriceRequest: {
        type: "object",
        required: ["roomId", "requestedPrice"],
        properties: {
          roomId: { type: "string", example: "6427f8b4c4d3f2001c4f6a6b" },
          requestedPrice: { type: "number", example: 180 },
          notes: { type: "string", example: "Discount for extended stay" },
        },
      },
      CreateBooking: {
        type: "object",
        required: ["roomId", "checkIn", "checkOut", "guestEmail"],
        properties: {
          roomId: { type: "string", example: "6427f8b4c4d3f2001c4f6a6b" },
          hotelId: { type: "string", example: "hdl" },
          guestEmail: { type: "string", format: "email", example: "guest@example.com" },
          guestName: { type: "string", example: "Alex Morgan" },
          checkIn: { type: "string", format: "date" },
          checkOut: { type: "string", format: "date" },
          totalAmount: { type: "number", example: 450 },
          paymentMethod: { type: "string", example: "card" },
        },
      },
      ManagerRoom: {
        type: "object",
        properties: {
          roomNumber: { type: "string", example: "hdl-101" },
          type: { type: "string", example: "Deluxe" },
          pricePerNight: { type: "number", example: 180 },
          capacity: { type: "integer", example: 2 },
          bedType: { type: "string", example: "King" },
          amenities: { type: "array", items: { type: "string" } },
          status: { type: "string", example: "Available" },
          isActive: { type: "boolean", example: true },
        },
      },
      Room: {
        type: "object",
        properties: {
          _id: { type: "string" },
          roomNumber: { type: "string" },
          type: { type: "string" },
          pricePerNight: { type: "number" },
          capacity: { type: "integer" },
          bedType: { type: "string" },
          status: { type: "string" },
          hotelStringId: { type: "string" },
          hotelId: { type: "string" },
        },
      },
      Hotel: {
        type: "object",
        properties: {
          _id: { type: "string" },
          hotelId: { type: "string" },
          name: { type: "string" },
          address: { type: "string" },
          description: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      Guest: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          city: { type: "string" },
        },
      },
      Manager: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          assignedHotelId: { type: "string" },
          assignedHotelName: { type: "string" },
          role: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      Coupon: {
        type: "object",
        properties: {
          _id: { type: "string" },
          code: { type: "string" },
          type: { type: "string" },
          value: { type: "number" },
          description: { type: "string" },
          isActive: { type: "boolean" },
          validUntil: { type: "string", format: "date" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
          hotelId: { type: "string" },
          type: { type: "string" },
          message: { type: "string" },
          read: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: ["./routes/**/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
