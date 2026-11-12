plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

val corpusAssets = layout.buildDirectory.dir("corpusAssets")
val syncCorpus by tasks.registering(Sync::class) {
    from(rootProject.file("../apple/Shared/Corpus"))
    into(corpusAssets.map { it.dir("Corpus") })
}

android {
    namespace = "com.polingual.app"
    compileSdk = 37
    defaultConfig {
        applicationId = "com.polingual.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "BUCKET_BASE", "\"https://www.bucket.foundation\"")
        manifestPlaceholders["admobAppId"] = "ca-app-pub-3940256099942544~3347511713"
        buildConfigField("boolean", "ADS_ENABLED", "true")
        buildConfigField("boolean", "FREE_BETA", "false")
    }
    buildTypes {
        debug {
            buildConfigField("boolean", "FREE_BETA", "true")
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
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("corpusAssets").get().asFile)
    testOptions { unitTests.isReturnDefaultValues = true }
}

tasks.named("preBuild") { dependsOn(syncCorpus) }

dependencies {
    implementation(project(":core:data"))
    implementation(project(":core:ui"))
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.navigation.compose)
    implementation(libs.core.ktx)
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.session)
    implementation(libs.billing)
    implementation(libs.ads)
    implementation(libs.ump)
    debugImplementation(libs.compose.ui.tooling)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.coroutines.test)
}
