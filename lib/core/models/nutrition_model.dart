class NutritionPlan {
  final String id;
  final String name;
  final String description;
  final String trainerId;
  final String? clientId;
  final List<NutritionDay> days;
  final double? targetCalories;
  final double? targetProtein;
  final double? targetCarbs;
  final double? targetFats;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isActive;

  const NutritionPlan({
    required this.id,
    required this.name,
    required this.description,
    required this.trainerId,
    this.clientId,
    required this.days,
    this.targetCalories,
    this.targetProtein,
    this.targetCarbs,
    this.targetFats,
    required this.createdAt,
    this.updatedAt,
    this.isActive = true,
  });

  factory NutritionPlan.fromJson(Map<String, dynamic> json) {
    return NutritionPlan(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      trainerId: json['trainer_id'] ?? '',
      clientId: json['client_id'],
      days: (json['days'] as List<dynamic>?)
          ?.map((day) => NutritionDay.fromJson(day))
          .toList() ?? [],
      targetCalories: json['target_calories']?.toDouble(),
      targetProtein: json['target_protein']?.toDouble(),
      targetCarbs: json['target_carbs']?.toDouble(),
      targetFats: json['target_fats']?.toDouble(),
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
      isActive: json['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'trainer_id': trainerId,
      'client_id': clientId,
      'days': days.map((day) => day.toJson()).toList(),
      'target_calories': targetCalories,
      'target_protein': targetProtein,
      'target_carbs': targetCarbs,
      'target_fats': targetFats,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'is_active': isActive,
    };
  }
}

class NutritionDay {
  final String id;
  final String name;
  final int dayNumber;
  final List<Meal> meals;
  final String? notes;

  const NutritionDay({
    required this.id,
    required this.name,
    required this.dayNumber,
    required this.meals,
    this.notes,
  });

  double get totalCalories => meals.fold(0.0, (sum, meal) => sum + meal.totalCalories);
  double get totalProtein => meals.fold(0.0, (sum, meal) => sum + meal.totalProtein);
  double get totalCarbs => meals.fold(0.0, (sum, meal) => sum + meal.totalCarbs);
  double get totalFats => meals.fold(0.0, (sum, meal) => sum + meal.totalFats);

  factory NutritionDay.fromJson(Map<String, dynamic> json) {
    return NutritionDay(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      dayNumber: json['day_number'] ?? 1,
      meals: (json['meals'] as List<dynamic>?)
          ?.map((meal) => Meal.fromJson(meal))
          .toList() ?? [],
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'day_number': dayNumber,
      'meals': meals.map((meal) => meal.toJson()).toList(),
      'notes': notes,
    };
  }
}

enum MealType { breakfast, snack1, lunch, snack2, dinner, snack3 }

class Meal {
  final String id;
  final String name;
  final MealType type;
  final List<FoodItem> foods;
  final String? notes;
  final String? time;

  const Meal({
    required this.id,
    required this.name,
    required this.type,
    required this.foods,
    this.notes,
    this.time,
  });

  double get totalCalories => foods.fold(0.0, (sum, food) => sum + food.calories);
  double get totalProtein => foods.fold(0.0, (sum, food) => sum + food.protein);
  double get totalCarbs => foods.fold(0.0, (sum, food) => sum + food.carbs);
  double get totalFats => foods.fold(0.0, (sum, food) => sum + food.fats);

  String get mealTypeDisplayName {
    switch (type) {
      case MealType.breakfast:
        return 'Colazione';
      case MealType.snack1:
        return 'Spuntino Mattina';
      case MealType.lunch:
        return 'Pranzo';
      case MealType.snack2:
        return 'Spuntino Pomeriggio';
      case MealType.dinner:
        return 'Cena';
      case MealType.snack3:
        return 'Spuntino Sera';
    }
  }

  factory Meal.fromJson(Map<String, dynamic> json) {
    return Meal(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: MealType.values.firstWhere(
        (type) => type.name == json['type'],
        orElse: () => MealType.breakfast,
      ),
      foods: (json['foods'] as List<dynamic>?)
          ?.map((food) => FoodItem.fromJson(food))
          .toList() ?? [],
      notes: json['notes'],
      time: json['time'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.name,
      'foods': foods.map((food) => food.toJson()).toList(),
      'notes': notes,
      'time': time,
    };
  }
}

class FoodItem {
  final String id;
  final String name;
  final String? brand;
  final double quantity;
  final String unit;
  final double caloriesPer100g;
  final double proteinPer100g;
  final double carbsPer100g;
  final double fatsPer100g;
  final String? imageUrl;
  final String? barcode;

  const FoodItem({
    required this.id,
    required this.name,
    this.brand,
    required this.quantity,
    required this.unit,
    required this.caloriesPer100g,
    required this.proteinPer100g,
    required this.carbsPer100g,
    required this.fatsPer100g,
    this.imageUrl,
    this.barcode,
  });

  double get multiplier => unit == 'g' ? quantity / 100 : quantity;
  double get calories => caloriesPer100g * multiplier;
  double get protein => proteinPer100g * multiplier;
  double get carbs => carbsPer100g * multiplier;
  double get fats => fatsPer100g * multiplier;

  factory FoodItem.fromJson(Map<String, dynamic> json) {
    return FoodItem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      brand: json['brand'],
      quantity: json['quantity']?.toDouble() ?? 0.0,
      unit: json['unit'] ?? 'g',
      caloriesPer100g: json['calories_per_100g']?.toDouble() ?? 0.0,
      proteinPer100g: json['protein_per_100g']?.toDouble() ?? 0.0,
      carbsPer100g: json['carbs_per_100g']?.toDouble() ?? 0.0,
      fatsPer100g: json['fats_per_100g']?.toDouble() ?? 0.0,
      imageUrl: json['image_url'],
      barcode: json['barcode'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'brand': brand,
      'quantity': quantity,
      'unit': unit,
      'calories_per_100g': caloriesPer100g,
      'protein_per_100g': proteinPer100g,
      'carbs_per_100g': carbsPer100g,
      'fats_per_100g': fatsPer100g,
      'image_url': imageUrl,
      'barcode': barcode,
    };
  }
}

class FoodLog {
  final String id;
  final String clientId;
  final DateTime date;
  final List<LoggedMeal> loggedMeals;
  final double? weight;
  final String? notes;
  final List<String>? photoUrls;

  const FoodLog({
    required this.id,
    required this.clientId,
    required this.date,
    this.loggedMeals = const [],
    this.weight,
    this.notes,
    this.photoUrls,
  });

  double get totalCalories => loggedMeals.fold(0.0, (sum, meal) => sum + meal.totalCalories);
  double get totalProtein => loggedMeals.fold(0.0, (sum, meal) => sum + meal.totalProtein);
  double get totalCarbs => loggedMeals.fold(0.0, (sum, meal) => sum + meal.totalCarbs);
  double get totalFats => loggedMeals.fold(0.0, (sum, meal) => sum + meal.totalFats);

  factory FoodLog.fromJson(Map<String, dynamic> json) {
    return FoodLog(
      id: json['id'] ?? '',
      clientId: json['client_id'] ?? '',
      date: DateTime.parse(json['date'] ?? DateTime.now().toIso8601String()),
      loggedMeals: (json['logged_meals'] as List<dynamic>?)
          ?.map((meal) => LoggedMeal.fromJson(meal))
          .toList() ?? [],
      weight: json['weight']?.toDouble(),
      notes: json['notes'],
      photoUrls: (json['photo_urls'] as List<dynamic>?)?.cast<String>(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'client_id': clientId,
      'date': date.toIso8601String(),
      'logged_meals': loggedMeals.map((meal) => meal.toJson()).toList(),
      'weight': weight,
      'notes': notes,
      'photo_urls': photoUrls,
    };
  }
}

class LoggedMeal {
  final String id;
  final MealType type;
  final List<FoodItem> foods;
  final DateTime loggedAt;
  final String? notes;
  final List<String>? photoUrls;

  const LoggedMeal({
    required this.id,
    required this.type,
    required this.foods,
    required this.loggedAt,
    this.notes,
    this.photoUrls,
  });

  double get totalCalories => foods.fold(0.0, (sum, food) => sum + food.calories);
  double get totalProtein => foods.fold(0.0, (sum, food) => sum + food.protein);
  double get totalCarbs => foods.fold(0.0, (sum, food) => sum + food.carbs);
  double get totalFats => foods.fold(0.0, (sum, food) => sum + food.fats);

  factory LoggedMeal.fromJson(Map<String, dynamic> json) {
    return LoggedMeal(
      id: json['id'] ?? '',
      type: MealType.values.firstWhere(
        (type) => type.name == json['type'],
        orElse: () => MealType.breakfast,
      ),
      foods: (json['foods'] as List<dynamic>?)
          ?.map((food) => FoodItem.fromJson(food))
          .toList() ?? [],
      loggedAt: DateTime.parse(json['logged_at'] ?? DateTime.now().toIso8601String()),
      notes: json['notes'],
      photoUrls: (json['photo_urls'] as List<dynamic>?)?.cast<String>(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'foods': foods.map((food) => food.toJson()).toList(),
      'logged_at': loggedAt.toIso8601String(),
      'notes': notes,
      'photo_urls': photoUrls,
    };
  }
}