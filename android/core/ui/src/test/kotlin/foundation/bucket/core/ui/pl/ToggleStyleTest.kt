package foundation.bucket.core.ui.pl

import org.junit.Assert.assertEquals
import org.junit.Test

class ToggleStyleTest {
    @Test
    fun matchesWebSilentSwitch() {
        assertEquals(ToggleColors(PL.White, PL.Ink, PL.Hairline2), PLToggleStyle.of(checked = false, onDark = false))
        assertEquals(ToggleColors(PL.Ink, PL.Paper, PL.Ink), PLToggleStyle.of(checked = true, onDark = false))
        assertEquals(ToggleColors(PL.Paper, PL.Tyrian, PL.Paper), PLToggleStyle.of(checked = true, onDark = true))
    }
}
