enum UserRole { trainer, client }

class UserModel {
  final String id;
  final String email;
  final String name;
  final String? surname;
  final String? phone;
  final UserRole role;
  final String? profileImageUrl;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isActive;
  
  // Trainer specific fields
  final String? bio;
  final List<String>? specializations;
  final double? rating;
  final int? totalClients;
  
  // Client specific fields
  final String? trainerId;
  final double? weight;
  final double? height;
  final int? age;
  final String? fitnessGoal;
  final DateTime? goalStartDate;
  final DateTime? goalEndDate;

  const UserModel({
    required this.id,
    required this.email,
    required this.name,
    this.surname,
    this.phone,
    required this.role,
    this.profileImageUrl,
    required this.createdAt,
    this.updatedAt,
    this.isActive = true,
    this.bio,
    this.specializations,
    this.rating,
    this.totalClients,
    this.trainerId,
    this.weight,
    this.height,
    this.age,
    this.fitnessGoal,
    this.goalStartDate,
    this.goalEndDate,
  });

  String get fullName => surname != null ? '$name $surname' : name;
  
  bool get isTrainer => role == UserRole.trainer;
  bool get isClient => role == UserRole.client;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      surname: json['surname'],
      phone: json['phone'],
      role: UserRole.values.firstWhere(
        (role) => role.name == json['role'],
        orElse: () => UserRole.client,
      ),
      profileImageUrl: json['profile_image_url'],
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
      isActive: json['is_active'] ?? true,
      bio: json['bio'],
      specializations: json['specializations']?.cast<String>(),
      rating: json['rating']?.toDouble(),
      totalClients: json['total_clients'],
      trainerId: json['trainer_id'],
      weight: json['weight']?.toDouble(),
      height: json['height']?.toDouble(),
      age: json['age'],
      fitnessGoal: json['fitness_goal'],
      goalStartDate: json['goal_start_date'] != null 
          ? DateTime.parse(json['goal_start_date']) 
          : null,
      goalEndDate: json['goal_end_date'] != null 
          ? DateTime.parse(json['goal_end_date']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'surname': surname,
      'phone': phone,
      'role': role.name,
      'profile_image_url': profileImageUrl,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'is_active': isActive,
      'bio': bio,
      'specializations': specializations,
      'rating': rating,
      'total_clients': totalClients,
      'trainer_id': trainerId,
      'weight': weight,
      'height': height,
      'age': age,
      'fitness_goal': fitnessGoal,
      'goal_start_date': goalStartDate?.toIso8601String(),
      'goal_end_date': goalEndDate?.toIso8601String(),
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? name,
    String? surname,
    String? phone,
    UserRole? role,
    String? profileImageUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isActive,
    String? bio,
    List<String>? specializations,
    double? rating,
    int? totalClients,
    String? trainerId,
    double? weight,
    double? height,
    int? age,
    String? fitnessGoal,
    DateTime? goalStartDate,
    DateTime? goalEndDate,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      surname: surname ?? this.surname,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isActive: isActive ?? this.isActive,
      bio: bio ?? this.bio,
      specializations: specializations ?? this.specializations,
      rating: rating ?? this.rating,
      totalClients: totalClients ?? this.totalClients,
      trainerId: trainerId ?? this.trainerId,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      age: age ?? this.age,
      fitnessGoal: fitnessGoal ?? this.fitnessGoal,
      goalStartDate: goalStartDate ?? this.goalStartDate,
      goalEndDate: goalEndDate ?? this.goalEndDate,
    );
  }
}