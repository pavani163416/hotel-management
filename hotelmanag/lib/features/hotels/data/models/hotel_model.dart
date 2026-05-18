import 'package:hotelmanag/shared/domain/entities/hotel_entity.dart';

class HotelModel extends HotelEntity {
  const HotelModel({
    required super.id,
    required super.name,
    required super.location,
    required super.rating,
    required super.pricePerNight,
    required super.imageUrl,
    required super.description,
    super.type,
    super.amenities,
    super.reviews,
  });

  factory HotelModel.fromJson(Map<String, dynamic> json) {
    return HotelModel(
      id: json['hotelId'] ?? json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      location: json['location'] ?? json['city'] ?? '',
      rating: (json['rating'] ?? 0).toDouble(),
      pricePerNight: (json['pricePerNight'] ?? 0).toDouble(),
      imageUrl: json['imageUrl'] ?? json['image'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] ?? 'Hotel',
      amenities: List<String>.from(json['amenities'] ?? []),
      reviews: (json['reviews'] as List? ?? [])
          .map((r) => ReviewEntity.fromJson(r))
          .toList(),
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      'hotelId': id,
      'name': name,
      'location': location,
      'rating': rating,
      'pricePerNight': pricePerNight,
      'imageUrl': imageUrl,
      'description': description,
      'type': type,
      'amenities': amenities,
      'reviews': reviews.map((r) => r.toJson()).toList(),
    };
  }
}
