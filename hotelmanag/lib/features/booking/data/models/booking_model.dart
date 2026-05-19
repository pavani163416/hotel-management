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
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] ?? json['_id'] ?? '',
      roomId: json['roomId'] ?? '',
      hotelName: json['hotelName'] ?? (json['hotelId'] is Map ? json['hotelId']['name'] : null) ?? json['hotel']?['name'] ?? '',
      checkIn: DateTime.parse(json['checkIn']),
      checkOut: DateTime.parse(json['checkOut']),
      status: json['status'] ?? 'Confirmed',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      imageUrl: (json['hotelId'] is Map ? json['hotelId']['image'] ?? json['hotelId']['imageUrl'] : null) ??
          json['imageUrl'] ??
          json['hotel']?['imageUrl'] ??
          json['hotel']?['image'] ??
          (json['room']?['images'] != null && (json['room']['images'] as List).isNotEmpty 
              ? json['room']['images'][0] 
              : null),
      guestName: json['guestSnapshot']?['name'] ?? json['guest']?['name'] ?? 'Guest',
      roomNumber: json['room']?['roomNumber'] ?? json['roomId'] ?? '',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
      city: (json['hotelId'] is Map ? (json['hotelId']['location'] ?? json['hotelId']['city']) : null) ?? json['guestSnapshot']?['city'] ?? json['guest']?['city'],
      roomType: json['room']?['type'],
      pricePerNight: json['pricePerNight']?.toDouble() ?? json['room']?['pricePerNight']?.toDouble(),
      taxes: json['taxes']?.toDouble(),
      subtotal: json['subtotal']?.toDouble(),
      paymentMethod: json['paymentMethod'],
      nights: json['nights'],
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
    };
  }
}
