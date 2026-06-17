import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hotelmanag/features/analytics/domain/entities/analytics_entity.dart';
import 'package:hotelmanag/features/analytics/domain/repositories/analytics_repository.dart';

// --- EVENTS ---
abstract class AnalyticsEvent extends Equatable {
  const AnalyticsEvent();
  @override
  List<Object> get props => [];
}

class FetchWeeklyAnalyticsEvent extends AnalyticsEvent {
  final String hotelId;
  const FetchWeeklyAnalyticsEvent(this.hotelId);
  @override
  List<Object> get props => [hotelId];
}

class FetchMonthlyAnalyticsEvent extends AnalyticsEvent {
  final String hotelId;
  const FetchMonthlyAnalyticsEvent(this.hotelId);
  @override
  List<Object> get props => [hotelId];
}

// --- STATES ---
abstract class AnalyticsState extends Equatable {
  const AnalyticsState();
  @override
  List<Object> get props => [];
}

class AnalyticsInitial extends AnalyticsState {}
class AnalyticsLoading extends AnalyticsState {}

class AnalyticsLoaded extends AnalyticsState {
  final AnalyticsEntity analytics;
  final String timeframe; // 'weekly' or 'monthly'
  const AnalyticsLoaded(this.analytics, this.timeframe);
  @override
  List<Object> get props => [analytics, timeframe];
}

class AnalyticsError extends AnalyticsState {
  final String message;
  const AnalyticsError(this.message);
  @override
  List<Object> get props => [message];
}

// --- BLOC ---
class AnalyticsBloc extends Bloc<AnalyticsEvent, AnalyticsState> {
  final AnalyticsRepository _repository;

  AnalyticsBloc(this._repository) : super(AnalyticsInitial()) {
    on<FetchWeeklyAnalyticsEvent>(_onFetchWeekly);
    on<FetchMonthlyAnalyticsEvent>(_onFetchMonthly);
  }

  Future<void> _onFetchWeekly(FetchWeeklyAnalyticsEvent event, Emitter<AnalyticsState> emit) async {
    emit(AnalyticsLoading());
    final result = await _repository.getWeeklyAnalytics(event.hotelId);
    result.fold(
      (failure) => emit(AnalyticsError(failure.message)),
      (analytics) => emit(AnalyticsLoaded(analytics, 'weekly')),
    );
  }

  Future<void> _onFetchMonthly(FetchMonthlyAnalyticsEvent event, Emitter<AnalyticsState> emit) async {
    emit(AnalyticsLoading());
    final result = await _repository.getMonthlyAnalytics(event.hotelId);
    result.fold(
      (failure) => emit(AnalyticsError(failure.message)),
      (analytics) => emit(AnalyticsLoaded(analytics, 'monthly')),
    );
  }
}
