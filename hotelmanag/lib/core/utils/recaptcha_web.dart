import 'dart:js' as js;

void injectRecaptchaContainer() {
  try {
    js.context.callMethod('eval', [
      '''
      if (!document.getElementById('recaptcha-container')) {
        var container = document.createElement('div');
        container.id = 'recaptcha-container';
        document.body.appendChild(container);
      }
      '''
    ]);
  } catch (e) {
    // ignore
  }
}
