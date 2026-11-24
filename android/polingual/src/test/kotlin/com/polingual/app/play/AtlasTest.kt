package com.polingual.app.play

import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AtlasTest {
    @Test
    fun projectionRoundTrips() {
        val (x, y) = Atlas.project(2.4, 48.9)
        val p = Atlas.unproject(x, y)
        assertTrue(abs(p.lat - 48.9) < 1e-9 && abs(p.lon - 2.4) < 1e-9)
        assertEquals(Pair(360.0, 180.0), Atlas.project(0.0, 0.0))
    }

    @Test
    fun pointsDecayWithDistance() {
        assertEquals(Atlas.MAX, Atlas.points(100.0))
        assertEquals(Atlas.MAX, Atlas.points(150.0))
        assertEquals(Math.round(5000 * Math.exp(-1.0)).toInt(), Atlas.points(1950.0))
        assertTrue(Atlas.points(10000.0) < 50)
    }

    @Test
    fun nearestHomePicksTheClosestCity() {
        val n = Atlas.nearestHome("fr", LatLon(45.0, -73.0))!!
        assertEquals(LatLon(45.5, -73.6), n.home)
        assertTrue(Atlas.distanceKm(LatLon(48.9, 2.4), LatLon(40.4, -3.7)) in 1000.0..1100.0)
    }

    @Test
    fun roundsUseDistinctLanguagesFromTheCorpus() {
        val r = Atlas.rounds(TestCorpus.corpus.items, "2026-11-13")
        assertEquals(Atlas.ROUNDS + 1, r.size)
        assertEquals(r.size, r.map { it.lang }.toSet().size)
        assertEquals(r, Atlas.rounds(TestCorpus.corpus.items, "2026-11-13"))
    }
}
