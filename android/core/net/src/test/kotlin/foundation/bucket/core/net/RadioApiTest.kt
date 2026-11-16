package foundation.bucket.core.net

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RadioApiTest {
    @Test
    fun filtersInsecureUnpopularAndDuplicateStations() {
        val list = listOf(
            RadioStation("1", "Radio A", "https://a.example/stream", votes = 50),
            RadioStation("2", "radio a", "https://a2.example/stream", votes = 50),
            RadioStation("3", "Plain", "http://b.example/stream", votes = 50),
            RadioStation("4", "Quiet", "https://c.example/stream", votes = 2),
            RadioStation("5", "Radio B", "https://d.example/stream", votes = 11),
        )
        assertEquals(listOf("1", "5"), RadioApi.filter(list, 10).map { it.stationuuid })
    }

    @Test
    fun languageNamesMatchIos() {
        assertEquals("french", RadioApi.radioName("fr"))
        assertEquals("greek", RadioApi.radioName("el"))
        assertNull(RadioApi.radioName("grc"))
    }

    @Test
    fun fallsBackToTheNextHost() = runTest {
        val seen = mutableListOf<String>()
        var remembered: String? = null
        val client = HttpClient(MockEngine { req ->
            seen += req.url.host
            when {
                req.url.host == "all.api.radio-browser.info" -> respond("[]", HttpStatusCode.OK)
                req.url.host == "de1.api.radio-browser.info" -> respond("down", HttpStatusCode.ServiceUnavailable)
                else -> respond("""[{"stationuuid":"x","name":" FIP ","url_resolved":"https://fip/stream","votes":99,"extra":true}]""", HttpStatusCode.OK)
            }
        })
        val api = RadioApi(client) { h -> if (h != null) remembered = h; remembered }
        val stations = api.stations("fr")
        assertEquals("FIP", stations.single().name)
        assertEquals("fi1.api.radio-browser.info", remembered)
        assertEquals(listOf("all.api.radio-browser.info", "de1.api.radio-browser.info", "fi1.api.radio-browser.info"), seen)
    }
}
