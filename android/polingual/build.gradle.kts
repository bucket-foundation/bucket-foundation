plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

val TEST_ADMOB_APP = "ca-app-pub-3940256099942544~3347511713"
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
        manifestPlaceholders["admobAppId"] = TEST_ADMOB_APP
        buildConfigField("boolean", "ADS_ENABLED", "true")
        buildConfigField("boolean", "TEST_ADS", "true")
        buildConfigField("String", "BANNER_UNIT", "\"ca-app-pub-3940256099942544/9214589741\"")
        buildConfigField("String", "INTERSTITIAL_UNIT", "\"ca-app-pub-3940256099942544/1033173712\"")
        buildConfigField("boolean", "FREE_BETA", "false")
        buildConfigField("boolean", "FAKE_PLANS", "false")
    }
    buildTypes {
        debug {
            providers.gradleProperty("bucketBase").orNull?.let { buildConfigField("String", "BUCKET_BASE", "\"$it\"") }
            buildConfigField("boolean", "FREE_BETA", providers.gradleProperty("freeBeta").orNull ?: "false")
            buildConfigField("boolean", "FAKE_PLANS", providers.gradleProperty("fakePlans").orNull ?: "false")
        }
        release {
            val admob = providers.gradleProperty("polingualAdmobAppId").orNull
            manifestPlaceholders["admobAppId"] = admob ?: TEST_ADMOB_APP
            buildConfigField("boolean", "ADS_ENABLED", if (admob != null) "true" else "false")
            buildConfigField("boolean", "TEST_ADS", "false")
            buildConfigField("String", "BANNER_UNIT", "\"${providers.gradleProperty("polingualBannerUnit").orNull ?: ""}\"")
            buildConfigField("String", "INTERSTITIAL_UNIT", "\"${providers.gradleProperty("polingualInterstitialUnit").orNull ?: ""}\"")
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
