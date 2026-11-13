plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "foundation.bucket.app"
    compileSdk = 37
    defaultConfig {
        applicationId = "foundation.bucket.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "2.0.0"
        buildConfigField("String", "BUCKET_BASE", "\"https://www.bucket.foundation\"")
    }
    buildTypes {
        debug {
            providers.gradleProperty("bucketBase").orNull?.let { buildConfigField("String", "BUCKET_BASE", "\"$it\"") }
        }
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.compose.icons)
    implementation(project(":core:data"))
    implementation(project(":core:ui"))
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.navigation.compose)
    implementation(libs.core.ktx)
    debugImplementation(libs.compose.ui.tooling)
    testImplementation(libs.kotlin.test)
}
