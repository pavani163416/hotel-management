import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hotelmanag/core/utils/injection_container.dart';
import 'package:hotelmanag/features/planner/presentation/bloc/planner_bloc.dart';
import 'package:intl/intl.dart';

class DayPlannerScreen extends StatelessWidget {
  final String bookingId;
  const DayPlannerScreen({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<PlannerBloc>()..add(FetchTripPlanEvent(bookingId)),
      child: const DayPlannerView(),
    );
  }
}

class DayPlannerView extends StatefulWidget {
  const DayPlannerView({super.key});

  @override
  State<DayPlannerView> createState() => _DayPlannerViewState();
}

class _DayPlannerViewState extends State<DayPlannerView> {
  void _showAddActivityDialog(BuildContext context, String planId, String dayId) {
    final titleCtrl = TextEditingController();
    final timeCtrl = TextEditingController();
    String selectedType = 'Other';
    final types = ['Breakfast', 'Tour', 'Leisure', 'Dinner', 'Other'];

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Add Activity'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Activity Title'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: timeCtrl,
                decoration: const InputDecoration(labelText: 'Time (e.g. 10:00 AM)'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: selectedType,
                items: types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => selectedType = v ?? 'Other',
                decoration: const InputDecoration(labelText: 'Type'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                context.read<PlannerBloc>().add(
                  AddActivityEvent(planId, dayId, {
                    'title': titleCtrl.text,
                    'time': timeCtrl.text,
                    'type': selectedType,
                  }),
                );
                Navigator.pop(ctx);
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Trip Planner')),
      body: BlocConsumer<PlannerBloc, PlannerState>(
        listener: (context, state) {
          if (state is PlannerError) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message), backgroundColor: Colors.red));
          }
        },
        builder: (context, state) {
          if (state is PlannerLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is PlannerLoaded) {
            final plan = state.plan;
            if (plan.days.isEmpty) {
              return const Center(child: Text('No days found for this trip.'));
            }

            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: plan.days.length,
              itemBuilder: (context, index) {
                final day = plan.days[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Day ${index + 1} - ${DateFormat('MMM d, yyyy').format(day.date)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle, color: Colors.blue),
                              onPressed: () => _showAddActivityDialog(context, plan.id, day.id),
                            ),
                          ],
                        ),
                        const Divider(),
                        if (day.activities.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8.0),
                            child: Text('No activities planned yet.', style: TextStyle(color: Colors.grey)),
                          )
                        else
                          ...day.activities.map((act) => ListTile(
                                leading: Checkbox(
                                  value: act.status == 'Completed',
                                  onChanged: (_) {
                                    context.read<PlannerBloc>().add(ToggleActivityEvent(plan.id, day.id, act.id));
                                  },
                                ),
                                title: Text(act.title, style: TextStyle(decoration: act.status == 'Completed' ? TextDecoration.lineThrough : null)),
                                subtitle: Text('${act.time} • ${act.type}'),
                              )),
                      ],
                    ),
                  ),
                );
              },
            );
          }
          return const Center(child: Text('Failed to load trip plan.'));
        },
      ),
    );
  }
}
