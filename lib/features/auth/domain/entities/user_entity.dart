import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String? city;
  final String? profileImage;
  final String? coverImage;
  final List<PaymentMethod> paymentMethods;

  const UserEntity({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.city,
    this.profileImage,
    this.coverImage,
    this.paymentMethods = const [],
  });

  @override
  List<Object?> get props => [id, name, email, phone, city, profileImage, coverImage, paymentMethods];
}

class PaymentMethod extends Equatable {
  final String type; // 'card', 'upi', 'netbanking'
  final String? brand;
  final String? last4;
  final String? expiry;
  final String? upiId;
  final String? bankName;
  final bool isDefault;

  const PaymentMethod({
    required this.type,
    this.brand,
    this.last4,
    this.expiry,
    this.upiId,
    this.bankName,
    required this.isDefault,
  });

  @override
  List<Object?> get props => [type, brand, last4, expiry, upiId, bankName, isDefault];
}
