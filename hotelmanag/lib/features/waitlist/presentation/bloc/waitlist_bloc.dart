import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hotelmanag/features/waitlist/domain/entities/waitlist_entity.dart';
import 'package:hotelmanag/features/waitlist/domain/repositories/waitlist_repository.dart';

// --- EVENTS ---
abstract class WaitlistEvent extends Equatable {
  const WaitlistEvent();
  @override
  List<Object> get props => [];
}

class JoinWaitlistEvent extends WaitlistEvent {
  final Map<String, dynamic> data;
  const JoinWaitlistEvent(this.data);
  @override
  List<Object> get props => [data];
}

class FetchMyWaitlistsEvent extends WaitlistEvent {}

class CancelWaitlistEvent extends WaitlistEvent {
  final String id;
  const CancelWaitlistEvent(this.id);
  @override
  List<Object> get props => [id];
}

// --- STATES ---
abstract class WaitlistState extends Equatable {
  const WaitlistState();
  @override
  List<Object> get props => [];
}

class WaitlistInitial extends WaitlistState {}
class WaitlistLoading extends WaitlistState {}

class WaitlistLoaded extends WaitlistState {
  final List<WaitlistEntity> waitlists;
  const WaitlistLoaded(this.waitlists);
  @override
  List<Object> get props => [waitlists];
}

class WaitlistSuccess extends WaitlistState {
  final WaitlistEntity waitlist;
  final String message;
  const WaitlistSuccess(this.waitlist, this.message);
  @override
  List<Object> get props => [waitlist, message];
}

class WaitlistError extends WaitlistState {
  final String message;
  const WaitlistError(this.message);
  @override
  List<Object> get props => [message];
}

// --- BLOC ---
class WaitlistBloc extends Bloc<WaitlistEvent, WaitlistState> {
  final WaitlistRepository _repository;

  WaitlistBloc(this._repository) : super(WaitlistInitial()) {
    on<FetchMyWaitlistsEvent>(_onFetchMyWaitlists);
    on<JoinWaitlistEvent>(_onJoinWaitlist);
    on<CancelWaitlistEvent>(_onCancelWaitlist);
  }

  Future<void> _onFetchMyWaitlists(FetchMyWaitlistsEvent event, Emitter<WaitlistState> emit) async {
    emit(WaitlistLoading());
    final result = await _repository.getMyWaitlists();
    result.fold(
      (failure) => emit(WaitlistError(failure.message)),
      (waitlists) => emit(WaitlistLoaded(waitlists)),
    );
  }

  Future<void> _onJoinWaitlist(JoinWaitlistEvent event, Emitter<WaitlistState> emit) async {
    emit(WaitlistLoading());
    final result = await _repository.joinWaitlist(event.data);
    result.fold(
      (failure) => emit(WaitlistError(failure.message)),
      (waitlist) => emit(WaitlistSuccess(waitlist, 'Successfully joined the waitlist!')),
    );
  }

  Future<void> _onCancelWaitlist(CancelWaitlistEvent event, Emitter<WaitlistState> emit) async {
    // We could emit loading, but maybe we want to keep the list and just show a toast.
    // For simplicity, emit loading, then refetch.
    emit(WaitlistLoading());
    final result = await _repository.cancelWaitlist(event.id);
    result.fold(
      (failure) => emit(WaitlistError(failure.message)),
      (_) {
        add(FetchMyWaitlistsEvent());
      },
    );
  }
}
