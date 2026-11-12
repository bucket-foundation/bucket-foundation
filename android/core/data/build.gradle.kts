plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.serialization)
}
android {
    namespace = "foundation.bucket.core.data"
    compileSdk = 37
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies {
    api(project(":core:auth"))
    api(project(":core:engine"))
    api(libs.ktor.okhttp)
    api(libs.datastore)
    api(libs.coroutines.android)
    testImplementation(libs.kotlin.test)
}
