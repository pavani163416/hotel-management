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

  const BookingEntity({
    required this.id,
    required this.roomId,
    required this.hotelName,
    required this.checkIn,
    required this.checkOut,
    required this.status,
    required this.totalAmount,
    this.imageUrl,
  });

  @override
  List<Object?> get props => [id, roomId, hotelName, checkIn, checkOut, status, totalAmount, imageUrl];
}
