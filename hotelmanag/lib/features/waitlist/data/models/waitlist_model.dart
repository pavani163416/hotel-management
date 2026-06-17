import 'package:hotelmanag/features/waitlist/domain/entities/waitlist_entity.dart';

class WaitlistModel extends WaitlistEntity {
  const WaitlistModel({
    required super.id,
    required super.hotelId,
    required super.hotelName,
    required super.hotelImage,
    required super.checkIn,
    required super.checkOut,
    required super.status,
    required super.createdAt,
  });

  factory WaitlistModel.fromJson(Map<String, dynamic> json) {
    return WaitlistModel(
      id: json['_id'] ?? json['id'] ?? '',
      hotelId: json['hotelId']?['_id'] ?? json['hotelId'] ?? '',
      hotelName: json['hotelId']?['name'] ?? json['hotelName'] ?? 'Unknown Hotel',
      hotelImage: json['hotelId']?['image'] ?? json['hotelImage'] ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=60',
      checkIn: DateTime.parse(json['checkIn']),
      checkOut: DateTime.parse(json['checkOut']),
      status: json['status'] ?? 'Pending',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'hotelId': hotelId,
      'hotelName': hotelName,
      'hotelImage': hotelImage,
      'checkIn': checkIn.toIso8601String(),
      'checkOut': checkOut.toIso8601String(),
      'status': status,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
