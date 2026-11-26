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
    systemProperty("learnerModelVectors", rootProject.file("../src/lib/academy/learner-model-vectors.json").absolutePath)
    systemProperty("exposureVectors", rootProject.file("../src/lib/academy/exposure-vectors.json").absolutePath)
    systemProperty("selectorVectors", rootProject.file("../src/lib/academy/selector-vectors.json").absolutePath)
    systemProperty("inputMixVectors", rootProject.file("../src/lib/academy/input-mix-vectors.json").absolutePath)
}
