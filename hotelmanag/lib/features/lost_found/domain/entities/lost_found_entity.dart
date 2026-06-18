import 'package:equatable/equatable.dart';

class LostFoundEntity extends Equatable {
  final String id;
  final String hotelId;
  final String userId;
  final String type; // 'Lost', 'Found'
  final String itemName;
  final String category;
  final String description;
  final String location;
  final DateTime dateLostFound;
  final String contactName;
  final String contactPhone;
  final String status;
  final DateTime createdAt;

  const LostFoundEntity({
    required this.id,
    required this.hotelId,
    required this.userId,
    required this.type,
    required this.itemName,
    required this.category,
    required this.description,
    required this.location,
    required this.dateLostFound,
    required this.contactName,
    required this.contactPhone,
    required this.status,
    required this.createdAt,
  });

  @override
  List<Object?> get props => [
        id, hotelId, userId, type, itemName, category, description,
        location, dateLostFound, contactName, contactPhone, status, createdAt
      ];
}
