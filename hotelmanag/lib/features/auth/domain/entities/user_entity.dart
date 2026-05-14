import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String? city;
  final String? profileImage;

  const UserEntity({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.city,
    this.profileImage,
  });

  @override
  List<Object?> get props => [id, name, email, phone, city, profileImage];
}
