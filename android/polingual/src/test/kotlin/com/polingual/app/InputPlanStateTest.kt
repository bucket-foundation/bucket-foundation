package com.polingual.app

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.ExposureInput
import foundation.bucket.core.engine.InputExperiment
import foundation.bucket.core.engine.InputStage
import foundation.bucket.core.engine.LogRow
import foundation.bucket.core.engine.StudyState
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class InputPlanStateTest {
    private val bundle = assertNotNull(InputStage.parseBundle(File("../../scripts/fixtures/polingual-input/es.json").readText()))
    private val resolve = { _: String, lemma: String -> "es:$lemma" }
    private val now = 1_800_000_000_000L

    private fun knowsAllBut(vararg unknown: String): StudyState = StudyState(
        cards = bundle.items.flatMap { it.tokens }.map { it.lemma }.filter { it !in unknown }.distinct()
            .associate { "es:$it" to CardState(reps = 3, intervalDays = 200.0, due = now + 86_400_000L * 30, last = now) },
    )

    private class View(override var answered: Int, override val state: StudyState) : SessionView {
        override val log = mutableListOf<LogRow>()
    }

    private fun plan(mode: InputModeFlag.Mode, state: StudyState, clock: () -> Long = { now }): InputPlanState? {
        var n = 0
        return InputPlanState.plan(mode, "es", bundle, { "gloss" }, resolve, state, 20, 2, "sys", "d-0", now, clock, { "id-${n++}" }, "UTC")
    }

    @Test
    fun theDemoFlagOnlyWorksInDebugBuilds() {
        assertEquals(InputModeFlag.Mode.Off, InputModeFlag.of("demo", debug = false))
        assertEquals(InputModeFlag.Mode.Demo, InputModeFlag.of("demo", debug = true))
        assertEquals(InputModeFlag.Mode.On, InputModeFlag.of("", debug = true))
        assertEquals(InputModeFlag.Mode.Off, InputModeFlag.of("", debug = false))
    }

    @Test
    fun aBeginnerGetsNoStageUnlessDemoIsOn() {
        assertNull(plan(InputModeFlag.Mode.On, StudyState()))
        assertNull(plan(InputModeFlag.Mode.Off, knowsAllBut("mi")))
        val demo = assertNotNull(plan(InputModeFlag.Mode.Demo, StudyState()))
        assertEquals(1, demo.mix.units)
    }

    @Test
    fun theStageRunsAtItsPlacedCardAndFillsTheSessionRow() {
        var clock = now
        val s = assertNotNull(plan(InputModeFlag.Mode.On, knowsAllBut("mi", "casa")) { clock })
        assertTrue(s.mix.units >= 1 && s.mix.share > 0)
        val at = s.mix.positions.first()
        val v = View(at - 1 + if (at == 0) 1 else 0, knowsAllBut("mi", "casa"))
        if (at > 0) {
            s.prepare(v)
            assertNull(s.due(v.answered))
            v.answered = at
        }
        s.prepare(v)
        val choice = assertNotNull(s.due(at))
        val rows = listOf(ExposureInput(choice.items[0].id, choice.unit.id, listOf("mi"), listOf("mi"), 30, choice.plan.coverage, true, false))
        clock = now + 120_000
        s.finish(v, rows, 30.0)
        assertNull(s.due(at))
        s.end(v)
        s.end(v)
        val exposures = v.log.filterIsInstance<LogRow.Exposure>()
        val sessions = v.log.filterIsInstance<LogRow.Session>()
        assertEquals(1, exposures.size)
        assertEquals(listOf("mi"), exposures[0].taps)
        assertEquals(1, sessions.size)
        assertEquals(0.7, sessions[0].shareTarget)
        assertEquals(0.25, sessions[0].shareReal)
        assertEquals(1, sessions[0].units)
        assertNull(sessions[0].arm)
    }

    @Test
    fun theExperimentFlagLogsTheStableArmOnTheSessionRow() {
        var n = 0
        val s = assertNotNull(InputPlanState.plan(InputModeFlag.Mode.On, "es", bundle, { "gloss" }, resolve, knowsAllBut("mi", "casa"), 0, 2, "sys", "d-0", now, { now }, { "id-${n++}" }, "UTC", consent = InputExperiment.Consent(true, true, true, false), key = "dev:d-0"))
        val arm = assertNotNull(s.arm)
        assertEquals(InputExperiment.assignArm("dev:d-0"), arm)
        assertEquals(arm, s.enrolment?.arm)
        assertEquals(InputExperiment.ARM_SHARES.getValue(arm), s.mix.target)
        val blocked = assertNotNull(InputPlanState.plan(InputModeFlag.Mode.On, "es", bundle, { "gloss" }, resolve, knowsAllBut("mi", "casa"), 0, 2, "sys", "d-0", now, { now }, { "x" }, "UTC", consent = InputExperiment.Consent(true, false, true, false), key = "dev:d-0"))
        assertNull(blocked.arm)
        val v = View(20, knowsAllBut("mi", "casa"))
        s.end(v)
        assertEquals(arm, v.log.filterIsInstance<LogRow.Session>().single().arm)
    }
}
