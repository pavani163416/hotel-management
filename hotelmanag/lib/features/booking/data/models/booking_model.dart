import '../../domain/entities/booking_entity.dart';

class BookingModel extends BookingEntity {
  const BookingModel({
    required super.id,
    required super.roomId,
    required super.hotelName,
    required super.checkIn,
    required super.checkOut,
    required super.status,
    required super.totalAmount,
    super.imageUrl,
    super.guestName,
    super.roomNumber,
    super.createdAt,
    super.city,
    super.roomType,
    super.pricePerNight,
    super.taxes,
    super.subtotal,
    super.paymentMethod,
    super.nights,
    super.guestId,
    super.guestEmail,
    super.guestPhone,
    super.additionalAdults,
    super.additionalChildren,
  });

  static DateTime _parseDate(dynamic dateStr, {required DateTime fallback}) {
    if (dateStr == null) return fallback;
    try {
      return DateTime.parse(dateStr.toString());
    } catch (_) {
      return fallback;
    }
  }

  static String? _parseMapField(dynamic object, String key) {
    if (object is Map) {
      return object[key]?.toString();
    }
    return null;
  }

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final checkInDate = _parseDate(json['checkIn'], fallback: DateTime.now());
    final checkOutDate = _parseDate(
      json['checkOut'],
      fallback: DateTime.now().add(const Duration(days: 3)),
    );
    final createdDate = json['createdAt'] != null
        ? _parseDate(json['createdAt'], fallback: DateTime.now())
        : null;

    final hotelMapName = json['hotelId'] is Map
        ? json['hotelId']['name']?.toString()
        : null;
    final hotelObjName = json['hotel'] is Map
        ? json['hotel']['name']?.toString()
        : null;

    final hotelImage = json['hotelId'] is Map
        ? (json['hotelId']['image'] ?? json['hotelId']['imageUrl'])?.toString()
        : null;
    final roomImages =
        json['room'] is Map &&
            json['room']['images'] is List &&
            (json['room']['images'] as List).isNotEmpty
        ? json['room']['images'][0]?.toString()
        : null;

    final guestSnapshot = json['guestSnapshot'] is Map
        ? json['guestSnapshot'] as Map<String, dynamic>
        : null;
    final additionalAdultsList = json['additionalAdults'] is List
        ? (json['additionalAdults'] as List)
              .map(
                (e) => e is Map
                    ? Map<String, dynamic>.from(e)
                    : <String, dynamic>{},
              )
              .toList()
        : null;
    final additionalChildrenList = json['additionalChildren'] is List
        ? (json['additionalChildren'] as List)
              .map(
                (e) => e is Map
                    ? Map<String, dynamic>.from(e)
                    : <String, dynamic>{},
              )
              .toList()
        : null;

    return BookingModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      roomId: json['roomId']?.toString() ?? '',
      hotelName:
          json['hotelName']?.toString() ?? hotelMapName ?? hotelObjName ?? '',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: json['status']?.toString() ?? 'Confirmed',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      imageUrl:
          hotelImage ??
          json['imageUrl']?.toString() ??
          _parseMapField(json['hotel'], 'imageUrl') ??
          _parseMapField(json['hotel'], 'image') ??
          roomImages,
      guestName:
          _parseMapField(json['guestSnapshot'], 'name') ??
          _parseMapField(json['guest'], 'name') ??
          'Guest',
      roomNumber:
          _parseMapField(json['room'], 'roomNumber') ??
          json['roomId']?.toString() ??
          '',
      createdAt: createdDate,
      city:
          (json['hotelId'] is Map
              ? (json['hotelId']['location'] ?? json['hotelId']['city'])
                    ?.toString()
              : null) ??
          _parseMapField(json['guestSnapshot'], 'city') ??
          _parseMapField(json['guest'], 'city'),
      roomType: _parseMapField(json['room'], 'type'),
      pricePerNight: (json['pricePerNight'] ?? json['room']?['pricePerNight'])
          ?.toDouble(),
      taxes: json['taxes']?.toDouble(),
      subtotal: json['subtotal']?.toDouble(),
      paymentMethod: json['paymentMethod']?.toString(),
      nights: json['nights'] != null ? (json['nights'] as num).toInt() : null,
      guestId: guestSnapshot?['id']?.toString(),
      guestEmail: guestSnapshot?['email']?.toString(),
      guestPhone: guestSnapshot?['phone']?.toString(),
      additionalAdults: additionalAdultsList,
      additionalChildren: additionalChildrenList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'roomId': roomId,
      'hotelName': hotelName,
      'checkIn': checkIn.toIso8601String(),
      'checkOut': checkOut.toIso8601String(),
      'status': status,
      'totalAmount': totalAmount,
      'imageUrl': imageUrl,
      'guestName': guestName,
      'roomNumber': roomNumber,
      'createdAt': createdAt?.toIso8601String(),
      'city': city,
      'roomType': roomType,
      'pricePerNight': pricePerNight,
      'taxes': taxes,
      'subtotal': subtotal,
      'paymentMethod': paymentMethod,
      'nights': nights,
      'guestId': guestId,
      'guestEmail': guestEmail,
      'guestPhone': guestPhone,
      'additionalAdults': additionalAdults,
      'additionalChildren': additionalChildren,
    };
  }
}
