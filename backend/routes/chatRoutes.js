import express from "express";
import logger from "../utils/logger.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";

const router = express.Router();

// Smart local fallback assistant to handle queries when no OpenAI API key is set
function getFallbackResponse(message) {
  const query = message.toLowerCase().trim();

  // FAQs - Wi-Fi
  if (query.includes("wifi") || query.includes("wi-fi") || query.includes("internet") || query.includes("password")) {
    return "The high-speed guest Wi-Fi network is named **'Athithigriha_Guest'**. You don't need a password; simply accept the terms of service on the redirect page. If you need secure access, the premium network password is **'AthithigrihaPremium2026'**.";
  }

  // FAQs - Check-in / Check-out
  if (query.includes("check-in") || query.includes("checkin") || query.includes("checkout") || query.includes("check-out") || query.includes("check in") || query.includes("check out")) {
    return "At Athithigriha, standard check-in time is **2:00 PM** and check-out is **11:00 AM**. Late check-out requests (up to 2:00 PM) can be accommodated depending on availability; please contact our front desk by typing 'request assistance' in the profile tab.";
  }

  // Booking extensions
  if (query.includes("extend") || query.includes("extension") || query.includes("stay longer") || query.includes("extra night")) {
    return "To extend your stay at Athithigriha, please navigate to your 'History' tab under profile, select your active booking, and click 'Request Extension'. Alternatively, let me know which dates you wish to add, and I'll inform the front desk concierge!";
  }

  // Attractions
  if (query.includes("attraction") || query.includes("near") || query.includes("visit") || query.includes("sightseeing") || query.includes("place") || query.includes("tourist")) {
    return "Athithigriha is situated close to several prime attractions:\n\n" +
           "1. 🏛️ **National Heritage Museum** (1.5 km) - A rich history of local art and culture.\n" +
           "2. 🌳 **Central Botanical Gardens** (3.0 km) - Beautiful conservatory and walking trails.\n" +
           "3. 🛍️ **Grand Plaza Mall** (0.8 km) - Premium shopping, local dining, and entertainment.\n\n" +
           "Would you like directions or help booking a taxi?";
  }

  // Room recommendation / Rates
  if (query.includes("recommend") || query.includes("room") || query.includes("suite") || query.includes("rate") || query.includes("price") || query.includes("stay")) {
    return "We offer a range of exquisite accommodations at Athithigriha:\n\n" +
           "• 🛏️ **Deluxe Room**: Perfect for solo travelers or couples (features a King bed, work desk, and balcony).\n" +
           "• 🛋️ **Executive Suite**: Ideal for business travelers (separated living area and kitchenette).\n" +
           "• 👑 **Presidential Penthouse**: The pinnacle of luxury with panoramic views, private jacuzzi, and dedicated butler service.\n\n" +
           "Go to our 'Stays' tab in the app to view real-time availability and special member rates!";
  }

  // Restaurant / Food
  if (query.includes("food") || query.includes("eat") || query.includes("restaurant") || query.includes("breakfast") || query.includes("dinner") || query.includes("menu")) {
    return "Our in-house fine dining restaurant, **'The Spice Route'**, serves gourmet breakfast from **7:00 AM to 10:30 AM** (complimentary for members). Room service is available 24/7. Would you like me to show you the current menu?";
  }

  // Greetings
  if (query.includes("hello") || query.includes("hi ") || query.includes("hey") || query.includes("greetings")) {
    return "Hello! 👋 Welcome to Athithigriha. I am your digital concierge. How can I assist you with your stay, room recommendations, or local recommendations today?";
  }

  // Fallback
  return "I am here to help you with your stay at Athithigriha! You can ask me about check-in/out times, Wi-Fi details, dining options, booking extensions, or room recommendations.";
}

router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      logger.info("[Chat] Querying OpenAI API...");
      
      // Build messages array starting with the system prompt
      const systemPrompt = {
        role: "system",
        content: "You are the Athithigriha AI Concierge, a highly professional, helpful, and premium digital assistant for Athithigriha (a luxury hotel management application). " +
                 "Your task is to assist users with hotel FAQs (check-in is 2:00 PM, check-out is 11:00 AM, Wi-Fi name is 'Athithigriha_Guest' with no password), " +
                 "suggest nearby local attractions (Heritage Museum, Botanical Gardens), recommend rooms (Deluxe Room, Executive Suite, Presidential Penthouse), " +
                 "and advise them on booking extensions. Keep your tone warm, welcoming, and elegant."
      };

      const messages = [systemPrompt];

      // Append optional chat history
      if (Array.isArray(history)) {
        for (const turn of history) {
          if (turn.role && turn.content) {
            messages.push({
              role: turn.role === "user" ? "user" : "assistant",
              content: turn.content
            });
          }
        }
      }

      // Add the latest message
      messages.push({
        role: "user",
        content: message
      });

      // We use built-in fetch (Node 18+) to avoid adding external dependencies
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || "";
        
        logger.info("[Chat] OpenAI API response generated successfully.");
        return res.status(200).json({
          success: true,
          response: aiResponse
        });
      } else {
        const errorText = await response.text();
        logger.error(`[Chat] OpenAI API call failed: ${response.status} - ${errorText}`);
        // Fall back to rule-based response
        const fallback = getFallbackResponse(message);
        return res.status(200).json({
          success: true,
          response: fallback,
          note: "OpenAI error fallback used."
        });
      }
    } else {
      logger.info("[Chat] No OpenAI API Key found. Using rule-based fallback concierge.");
      const reply = getFallbackResponse(message);
      return res.status(200).json({
        success: true,
        response: reply
      });
    }
  } catch (error) {
    logger.error("Error in chat endpoint", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your chat request."
    });
  }
});

export default router;
