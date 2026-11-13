pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "bucket-android"
include(":core:model", ":core:engine", ":core:net", ":core:auth", ":core:data", ":core:ui", ":polingual", ":bucket")
