import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hotelmanag/features/planner/domain/entities/trip_plan_entity.dart';
import 'package:hotelmanag/features/planner/domain/repositories/planner_repository.dart';

// --- EVENTS ---
abstract class PlannerEvent extends Equatable {
  const PlannerEvent();
  @override
  List<Object> get props => [];
}

class FetchTripPlanEvent extends PlannerEvent {
  final String bookingId;
  const FetchTripPlanEvent(this.bookingId);
  @override
  List<Object> get props => [bookingId];
}

class AddActivityEvent extends PlannerEvent {
  final String planId;
  final String dayId;
  final Map<String, dynamic> data;
  const AddActivityEvent(this.planId, this.dayId, this.data);
  @override
  List<Object> get props => [planId, dayId, data];
}

class ToggleActivityEvent extends PlannerEvent {
  final String planId;
  final String dayId;
  final String activityId;
  const ToggleActivityEvent(this.planId, this.dayId, this.activityId);
  @override
  List<Object> get props => [planId, dayId, activityId];
}

// --- STATES ---
abstract class PlannerState extends Equatable {
  const PlannerState();
  @override
  List<Object> get props => [];
}

class PlannerInitial extends PlannerState {}
class PlannerLoading extends PlannerState {}

class PlannerLoaded extends PlannerState {
  final TripPlanEntity plan;
  const PlannerLoaded(this.plan);
  @override
  List<Object> get props => [plan];
}

class PlannerError extends PlannerState {
  final String message;
  const PlannerError(this.message);
  @override
  List<Object> get props => [message];
}

// --- BLOC ---
class PlannerBloc extends Bloc<PlannerEvent, PlannerState> {
  final PlannerRepository _repository;

  PlannerBloc(this._repository) : super(PlannerInitial()) {
    on<FetchTripPlanEvent>(_onFetchTripPlan);
    on<AddActivityEvent>(_onAddActivity);
    on<ToggleActivityEvent>(_onToggleActivity);
  }

  Future<void> _onFetchTripPlan(FetchTripPlanEvent event, Emitter<PlannerState> emit) async {
    emit(PlannerLoading());
    final result = await _repository.getTripPlan(event.bookingId);
    result.fold(
      (failure) => emit(PlannerError(failure.message)),
      (plan) => emit(PlannerLoaded(plan)),
    );
  }

  Future<void> _onAddActivity(AddActivityEvent event, Emitter<PlannerState> emit) async {
    final result = await _repository.addActivity(event.planId, event.dayId, event.data);
    result.fold(
      (failure) => emit(PlannerError(failure.message)),
      (plan) => emit(PlannerLoaded(plan)),
    );
  }

  Future<void> _onToggleActivity(ToggleActivityEvent event, Emitter<PlannerState> emit) async {
    final result = await _repository.toggleActivityStatus(event.planId, event.dayId, event.activityId);
    result.fold(
      (failure) => emit(PlannerError(failure.message)),
      (plan) => emit(PlannerLoaded(plan)),
    );
  }
}
