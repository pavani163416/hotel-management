import 'package:equatable/equatable.dart';

class BookingEntity extends Equatable {
  final String id;
  final String roomId;
  final String hotelName;
  final DateTime checkIn;
  final DateTime checkOut;
  final String status;
  final double totalAmount;
  final String? imageUrl;
  final String? guestName;
  final String? roomNumber;
  final DateTime? createdAt;
  final String? city;
  final String? roomType;
  final double? pricePerNight;
  final double? taxes;
  final double? subtotal;
  final String? paymentMethod;
  final int? nights;

  // Custom Guest Snapshot & Additional Guests info
  final String? guestId;
  final String? guestEmail;
  final String? guestPhone;
  final List<Map<String, dynamic>>? additionalAdults;
  final List<Map<String, dynamic>>? additionalChildren;

  const BookingEntity({
    required this.id,
    required this.roomId,
    required this.hotelName,
    required this.checkIn,
    required this.checkOut,
    required this.status,
    required this.totalAmount,
    this.imageUrl,
    this.guestName,
    this.roomNumber,
    this.createdAt,
    this.city,
    this.roomType,
    this.pricePerNight,
    this.taxes,
    this.subtotal,
    this.paymentMethod,
    this.nights,
    this.guestId,
    this.guestEmail,
    this.guestPhone,
    this.additionalAdults,
    this.additionalChildren,
  });

  BookingEntity copyWith({
    String? id,
    String? roomId,
    String? hotelName,
    DateTime? checkIn,
    DateTime? checkOut,
    String? status,
    double? totalAmount,
    String? imageUrl,
    String? guestName,
    String? roomNumber,
    DateTime? createdAt,
    String? city,
    String? roomType,
    double? pricePerNight,
    double? taxes,
    double? subtotal,
    String? paymentMethod,
    int? nights,
    String? guestId,
    String? guestEmail,
    String? guestPhone,
    List<Map<String, dynamic>>? additionalAdults,
    List<Map<String, dynamic>>? additionalChildren,
  }) {
    return BookingEntity(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      hotelName: hotelName ?? this.hotelName,
      checkIn: checkIn ?? this.checkIn,
      checkOut: checkOut ?? this.checkOut,
      status: status ?? this.status,
      totalAmount: totalAmount ?? this.totalAmount,
      imageUrl: imageUrl ?? this.imageUrl,
      guestName: guestName ?? this.guestName,
      roomNumber: roomNumber ?? this.roomNumber,
      createdAt: createdAt ?? this.createdAt,
      city: city ?? this.city,
      roomType: roomType ?? this.roomType,
      pricePerNight: pricePerNight ?? this.pricePerNight,
      taxes: taxes ?? this.taxes,
      subtotal: subtotal ?? this.subtotal,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      nights: nights ?? this.nights,
      guestId: guestId ?? this.guestId,
      guestEmail: guestEmail ?? this.guestEmail,
      guestPhone: guestPhone ?? this.guestPhone,
      additionalAdults: additionalAdults ?? this.additionalAdults,
      additionalChildren: additionalChildren ?? this.additionalChildren,
    );
  }

  @override
  List<Object?> get props => [
    id,
    roomId,
    hotelName,
    checkIn,
    checkOut,
    status,
    totalAmount,
    imageUrl,
    guestName,
    roomNumber,
    createdAt,
    city,
    roomType,
    pricePerNight,
    taxes,
    subtotal,
    paymentMethod,
    nights,
    guestId,
    guestEmail,
    guestPhone,
    additionalAdults,
    additionalChildren,
  ];
}
