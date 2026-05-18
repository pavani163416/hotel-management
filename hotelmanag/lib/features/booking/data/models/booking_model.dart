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
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] ?? json['_id'] ?? '',
      roomId: json['roomId'] ?? '',
      hotelName: json['hotelName'] ?? json['hotel']?['name'] ?? '',
      checkIn: DateTime.parse(json['checkIn']),
      checkOut: DateTime.parse(json['checkOut']),
      status: json['status'] ?? 'Confirmed',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      imageUrl: json['imageUrl'] ?? json['hotel']?['imageUrl'],
      guestName: json['guestSnapshot']?['name'] ?? json['guest']?['name'] ?? 'Guest',
      roomNumber: json['room']?['roomNumber'] ?? json['roomId'] ?? '',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
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
    };
  }
}
