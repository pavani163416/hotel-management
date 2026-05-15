import '../../domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.name,
    required super.email,
    required super.phone,
    super.city,
    super.profileImage,
    super.coverImage,
    super.paymentMethods,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      city: json['city'],
      profileImage: json['profileImage'],
      coverImage: json['coverImage'],
      paymentMethods: (json['paymentMethods'] as List? ?? [])
          .map((pm) => PaymentMethodModel.fromJson(pm))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'city': city,
      'profileImage': profileImage,
      'coverImage': coverImage,
      'paymentMethods': paymentMethods
          .map((pm) => (pm as PaymentMethodModel).toJson())
          .toList(),
    };
  }
}

class PaymentMethodModel extends PaymentMethod {
  const PaymentMethodModel({
    required super.type,
    super.brand,
    super.last4,
    super.expiry,
    super.upiId,
    super.bankName,
    required super.isDefault,
  });

  factory PaymentMethodModel.fromJson(Map<String, dynamic> json) {
    return PaymentMethodModel(
      type: json['type'] ?? 'card',
      brand: json['brand'],
      last4: json['last4'],
      expiry: json['expiry'],
      upiId: json['upiId'],
      bankName: json['bankName'],
      isDefault: json['isDefault'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'brand': brand,
      'last4': last4,
      'expiry': expiry,
      'upiId': upiId,
      'bankName': bankName,
      'isDefault': isDefault,
    };
  }
}
