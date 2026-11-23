package com.polingual.app

object PlanMath {
    fun perMonth(yearMicros: Long, currency: String, locale: java.util.Locale = java.util.Locale.getDefault()): String {
        val f = java.text.NumberFormat.getCurrencyInstance(locale)
        java.util.Currency.getAvailableCurrencies().firstOrNull { it.currencyCode == currency }?.let { f.currency = it }
        return f.format(yearMicros / 12.0 / 1_000_000.0)
    }
}
