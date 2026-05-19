import 'dart:js' as js;

void playChime() {
  try {
    js.context.callMethod('eval', ['''
      try {
        var context = new (window.AudioContext || window.webkitAudioContext)();
        var osc = context.createOscillator();
        var gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, context.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.25);
      } catch(e) {}
    ''']);
  } catch (_) {}
}
