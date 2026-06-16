import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:dash_chat_2/dash_chat_2.dart' as dc;

import '../theme/app_theme.dart';
import '../providers/hotel_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/currency_provider.dart';
import '../../shared/domain/entities/hotel_entity.dart';
import '../network/api_service.dart';
import '../utils/injection_container.dart';

class ChatbotBottomSheet extends StatefulWidget {
  const ChatbotBottomSheet({super.key});

  @override
  State<ChatbotBottomSheet> createState() => _ChatbotBottomSheetState();
}

class _ChatbotBottomSheetState extends State<ChatbotBottomSheet> {
  final List<dc.ChatMessage> _messages = [];
  bool _isTyping = false;
  late dc.ChatUser _currentUser;
  late dc.ChatUser _chatbotUser;

  final List<String> _suggestions = [
    'Recommend a luxury hotel',
    'Show me the best deals',
    'Which hotels have pools?',
    'What are the cancellation rules?',
  ];

  @override
  void initState() {
    super.initState();
    _currentUser = dc.ChatUser(id: 'guest', firstName: 'Guest');
    _chatbotUser = dc.ChatUser(
      id: 'chatbot',
      firstName: 'Athithigriha AI Concierge',
    );
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userName = authProvider.user?.name ?? 'Guest';
    final userId = authProvider.user?.id ?? 'guest';
    final key = 'chatbot_messages_$userId';

    setState(() {
      _currentUser = dc.ChatUser(id: userId, firstName: userName);
    });

    final prefs = await SharedPreferences.getInstance();
    final String? savedData = prefs.getString(key);

    if (savedData != null && savedData.isNotEmpty) {
      try {
        final List<dynamic> decoded = jsonDecode(savedData);
        final loaded = decoded.map((item) {
          final jsonMap = item as Map<String, dynamic>;
          return dc.ChatMessage(
            text: jsonMap['text'] as String,
            user: dc.ChatUser(
              id: jsonMap['userId'] as String,
              firstName: jsonMap['userFirstName'] as String?,
              profileImage: jsonMap['userProfileImage'] as String?,
            ),
            createdAt: DateTime.parse(jsonMap['createdAt'] as String),
            customProperties:
                jsonMap['customProperties'] as Map<String, dynamic>?,
          );
        }).toList();

        if (mounted) {
          setState(() {
            _messages.addAll(loaded);
          });
        }
      } catch (e) {
        debugPrint('[Chatbot] Error parsing saved messages: $e');
      }
    }

    if (_messages.isEmpty) {
      if (mounted) {
        setState(() {
          _messages.add(
            dc.ChatMessage(
              text:
                  'Hello $userName! 👋 I am your Athithigriha AI Concierge. How can I assist you with your stay today?',
              user: _chatbotUser,
              createdAt: DateTime.now(),
            ),
          );
        });
        _saveMessages();
      }
    }
  }

  Future<void> _saveMessages() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userId = authProvider.user?.id ?? 'guest';
    final key = 'chatbot_messages_$userId';

    final prefs = await SharedPreferences.getInstance();
    final List<Map<String, dynamic>> toSave = _messages.map((m) {
      return {
        'text': m.text,
        'userId': m.user.id,
        'userFirstName': m.user.firstName,
        'userProfileImage': m.user.profileImage,
        'createdAt': m.createdAt.toIso8601String(),
        'customProperties': m.customProperties,
      };
    }).toList();

    await prefs.setString(key, jsonEncode(toSave));
  }

  void _onSend(dc.ChatMessage message) async {
    if (message.text.trim().isEmpty) return;

    setState(() {
      _messages.insert(0, message);
      _isTyping = true;
    });
    _saveMessages();

    final api = sl<ApiService>();
    try {
      final history = _messages.reversed.map((m) {
        return {
          'role': m.user.id == _currentUser.id ? 'user' : 'assistant',
          'content': m.text,
        };
      }).toList();

      final response = await api.post(
        'chat',
        data: {'message': message.text, 'history': history},
      );

      String replyText =
          "I apologize, I'm having trouble connecting to my systems right now.";
      List<Map<String, dynamic>>? recommendedHotels;

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        replyText = data['response'] ?? replyText;

        final queryLower = message.text.toLowerCase();
        final hotelProvider = Provider.of<HotelProvider>(
          context,
          listen: false,
        );
        final allHotels = hotelProvider.allHotels;

        if (queryLower.contains('recommend') ||
            queryLower.contains('hotel') ||
            queryLower.contains('stay') ||
            queryLower.contains('room')) {
          recommendedHotels = allHotels.take(3).map((h) => h.toJson()).toList();
        } else if (queryLower.contains('deal') ||
            queryLower.contains('offer') ||
            queryLower.contains('promo')) {
          recommendedHotels = allHotels
              .where((h) => h.isDeal)
              .map((h) => h.toJson())
              .toList();
        } else if (queryLower.contains('pool')) {
          recommendedHotels = allHotels
              .where(
                (h) => h.amenities.any((a) => a.toLowerCase().contains('pool')),
              )
              .map((h) => h.toJson())
              .toList();
        }
      }

      final aiMessage = dc.ChatMessage(
        text: replyText,
        user: _chatbotUser,
        createdAt: DateTime.now(),
        customProperties: recommendedHotels != null
            ? {'hotels': recommendedHotels}
            : null,
      );

      if (mounted) {
        setState(() {
          _isTyping = false;
          _messages.insert(0, aiMessage);
        });
        _saveMessages();
      }
    } catch (e) {
      debugPrint('[Chatbot] Send error: $e');
      final errorMessage = dc.ChatMessage(
        text:
            "Sorry, I couldn't reach the server. Please check your internet connection.",
        user: _chatbotUser,
        createdAt: DateTime.now(),
      );
      if (mounted) {
        setState(() {
          _isTyping = false;
          _messages.insert(0, errorMessage);
        });
        _saveMessages();
      }
    }
  }

  void _handleSuggestionPressed(String text) {
    final message = dc.ChatMessage(
      text: text,
      user: _currentUser,
      createdAt: DateTime.now(),
    );
    _onSend(message);
  }

  void _clearChat() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userId = authProvider.user?.id ?? 'guest';
    final key = 'chatbot_messages_$userId';

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);

    if (mounted) {
      setState(() {
        _messages.clear();
        _messages.add(
          dc.ChatMessage(
            text:
                'Hello ${_currentUser.firstName}! 👋 I am your Athithigriha AI Concierge. How can I assist you with your stay today?',
            user: _chatbotUser,
            createdAt: DateTime.now(),
          ),
        );
      });
      _saveMessages();
    }
  }

  Widget _buildMessageBottom(
    dc.ChatMessage message,
    dc.ChatMessage? previousMessage,
    dc.ChatMessage? nextMessage,
  ) {
    final rawHotels = message.customProperties?['hotels'] as List<dynamic>?;
    final List<HotelEntity> hotels = [];
    if (rawHotels != null) {
      for (final h in rawHotels) {
        try {
          hotels.add(HotelEntity.fromJson(h as Map<String, dynamic>));
        } catch (e) {
          debugPrint('Error parsing hotel: $e');
        }
      }
    }

    if (hotels.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 190,
      margin: const EdgeInsets.only(top: 8, left: 36, bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: hotels.length,
        itemBuilder: (context, index) {
          final hotel = hotels[index];
          return _buildMiniHotelCard(hotel);
        },
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
          Navigator.pop(context); // Close bottom sheet
          context.push('/hotel/${hotel.id}');
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(12),
              ),
              child: CachedNetworkImage(
                imageUrl: hotel.imageUrl,
                height: 80,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (context, url) =>
                    Container(color: Colors.grey[200]),
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
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(
                        LucideIcons.mapPin,
                        size: 8,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          hotel.city,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 9,
                          ),
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
                          const Icon(
                            LucideIcons.star,
                            size: 8,
                            color: Colors.amber,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            hotel.rating.toString(),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 9,
                            ),
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenHeight = MediaQuery.of(context).size.height;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final double height = (screenHeight * 0.75).clamp(
      0.0,
      screenHeight - bottomInset,
    );

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF19222E) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          bottom: bottomInset == 0,
          child: Column(
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        LucideIcons.sparkles,
                        color: AppTheme.primaryColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Athithigriha AI Assistant',
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
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Spacer(),
                    if (_messages.length > 1)
                      IconButton(
                        icon: const Icon(
                          LucideIcons.trash2,
                          size: 20,
                          color: Colors.redAccent,
                        ),
                        onPressed: _clearChat,
                      ),
                    IconButton(
                      icon: const Icon(LucideIcons.x),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: dc.DashChat(
                  currentUser: _currentUser,
                  onSend: _onSend,
                  messages: _messages,
                  typingUsers: _isTyping ? [_chatbotUser] : [],
                  inputOptions: dc.InputOptions(
                    inputDecoration: InputDecoration(
                      hintText: 'Ask about hotels, locations, deals...',
                      hintStyle: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white30 : Colors.black38,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      fillColor: isDark
                          ? const Color(0xFF253040)
                          : Colors.grey[100],
                      filled: true,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                    ),
                    inputTextStyle: const TextStyle(fontSize: 14),
                    inputMaxLines: 3,
                    sendButtonBuilder: (onSend) {
                      return GestureDetector(
                        onTap: onSend,
                        child: Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: const BoxDecoration(
                            color: AppTheme.primaryColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            LucideIcons.send,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      );
                    },
                  ),
                  messageOptions: dc.MessageOptions(
                    showTime: true,
                    currentUserContainerColor: AppTheme.primaryColor,
                    containerColor: isDark
                        ? const Color(0xFF253040)
                        : Colors.grey.shade100,
                    currentUserTextColor: Colors.white,
                    textColor: isDark ? Colors.white : Colors.black87,
                    bottom: _buildMessageBottom,
                  ),
                ),
              ),
              if (_messages.length <= 1 && !_isTyping)
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
                          label: Text(
                            suggestion,
                            style: const TextStyle(fontSize: 12),
                          ),
                          onPressed: () => _handleSuggestionPressed(suggestion),
                          backgroundColor: isDark
                              ? const Color(0xFF253040)
                              : Colors.grey[100],
                          side: BorderSide.none,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
