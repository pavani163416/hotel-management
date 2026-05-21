import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

// Single shared player instance — avoids creating a new one on every chime
final _chimePlayer = AudioPlayer();

Future<void> playChime() async {
  try {
    // Stop any currently playing sound first
    await _chimePlayer.stop();
    await _chimePlayer.play(
      AssetSource('sounds/notification.wav'),
      volume: 1.0,
    );
    // Also trigger haptic feedback for physical feel
    HapticFeedback.mediumImpact();
  } catch (e) {
    // Fallback to system sound if audio fails
    try {
      SystemSound.play(SystemSoundType.alert);
    } catch (_) {}
  }
}
