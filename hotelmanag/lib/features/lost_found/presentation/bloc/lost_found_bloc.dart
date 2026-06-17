import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hotelmanag/features/lost_found/domain/entities/lost_found_entity.dart';
import 'package:hotelmanag/features/lost_found/domain/repositories/lost_found_repository.dart';

// --- EVENTS ---
abstract class LostFoundEvent extends Equatable {
  const LostFoundEvent();
  @override
  List<Object> get props => [];
}

class FetchLostFoundEvent extends LostFoundEvent {}

class SubmitLostFoundEvent extends LostFoundEvent {
  final Map<String, dynamic> data;
  const SubmitLostFoundEvent(this.data);
  @override
  List<Object> get props => [data];
}

// --- STATES ---
abstract class LostFoundState extends Equatable {
  const LostFoundState();
  @override
  List<Object> get props => [];
}

class LostFoundInitial extends LostFoundState {}
class LostFoundLoading extends LostFoundState {}

class LostFoundLoaded extends LostFoundState {
  final List<LostFoundEntity> reports;
  const LostFoundLoaded(this.reports);
  @override
  List<Object> get props => [reports];
}

class LostFoundSubmitSuccess extends LostFoundState {
  final LostFoundEntity report;
  const LostFoundSubmitSuccess(this.report);
  @override
  List<Object> get props => [report];
}

class LostFoundError extends LostFoundState {
  final String message;
  const LostFoundError(this.message);
  @override
  List<Object> get props => [message];
}

// --- BLOC ---
class LostFoundBloc extends Bloc<LostFoundEvent, LostFoundState> {
  final LostFoundRepository _repository;

  LostFoundBloc(this._repository) : super(LostFoundInitial()) {
    on<FetchLostFoundEvent>(_onFetch);
    on<SubmitLostFoundEvent>(_onSubmit);
  }

  Future<void> _onFetch(FetchLostFoundEvent event, Emitter<LostFoundState> emit) async {
    emit(LostFoundLoading());
    final result = await _repository.getMyLostFoundReports();
    result.fold(
      (failure) => emit(LostFoundError(failure.message)),
      (reports) => emit(LostFoundLoaded(reports)),
    );
  }

  Future<void> _onSubmit(SubmitLostFoundEvent event, Emitter<LostFoundState> emit) async {
    emit(LostFoundLoading());
    final result = await _repository.reportLostFound(event.data);
    result.fold(
      (failure) => emit(LostFoundError(failure.message)),
      (report) => emit(LostFoundSubmitSuccess(report)),
    );
  }
}
