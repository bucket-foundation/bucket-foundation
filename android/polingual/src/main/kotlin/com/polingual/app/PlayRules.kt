package com.polingual.app

object PlayRules {
    const val PAYWALL = "paywall"

    fun startLearningRoute(access: Access): String = if (access.unlocked) Tab.Learn.route else PAYWALL

    fun showReveal(answered: Boolean, roundClosed: Boolean): Boolean = answered || roundClosed
}
