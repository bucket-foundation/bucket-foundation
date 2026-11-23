plugins {
    alias(libs.plugins.android.library)
}

val crateDir = rootProject.file("../core/polingual-core")
val rustJniLibs = layout.buildDirectory.dir("rustJniLibs")
val kotlinCore = providers.gradleProperty("polingualKotlinCore").orNull == "true"

val cargoNdk by tasks.registering(Exec::class) {
    inputs.dir(crateDir.resolve("src"))
    inputs.file(crateDir.resolve("Cargo.toml"))
    outputs.dir(rustJniLibs)
    workingDir = crateDir
    commandLine("bash", crateDir.resolve("build-android.sh").absolutePath, rustJniLibs.get().asFile.absolutePath)
}

val cargoHost by tasks.registering(Exec::class) {
    inputs.dir(crateDir.resolve("src"))
    outputs.dir(crateDir.resolve("target/release"))
    workingDir = crateDir
    commandLine("cargo", "build", "--release", "--lib")
}

android {
    namespace = "foundation.bucket.core.rust"
    compileSdk = 37
    defaultConfig {
        minSdk = 26
        consumerProguardFiles("consumer-rules.pro")
        buildConfigField("boolean", "RUST_CORE", (!kotlinCore).toString())
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    sourceSets["main"].jniLibs.srcDir(rustJniLibs.get().asFile)
    testOptions { unitTests.isReturnDefaultValues = true }
}

tasks.named("preBuild") { dependsOn(cargoNdk) }

tasks.withType<Test>().configureEach {
    dependsOn(cargoHost)
    systemProperty("jna.library.path", crateDir.resolve("target/release").absolutePath)
    systemProperty("corpusDir", rootProject.file("../apple/Shared/Corpus").absolutePath)
}

dependencies {
    api(project(":core:engine"))
    implementation("${libs.jna.get().module}:${libs.jna.get().version}@aar")
    testImplementation(libs.jna)
    testImplementation(libs.kotlin.test)
}
