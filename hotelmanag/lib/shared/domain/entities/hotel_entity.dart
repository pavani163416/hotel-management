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

  const HotelEntity({
    required this.id,
    required this.name,
    required this.location,
    required this.rating,
    required this.pricePerNight,
    required this.imageUrl,
    required this.description,
    this.type = 'Hotel',
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
    };
  }

  factory HotelEntity.fromJson(Map<String, dynamic> json) {
    return HotelEntity(
      id: json['id'],
      name: json['name'],
      location: json['location'],
      rating: (json['rating'] as num).toDouble(),
      pricePerNight: (json['pricePerNight'] as num).toDouble(),
      imageUrl: json['imageUrl'],
      description: json['description'] ?? '',
      type: json['type'] ?? 'Hotel',
    );
  }

  @override
  List<Object?> get props => [id, name, location, rating, pricePerNight, imageUrl, description, type];
}
