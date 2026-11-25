package com.polingual.app

import foundation.bucket.core.auth.Stage

data class ResultsCta(val save: Boolean, val learn: Boolean)

object ResultsUpsell {
    const val SIGN_IN = "account"
    const val PAYWALL = "paywall"

    fun of(stage: Stage, access: Access): ResultsCta = ResultsCta(
        save = stage == Stage.SignedOut || stage == Stage.CodeSent,
        learn = access !is Access.Checking && !access.unlocked,
    )
}
