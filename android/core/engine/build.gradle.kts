plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}
kotlin { jvmToolchain(21) }
dependencies {
    api(project(":core:model"))
    testImplementation(libs.kotlin.test)
}
tasks.test {
    systemProperty("corpusDir", rootProject.file("../apple/Shared/Corpus").absolutePath)
    systemProperty("reviewLogVectors", rootProject.file("../src/lib/academy/review-log-vectors.json").absolutePath)
}
