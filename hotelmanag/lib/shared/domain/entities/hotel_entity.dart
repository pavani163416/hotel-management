import 'package:equatable/equatable.dart';

class ReviewEntity extends Equatable {
  final String author;
  final double rating;
  final String comment;
  final String date;

  const ReviewEntity({
    required this.author,
    required this.rating,
    required this.comment,
    required this.date,
  });

  factory ReviewEntity.fromJson(Map<String, dynamic> json) {
    return ReviewEntity(
      author: json['author'] ?? '',
      rating: (json['rating'] ?? 0).toDouble(),
      comment: json['comment'] ?? '',
      date: json['date'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'author': author,
      'rating': rating,
      'comment': comment,
      'date': date,
    };
  }

  @override
  List<Object?> get props => [author, rating, comment, date];
}

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
  final List<ReviewEntity> reviews;

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
    this.reviews = const [],
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
      'reviews': reviews.map((r) => r.toJson()).toList(),
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
      reviews: (json['reviews'] as List? ?? [])
          .map((r) => ReviewEntity.fromJson(r))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [id, name, location, rating, pricePerNight, imageUrl, description, type, amenities, reviews];
}
