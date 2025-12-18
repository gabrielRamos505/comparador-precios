import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String? name;

  const User({
    required this.id,
    required this.email,
    this.name,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '', // ✅ Convertir a String
      email: json['email'] ?? '',
      name: json['name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
    };
  }

  @override
  List<Object?> get props => [id, email, name];
}

class LoginRequest {
  final String email;
  final String password;

  LoginRequest({required this.email, required this.password});

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }
}

class RegisterRequest {
  final String name;
  final String email;
  final String password;

  RegisterRequest({
    required this.name,
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'password': password,
    };
  }
}

class AuthResponse {
  final String userId;
  final String email;
  final String token;
  final String? name;

  AuthResponse({
    required this.userId,
    required this.email,
    required this.token,
    this.name,
  });

  // ✅ CORREGIDO: Ahora procesa correctamente la respuesta del backend
  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    // El backend envía: { success: true, token: "...", user: { id, email, name } }
    final userData = json['user'] ?? json;
    
    return AuthResponse(
      userId: (userData['id'] ?? userData['userId'] ?? '').toString(),
      email: userData['email'] ?? '',
      token: json['token'] ?? '',
      name: userData['name'],
    );
  }

  User toUser() {
    return User(
      id: userId,
      email: email,
      name: name,
    );
  }
}
