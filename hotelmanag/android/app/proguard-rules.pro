# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Firebase App Check & Play Integrity
-keep class com.google.firebase.** { *; }
-keep class com.google.android.play.core.integrity.** { *; }

# Jailbreak Detection
-keep class com.anish.flutter_jailbreak_detection.** { *; }

# Google Play Core (SplitCompat / SplitInstall) missing classes
-dontwarn com.google.android.play.core.**
