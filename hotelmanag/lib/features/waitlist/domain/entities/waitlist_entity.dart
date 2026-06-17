import 'package:equatable/equatable.dart';

class WaitlistEntity extends Equatable {
  final String id;
  final String hotelId;
  final String hotelName;
  final String hotelImage;
  final DateTime checkIn;
  final DateTime checkOut;
  final String status;
  final DateTime createdAt;

  const WaitlistEntity({
    required this.id,
    required this.hotelId,
    required this.hotelName,
    required this.hotelImage,
    required this.checkIn,
    required this.checkOut,
    required this.status,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [
        id,
        hotelId,
        hotelName,
        hotelImage,
        checkIn,
        checkOut,
        status,
        createdAt,
      ];
}
