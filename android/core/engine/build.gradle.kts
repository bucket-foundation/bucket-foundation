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
    systemProperty("gradedVectors", rootProject.file("../src/lib/academy/graded-vectors.json").absolutePath)
    systemProperty("exposureVectors", rootProject.file("../src/lib/academy/exposure-vectors.json").absolutePath)
    systemProperty("selectorVectors", rootProject.file("../src/lib/academy/selector-vectors.json").absolutePath)
    systemProperty("inputMixVectors", rootProject.file("../src/lib/academy/input-mix-vectors.json").absolutePath)
    systemProperty("inputStageVectors", rootProject.file("../src/lib/academy/input-stage-vectors.json").absolutePath)
    systemProperty("learnerInputVectors", rootProject.file("../src/lib/academy/learner-input-vectors.json").absolutePath)
    systemProperty("inputExperimentVectors", rootProject.file("../src/lib/academy/input-experiment-vectors.json").absolutePath)
    systemProperty("yesNoVectors", rootProject.file("../src/lib/academy/yes-no-vectors.json").absolutePath)
    systemProperty("inputFixture", rootProject.file("../scripts/fixtures/polingual-input/es.json").absolutePath)
    systemProperty("progressMetricVectors", rootProject.file("../src/lib/academy/progress-metric-vectors.json").absolutePath)
}
