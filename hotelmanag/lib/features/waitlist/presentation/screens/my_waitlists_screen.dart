import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hotelmanag/core/utils/injection_container.dart';
import 'package:hotelmanag/features/waitlist/presentation/bloc/waitlist_bloc.dart';
import 'package:intl/intl.dart';

class MyWaitlistsScreen extends StatelessWidget {
  const MyWaitlistsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<WaitlistBloc>()..add(FetchMyWaitlistsEvent()),
      child: const MyWaitlistsView(),
    );
  }
}

class MyWaitlistsView extends StatelessWidget {
  const MyWaitlistsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Waitlists'),
      ),
      body: BlocConsumer<WaitlistBloc, WaitlistState>(
        listener: (context, state) {
          if (state is WaitlistError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
          if (state is WaitlistSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
          }
        },
        builder: (context, state) {
          if (state is WaitlistLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is WaitlistLoaded) {
            final waitlists = state.waitlists;
            if (waitlists.isEmpty) {
              return const Center(child: Text('No active waitlists.'));
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: waitlists.length,
              itemBuilder: (context, index) {
                final w = waitlists[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                w.hotelImage,
                                width: 60,
                                height: 60,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.hotel, size: 60),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    w.hotelName,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${DateFormat('MMM d').format(w.checkIn)} - ${DateFormat('MMM d, yyyy').format(w.checkOut)}',
                                    style: const TextStyle(color: Colors.grey),
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: w.status == 'Pending' ? Colors.orange.withOpacity(0.2) : Colors.green.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      w.status,
                                      style: TextStyle(
                                        color: w.status == 'Pending' ? Colors.orange : Colors.green,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (w.status == 'Pending')
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: () {
                                context.read<WaitlistBloc>().add(CancelWaitlistEvent(w.id));
                              },
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: const BorderSide(color: Colors.red),
                              ),
                              child: const Text('Cancel Waitlist'),
                            ),
                          )
                      ],
                    ),
                  ),
                );
              },
            );
          }
          return const Center(child: Text('Something went wrong.'));
        },
      ),
    );
  }
}
