import 'package:hotelmanag/features/lost_found/domain/entities/lost_found_entity.dart';

class LostFoundModel extends LostFoundEntity {
  const LostFoundModel({
    required super.id,
    required super.hotelId,
    required super.userId,
    required super.type,
    required super.itemName,
    required super.category,
    required super.description,
    required super.location,
    required super.dateLostFound,
    required super.contactName,
    required super.contactPhone,
    required super.status,
    required super.createdAt,
  });

  factory LostFoundModel.fromJson(Map<String, dynamic> json) {
    return LostFoundModel(
      id: json['_id'] ?? json['id'] ?? '',
      hotelId: json['hotelId']?['_id'] ?? json['hotelId'] ?? '',
      userId: json['userId']?['_id'] ?? json['userId'] ?? '',
      type: json['type'] ?? 'Lost',
      itemName: json['itemName'] ?? '',
      category: json['category'] ?? 'Other',
      description: json['description'] ?? '',
      location: json['location'] ?? '',
      dateLostFound: DateTime.parse(json['dateLostFound'] ?? DateTime.now().toIso8601String()),
      contactName: json['contactName'] ?? '',
      contactPhone: json['contactPhone'] ?? '',
      status: json['status'] ?? 'Pending',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }
}
