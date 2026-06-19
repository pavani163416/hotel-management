import 'package:equatable/equatable.dart';

class ReviewEntity extends Equatable {
  final String id;
  final String author;
  final double rating;
  final String comment;
  final String date;
  final String? userId;
  final String? userEmail;

  const ReviewEntity({
    required this.id,
    required this.author,
    required this.rating,
    required this.comment,
    required this.date,
    this.userId,
    this.userEmail,
  });

  factory ReviewEntity.fromJson(Map<String, dynamic> json) {
    return ReviewEntity(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      author: json['author'] ?? '',
      rating: (json['rating'] ?? 0).toDouble(),
      comment: json['comment'] ?? '',
      date: json['date'] ?? '',
      userId: json['userId']?.toString(),
      userEmail: json['userEmail']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      '_id': id,
      'author': author,
      'rating': rating,
      'comment': comment,
      'date': date,
      'userId': userId,
      'userEmail': userEmail,
    };
  }

  @override
  List<Object?> get props => [id, author, rating, comment, date, userId, userEmail];
}

class RoomEntity extends Equatable {
  final String id;
  final String name;
  final String description;
  final double price;
  final int capacity;
  final String bed;
  final int available;
  final List<String> features;

  const RoomEntity({
    required this.id,
    required this.name,
    this.description = '',
    required this.price,
    this.capacity = 2,
    this.bed = '',
    this.available = 1,
    this.features = const [],
  });

  factory RoomEntity.fromJson(Map<String, dynamic> json) {
    return RoomEntity(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name'] ?? json['roomNumber'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] ?? json['pricePerNight'] ?? 0.0).toDouble(),
      capacity: (json['capacity'] ?? 2).toInt(),
      bed: json['bed'] ?? '',
      available: (json['available'] ?? 1).toInt(),
      features: List<String>.from(json['features'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'capacity': capacity,
      'bed': bed,
      'available': available,
      'features': features,
    };
  }

  @override
  List<Object?> get props => [
    id,
    name,
    description,
    price,
    capacity,
    bed,
    available,
    features,
  ];
}

class HotelEntity extends Equatable {
  final String id;
  final String name;
  final String location;
  final String city;
  final double rating;
  final int reviewCount;
  final double pricePerNight;
  final double? originalPrice;
  final double discountPct;
  final bool isDeal;
  final String imageUrl;
  final String description;
  final String type;
  final List<double> coords;
  final List<String> amenities;
  final List<ReviewEntity> reviews;
  final List<RoomEntity> rooms;
  final List<String> gallery;
  final String category;
  final int maxGuests;

  const HotelEntity({
    required this.id,
    required this.name,
    required this.location,
    this.city = '',
    required this.rating,
    this.reviewCount = 0,
    required this.pricePerNight,
    this.originalPrice,
    this.discountPct = 0,
    this.isDeal = false,
    required this.imageUrl,
    required this.description,
    this.type = 'Hotel',
    this.coords = const [0.0, 0.0],
    this.amenities = const [],
    this.reviews = const [],
    this.rooms = const [],
    this.gallery = const [],
    this.category = 'General',
    this.maxGuests = 8,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'location': location,
      'city': city,
      'rating': rating,
      'reviewCount': reviewCount,
      'pricePerNight': pricePerNight,
      'originalPrice': originalPrice,
      'discountPct': discountPct,
      'isDeal': isDeal,
      'imageUrl': imageUrl,
      'description': description,
      'type': type,
      'coords': coords,
      'amenities': amenities,
      'reviews': reviews.map((r) => r.toJson()).toList(),
      'rooms': rooms.map((r) => r.toJson()).toList(),
      'gallery': gallery,
      'category': category,
      'maxGuests': maxGuests,
    };
  }

  factory HotelEntity.fromJson(Map<String, dynamic> json) {
    return HotelEntity(
      id: json['id'] ?? json['hotelId'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      location: json['location'] ?? json['city'] ?? '',
      city: json['city'] ?? json['location'] ?? '',
      rating: (json['rating'] ?? 0).toDouble(),
      reviewCount: (json['reviewCount'] ?? 0).toInt(),
      pricePerNight: (json['pricePerNight'] ?? 0).toDouble(),
      originalPrice: json['originalPrice'] != null
          ? (json['originalPrice'] as num).toDouble()
          : null,
      discountPct: (json['discountPct'] ?? 0).toDouble(),
      isDeal: json['isDeal'] ?? false,
      imageUrl: json['imageUrl'] ?? json['image'] ?? '',
      description: json['description'] ?? '',
      type: json['type'] ?? 'Hotel',
      coords:
          (json['coords'] as List?)
              ?.map((e) => (e as num).toDouble())
              .toList() ??
          [0.0, 0.0],
      amenities: List<String>.from(json['amenities'] ?? []),
      reviews: (json['reviews'] as List? ?? [])
          .map((r) => ReviewEntity.fromJson(r))
          .toList(),
      rooms: (json['rooms'] as List? ?? [])
          .map((r) => RoomEntity.fromJson(r))
          .toList(),
      gallery: List<String>.from(json['gallery'] ?? []),
      category: json['category'] ?? 'General',
      maxGuests: (json['maxGuests'] ?? 8).toInt(),
    );
  }

  @override
  List<Object?> get props => [
    id,
    name,
    location,
    city,
    rating,
    reviewCount,
    pricePerNight,
    originalPrice,
    discountPct,
    isDeal,
    imageUrl,
    description,
    type,
    coords,
    amenities,
    reviews,
    rooms,
    gallery,
    category,
    maxGuests,
  ];
}
