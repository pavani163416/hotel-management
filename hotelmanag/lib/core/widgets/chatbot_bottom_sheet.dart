import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../providers/hotel_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/currency_provider.dart';
import '../../shared/domain/entities/hotel_entity.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final List<HotelEntity>? hotels;
  final DateTime timestamp;

  ChatMessage({
    required this.text,
    required this.isUser,
    this.hotels,
    DateTime? timestamp,
  }) : this.timestamp = timestamp ?? DateTime.now();
}

class ChatbotBottomSheet extends StatefulWidget {
  const ChatbotBottomSheet({super.key});

  @override
  State<ChatbotBottomSheet> createState() => _ChatbotBottomSheetState();
}

class _ChatbotBottomSheetState extends State<ChatbotBottomSheet> {
  final List<ChatMessage> _messages = [];
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isTyping = false;

  final List<String> _suggestions = [
    'Recommend a luxury hotel',
    'Show me the best deals',
    'Which hotels have pools?',
    'What are the cancellation rules?',
  ];

  @override
  void initState() {
    super.initState();
    // Add initial greeting
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final userName = Provider.of<AuthProvider>(context, listen: false).user?.name ?? 'Guest';
      setState(() {
        _messages.add(
          ChatMessage(
            text: 'Hello $userName! 👋 I am your LuxeStay AI Concierge. How can I assist you with your stay today?',
            isUser: false,
          ),
        );
      });
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleSubmitted(String text) {
    if (text.trim().isEmpty) return;
    _textController.clear();

    setState(() {
      _messages.add(ChatMessage(text: text, isUser: true));
      _isTyping = true;
    });
    _scrollToBottom();

    // Simulate AI response delay
    Timer(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      
      final reply = _getAIResponse(text);
      
      setState(() {
        _isTyping = false;
        _messages.add(reply);
      });
      _scrollToBottom();
    });
  }

  ChatMessage _getAIResponse(String query) {
    final cleanQuery = query.toLowerCase().trim();
    final hotelProvider = Provider.of<HotelProvider>(context, listen: false);
    final allHotels = hotelProvider.allHotels;

    // 1. Deals / Offers
    if (cleanQuery.contains('deal') || cleanQuery.contains('offer') || cleanQuery.contains('discount') || cleanQuery.contains('promo')) {
      final deals = allHotels.where((h) => h.isDeal).toList();
      if (deals.isNotEmpty) {
        return ChatMessage(
          text: 'Here are some of the best exclusive deals available right now! 🔥 You can also use code **WELCOME25** during checkout for an additional 25% off your first stay.',
          isUser: false,
          hotels: deals,
        );
      } else {
        return ChatMessage(
          text: 'We don\'t have active discounted deals right now, but you can always apply coupon code **WELCOME25** for 25% off your booking!',
          isUser: false,
        );
      }
    }

    // 2. Pools / Amenities
    if (cleanQuery.contains('pool') || cleanQuery.contains('swim')) {
      final poolHotels = allHotels.where((h) => h.amenities.any((a) => a.toLowerCase().contains('pool'))).toList();
      if (poolHotels.isNotEmpty) {
        return ChatMessage(
          text: 'Here are the premier hotels in our collection featuring beautiful swimming pools: 🏊‍♂️',
          isUser: false,
          hotels: poolHotels,
        );
      }
    }

    // 3. Luxury recommendations
    if (cleanQuery.contains('luxury') || cleanQuery.contains('best') || cleanQuery.contains('premium') || cleanQuery.contains('five star')) {
      final luxuryHotels = allHotels.where((h) => h.rating >= 4.7).toList();
      if (luxuryHotels.isNotEmpty) {
        return ChatMessage(
          text: 'Here are the highest-rated luxury properties in our collection: ⭐✨',
          isUser: false,
          hotels: luxuryHotels,
        );
      }
    }

    // 4. Cancellation rules
    if (cleanQuery.contains('cancel') || cleanQuery.contains('refund') || cleanQuery.contains('rules')) {
      return ChatMessage(
        text: 'Standard bookings at LuxeStay feature free cancellation up to 24 hours before your check-in time. You can manage and cancel your active stays directly via your History tab.',
        isUser: false,
      );
    }

    // 5. Search by City/Location
    for (final hotel in allHotels) {
      final city = hotel.city.toLowerCase();
      final location = hotel.location.toLowerCase();
      if (cleanQuery.contains(city) || cleanQuery.contains(location)) {
        final matches = allHotels.where((h) => h.city.toLowerCase() == city || h.location.toLowerCase().contains(city)).toList();
        if (matches.isNotEmpty) {
          return ChatMessage(
            text: 'I found these amazing hotels in ${hotel.city}: 📍',
            isUser: false,
            hotels: matches,
          );
        }
      }
    }

    // 6. Generic hotel recommendation
    if (cleanQuery.contains('recommend') || cleanQuery.contains('hotel') || cleanQuery.contains('where to stay')) {
      final recommended = allHotels.take(3).toList();
      return ChatMessage(
        text: 'Here are some popular stays recommended for you:',
        isUser: false,
        hotels: recommended,
      );
    }

    // Fallback response
    return ChatMessage(
      text: 'I didn\'t quite catch that. Can you try asking about locations (e.g. "hotels in Paris"), facilities (e.g. "hotels with pools"), "deals", or "cancellation policies"?',
      isUser: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19222E) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            // Slide Bar indicator
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.sparkles, color: AppTheme.primaryColor, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'LuxeStay AI Assistant',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Online concierge',
                            style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(LucideIcons.x),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            
            // Message Area
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  return _buildMessageItem(msg);
                },
              ),
            ),

            if (_isTyping)
              Padding(
                padding: const EdgeInsets.only(left: 16, bottom: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF253040) : Colors.grey[100],
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Text('AI is typing', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                          const SizedBox(width: 6),
                          const SizedBox(
                            width: 10,
                            height: 10,
                            child: CircularProgressIndicator(strokeWidth: 1.5, color: AppTheme.primaryColor),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            // Suggestions List
            if (_messages.length == 1 && !_isTyping)
              Container(
                height: 40,
                margin: const EdgeInsets.only(bottom: 8),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _suggestions.length,
                  itemBuilder: (context, index) {
                    final suggestion = _suggestions[index];
                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        label: Text(suggestion, style: const TextStyle(fontSize: 12)),
                        onPressed: () => _handleSubmitted(suggestion),
                        backgroundColor: isDark ? const Color(0xFF253040) : Colors.grey[100],
                        side: BorderSide.none,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    );
                  },
                ),
              ),

            // Input Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF253040) : Colors.grey[100],
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: TextField(
                        controller: _textController,
                        decoration: const InputDecoration(
                          hintText: 'Ask about hotels, locations, deals...',
                          border: InputBorder.none,
                          hintStyle: TextStyle(fontSize: 13),
                        ),
                        style: const TextStyle(fontSize: 14),
                        onSubmitted: _handleSubmitted,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _handleSubmitted(_textController.text),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: AppTheme.primaryColor,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.send, color: Colors.white, size: 16),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageItem(ChatMessage msg) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: msg.isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: msg.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!msg.isUser) ...[
                const CircleAvatar(
                  radius: 14,
                  backgroundColor: AppTheme.primaryColor,
                  child: Icon(LucideIcons.sparkles, size: 12, color: Colors.white),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: msg.isUser
                        ? AppTheme.primaryColor
                        : (isDark ? const Color(0xFF253040) : Colors.grey[100]),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(msg.isUser ? 16 : 0),
                      bottomRight: Radius.circular(msg.isUser ? 0 : 16),
                    ),
                  ),
                  child: Text(
                    msg.text,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: msg.isUser 
                          ? Colors.white 
                          : (isDark ? Colors.white : Colors.black87),
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (msg.hotels != null && msg.hotels!.isNotEmpty)
            Container(
              height: 190,
              margin: const EdgeInsets.only(top: 8, left: 36),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: msg.hotels!.length,
                itemBuilder: (context, index) {
                  final hotel = msg.hotels![index];
                  return _buildMiniHotelCard(hotel);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMiniHotelCard(HotelEntity hotel) {
    final currencyProvider = Provider.of<CurrencyProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12, bottom: 4, top: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          Navigator.pop(context); // Close Chatbot
          context.push('/hotel/${hotel.id}');
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: CachedNetworkImage(
                imageUrl: hotel.imageUrl,
                height: 80,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(color: Colors.grey[200]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hotel.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(LucideIcons.mapPin, size: 8, color: Colors.grey),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          hotel.city,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: Colors.grey[500], fontSize: 9),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        currencyProvider.format(hotel.pricePerNight),
                        style: const TextStyle(
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(LucideIcons.star, size: 8, color: Colors.amber),
                          const SizedBox(width: 2),
                          Text(
                            hotel.rating.toString(),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 9),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
