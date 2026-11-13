plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}
kotlin { jvmToolchain(21) }
dependencies {
    api(project(":core:net"))
    testImplementation(libs.kotlin.test)
    testImplementation(libs.ktor.mock)
    testImplementation(libs.coroutines.test)
}
