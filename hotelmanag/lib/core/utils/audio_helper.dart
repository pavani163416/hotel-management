import 'audio_helper_stub.dart'
    if (dart.library.js_util) 'audio_helper_web.dart'
    if (dart.library.io) 'audio_helper_mobile.dart';

void triggerNotificationChime() {
  playChime();
}
