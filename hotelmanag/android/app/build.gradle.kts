import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

// Load signing credentials from key.properties
val keyPropertiesFile = rootProject.file("key.properties")
val keyProperties = Properties()
if (keyPropertiesFile.exists()) {
    keyProperties.load(keyPropertiesFile.inputStream())
}

val isReleaseBuild = gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = true) }

android {
    namespace = "com.example.hotelmanag"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    signingConfigs {
        create("release") {
            val keyAliasStr = (keyProperties["keyAlias"] as? String) ?: System.getenv("KEY_ALIAS")
            val keyPasswordStr = (keyProperties["keyPassword"] as? String) ?: System.getenv("KEY_PASSWORD")
            val storeFilePath = (keyProperties["storeFile"] as? String) ?: System.getenv("STORE_FILE")
            val storePasswordStr = (keyProperties["storePassword"] as? String) ?: System.getenv("STORE_PASSWORD")

            if (isReleaseBuild && (keyAliasStr.isNullOrBlank() || keyPasswordStr.isNullOrBlank() || storeFilePath.isNullOrBlank() || storePasswordStr.isNullOrBlank())) {
                throw GradleException("Unauthorized APK Signing Vulnerability: Release keystore configuration is missing or incomplete. Ensure keyAlias, keyPassword, storeFile, and storePassword are provided via key.properties or environment variables.")
            }

            if (!keyAliasStr.isNullOrBlank() && !keyPasswordStr.isNullOrBlank() && !storeFilePath.isNullOrBlank() && !storePasswordStr.isNullOrBlank()) {
                keyAlias = keyAliasStr
                keyPassword = keyPasswordStr
                storeFile = file(storeFilePath)
                storePassword = storePasswordStr
            }
        }
    }

    defaultConfig {
        applicationId = "com.example.hotelmanag"
        minSdk = 29
        targetSdk = 35
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Use our production signing config
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        getByName("debug") {
            // Use default debug signing config automatically
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")

    // Import the Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:34.13.0"))

    // Add the dependencies for Firebase products you want to use
    // When using the BoM, don't specify versions in Firebase dependencies
    implementation("com.google.firebase:firebase-analytics")
}
