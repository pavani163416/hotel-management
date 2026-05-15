import 'package:equatable/equatable.dart';

class HotelEntity extends Equatable {
  final String id;
  final String name;
  final String location;
  final double rating;
  final double pricePerNight;
  final String imageUrl;
  final String description;
  final String type; // e.g., Hotel, Resort, Villa, Suite
  final List<String> amenities;

  const HotelEntity({
    required this.id,
    required this.name,
    required this.location,
    required this.rating,
    required this.pricePerNight,
    required this.imageUrl,
    required this.description,
    this.type = 'Hotel',
    this.amenities = const [],
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'location': location,
      'rating': rating,
      'pricePerNight': pricePerNight,
      'imageUrl': imageUrl,
      'description': description,
      'type': type,
      'amenities': amenities,
    };
  }

  factory HotelEntity.fromJson(Map<String, dynamic> json) {
    return HotelEntity(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      location: json['location'] ?? '',
      rating: (json['rating'] ?? 0).toDouble(),
      pricePerNight: (json['pricePerNight'] ?? 0).toDouble(),
      imageUrl: json['imageUrl'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] ?? 'Hotel',
      amenities: List<String>.from(json['amenities'] ?? []),
    );
  }

  @override
  List<Object?> get props => [id, name, location, rating, pricePerNight, imageUrl, description, type, amenities];
}
