package foundation.bucket.app

import kotlin.test.Test
import kotlin.test.assertEquals

class TexLiteTest {
    @Test
    fun rendersCommonPhysics() {
        assertEquals("F\u20D7 = ma\u20D7 = (dp\u20D7)/(dt)", TexLite.render("""\vec{F} = m\vec{a} = \dfrac{d\vec{p}}{dt}"""))
        assertEquals("E = mc²", TexLite.render("E = mc^2"))
        assertEquals("ΔS ≥ 0", TexLite.render("""\Delta S \geq 0"""))
        assertEquals("x₁ + x₂", TexLite.render("x_1 + x_{2}"))
        assertEquals("e^(iπ)", TexLite.render("e^{i\\pi}"))
    }
}
