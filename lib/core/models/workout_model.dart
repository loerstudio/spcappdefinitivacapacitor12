class WorkoutProgram {
  final String id;
  final String name;
  final String description;
  final String trainerId;
  final String? clientId;
  final List<WorkoutDay> days;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isActive;

  const WorkoutProgram({
    required this.id,
    required this.name,
    required this.description,
    required this.trainerId,
    this.clientId,
    required this.days,
    required this.createdAt,
    this.updatedAt,
    this.isActive = true,
  });

  factory WorkoutProgram.fromJson(Map<String, dynamic> json) {
    return WorkoutProgram(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      trainerId: json['trainer_id'] ?? '',
      clientId: json['client_id'],
      days: (json['days'] as List<dynamic>?)
          ?.map((day) => WorkoutDay.fromJson(day))
          .toList() ?? [],
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
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'is_active': isActive,
    };
  }
}

class WorkoutDay {
  final String id;
  final String name;
  final int dayNumber;
  final List<Exercise> exercises;
  final String? notes;

  const WorkoutDay({
    required this.id,
    required this.name,
    required this.dayNumber,
    required this.exercises,
    this.notes,
  });

  factory WorkoutDay.fromJson(Map<String, dynamic> json) {
    return WorkoutDay(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      dayNumber: json['day_number'] ?? 1,
      exercises: (json['exercises'] as List<dynamic>?)
          ?.map((exercise) => Exercise.fromJson(exercise))
          .toList() ?? [],
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'day_number': dayNumber,
      'exercises': exercises.map((exercise) => exercise.toJson()).toList(),
      'notes': notes,
    };
  }
}

class Exercise {
  final String id;
  final String name;
  final String description;
  final String? category;
  final String? primaryMuscle;
  final List<String> secondaryMuscles;
  final String? imageUrl;
  final String? videoUrl;
  final List<ExerciseSet> sets;
  final int? restTimeSeconds;
  final String? notes;

  const Exercise({
    required this.id,
    required this.name,
    required this.description,
    this.category,
    this.primaryMuscle,
    this.secondaryMuscles = const [],
    this.imageUrl,
    this.videoUrl,
    this.sets = const [],
    this.restTimeSeconds,
    this.notes,
  });

  factory Exercise.fromJson(Map<String, dynamic> json) {
    return Exercise(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      category: json['category'],
      primaryMuscle: json['primary_muscle'],
      secondaryMuscles: (json['secondary_muscles'] as List<dynamic>?)
          ?.cast<String>() ?? [],
      imageUrl: json['image_url'],
      videoUrl: json['video_url'],
      sets: (json['sets'] as List<dynamic>?)
          ?.map((set) => ExerciseSet.fromJson(set))
          .toList() ?? [],
      restTimeSeconds: json['rest_time_seconds'],
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'category': category,
      'primary_muscle': primaryMuscle,
      'secondary_muscles': secondaryMuscles,
      'image_url': imageUrl,
      'video_url': videoUrl,
      'sets': sets.map((set) => set.toJson()).toList(),
      'rest_time_seconds': restTimeSeconds,
      'notes': notes,
    };
  }
}

class ExerciseSet {
  final int setNumber;
  final int? reps;
  final double? weight;
  final int? durationSeconds;
  final double? distance;
  final bool isCompleted;
  final String? notes;

  const ExerciseSet({
    required this.setNumber,
    this.reps,
    this.weight,
    this.durationSeconds,
    this.distance,
    this.isCompleted = false,
    this.notes,
  });

  factory ExerciseSet.fromJson(Map<String, dynamic> json) {
    return ExerciseSet(
      setNumber: json['set_number'] ?? 1,
      reps: json['reps'],
      weight: json['weight']?.toDouble(),
      durationSeconds: json['duration_seconds'],
      distance: json['distance']?.toDouble(),
      isCompleted: json['is_completed'] ?? false,
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'set_number': setNumber,
      'reps': reps,
      'weight': weight,
      'duration_seconds': durationSeconds,
      'distance': distance,
      'is_completed': isCompleted,
      'notes': notes,
    };
  }
}

class WorkoutSession {
  final String id;
  final String workoutProgramId;
  final String workoutDayId;
  final String clientId;
  final DateTime startTime;
  final DateTime? endTime;
  final List<CompletedExercise> completedExercises;
  final String? notes;
  final bool isCompleted;

  const WorkoutSession({
    required this.id,
    required this.workoutProgramId,
    required this.workoutDayId,
    required this.clientId,
    required this.startTime,
    this.endTime,
    this.completedExercises = const [],
    this.notes,
    this.isCompleted = false,
  });

  Duration? get duration {
    if (endTime != null) {
      return endTime!.difference(startTime);
    }
    return null;
  }

  factory WorkoutSession.fromJson(Map<String, dynamic> json) {
    return WorkoutSession(
      id: json['id'] ?? '',
      workoutProgramId: json['workout_program_id'] ?? '',
      workoutDayId: json['workout_day_id'] ?? '',
      clientId: json['client_id'] ?? '',
      startTime: DateTime.parse(json['start_time'] ?? DateTime.now().toIso8601String()),
      endTime: json['end_time'] != null ? DateTime.parse(json['end_time']) : null,
      completedExercises: (json['completed_exercises'] as List<dynamic>?)
          ?.map((exercise) => CompletedExercise.fromJson(exercise))
          .toList() ?? [],
      notes: json['notes'],
      isCompleted: json['is_completed'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workout_program_id': workoutProgramId,
      'workout_day_id': workoutDayId,
      'client_id': clientId,
      'start_time': startTime.toIso8601String(),
      'end_time': endTime?.toIso8601String(),
      'completed_exercises': completedExercises.map((exercise) => exercise.toJson()).toList(),
      'notes': notes,
      'is_completed': isCompleted,
    };
  }
}

class CompletedExercise {
  final String exerciseId;
  final List<CompletedSet> completedSets;
  final String? notes;

  const CompletedExercise({
    required this.exerciseId,
    this.completedSets = const [],
    this.notes,
  });

  factory CompletedExercise.fromJson(Map<String, dynamic> json) {
    return CompletedExercise(
      exerciseId: json['exercise_id'] ?? '',
      completedSets: (json['completed_sets'] as List<dynamic>?)
          ?.map((set) => CompletedSet.fromJson(set))
          .toList() ?? [],
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'exercise_id': exerciseId,
      'completed_sets': completedSets.map((set) => set.toJson()).toList(),
      'notes': notes,
    };
  }
}

class CompletedSet {
  final int setNumber;
  final int? actualReps;
  final double? actualWeight;
  final int? actualDurationSeconds;
  final double? actualDistance;
  final DateTime completedAt;

  const CompletedSet({
    required this.setNumber,
    this.actualReps,
    this.actualWeight,
    this.actualDurationSeconds,
    this.actualDistance,
    required this.completedAt,
  });

  factory CompletedSet.fromJson(Map<String, dynamic> json) {
    return CompletedSet(
      setNumber: json['set_number'] ?? 1,
      actualReps: json['actual_reps'],
      actualWeight: json['actual_weight']?.toDouble(),
      actualDurationSeconds: json['actual_duration_seconds'],
      actualDistance: json['actual_distance']?.toDouble(),
      completedAt: DateTime.parse(json['completed_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'set_number': setNumber,
      'actual_reps': actualReps,
      'actual_weight': actualWeight,
      'actual_duration_seconds': actualDurationSeconds,
      'actual_distance': actualDistance,
      'completed_at': completedAt.toIso8601String(),
    };
  }
}