import 'package:audioplayers/audioplayers.dart';

final _chimePlayer = AudioPlayer();

Future<void> playChime() async {
  try {
    await _chimePlayer.stop();
    await _chimePlayer.play(AssetSource('sounds/notification.wav'), volume: 1.0);
  } catch (_) {}
}
