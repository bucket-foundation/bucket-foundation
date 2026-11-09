KNOWLEDGE = [
    ("mathematics", "∑"), ("geometry", "△"), ("calculus", "∫"), ("number-theory", "ℕ"), ("topology", "∞"), ("probability", "🎲"),
    ("physics", "⚛"), ("quantum", "ψ"), ("relativity", "c²"), ("thermodynamics", "🔥"), ("optics", "🔍"), ("electromagnetism", "🧲"),
    ("chemistry", "⚗"), ("biochemistry", "🧬"), ("materials", "💎"), ("information", "⊕"), ("computation", "λ"), ("cryptography", "🔑"),
    ("biophysics", "☀"), ("biology", "🌱"), ("medicine", "⚕"), ("neuroscience", "🧠"), ("ecology", "🌿"), ("evolution", "🐚"),
    ("cosmology", "✶"), ("astronomy", "🔭"), ("geology", "🪨"), ("oceanography", "🌊"), ("meteorology", "🌀"),
    ("mind", "◉"), ("philosophy", "φ"), ("logic", "⊢"), ("ethics", "⚖"), ("linguistics", "ᚨ"), ("history", "📜"),
    ("economics", "$"), ("music", "♪"), ("art", "🎨"), ("architecture", "🏛"), ("engineering", "⚙"), ("agriculture", "🌾"),
]

LANGUAGES = [
    ("english", "Aa", 220), ("spanish", "ñ", 10), ("french", "ç", 230), ("german", "ß", 45), ("italian", "è", 130), ("portuguese", "ã", 140),
    ("dutch", "ij", 25), ("swedish", "å", 205), ("polish", "ł", 350), ("russian", "Ж", 215), ("ukrainian", "ї", 50), ("greek", "Ω", 210),
    ("latin", "Æ", 0), ("hebrew", "א", 225), ("arabic", "ع", 150), ("persian", "پ", 120), ("turkish", "ğ", 0), ("hindi", "अ", 30),
    ("bengali", "অ", 160), ("tamil", "த", 340), ("sinhala", "අ", 40), ("thai", "ก", 240), ("khmer", "ក", 200), ("lao", "ກ", 0),
    ("vietnamese", "ư", 355), ("chinese", "文", 0), ("japanese", "あ", 350), ("korean", "한", 215), ("mongolian", "ᠮ", 200),
    ("tibetan", "ཀ", 45), ("georgian", "ა", 0), ("armenian", "Ա", 25), ("amharic", "አ", 55), ("swahili", "Sw", 95), ("yoruba", "ẹ", 120),
    ("cherokee", "Ꮳ", 15), ("hawaiian", "ʻ", 175), ("maori", "ā", 0), ("quechua", "Q", 300), ("norse-runic", "ᚱ", 30),
]

ERAS = [
    ("deep-time", "⏳", -4000000000), ("stone-age", "🪨", -50000), ("bronze-age", "⚱", -3000), ("ancient-egypt", "𓂀", -2500),
    ("classical-greece", "Ω", -450), ("roman", "SPQR", 0), ("han-dynasty", "漢", 100), ("islamic-golden-age", "✶", 900),
    ("medieval", "♜", 1100), ("renaissance", "✒", 1500), ("scientific-revolution", "🔭", 1650), ("enlightenment", "💡", 1750),
    ("industrial", "⚙", 1850), ("atomic", "⚛", 1945), ("space-age", "🚀", 1969), ("digital", "01", 1995), ("ai-age", "✦", 2025),
]
DECADES = [str(y) for y in range(1900, 2031, 10)]
FUTURE = [("2050", 2050), ("2100", 2100), ("2500", 2500), ("3000", 3000)]
HOURS = [("dawn", 6, 25), ("morning", 9, 45), ("noon", 12, 55), ("afternoon", 15, 38), ("dusk", 18, 15), ("night", 21, 235), ("midnight", 0, 250)]
ZODIAC = list(zip(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"], "♈♉♊♋♌♍♎♏♐♑♒♓"))
SEASONS = [("winter", "❄", 205), ("spring", "🌸", 330), ("summer", "☀", 40), ("autumn", "🍂", 22)]

PLANETS = [
    ("sun", "#FFB627", "#FF6B1A", None), ("mercury", "#B5ADA3", "#6E655B", None), ("venus", "#F2D49B", "#C9A35C", None),
    ("earth", "#3A86FF", "#2A9D4F", None), ("moon", "#DADADA", "#8A8A8A", None), ("mars", "#E2683C", "#8E2C14", None),
    ("ceres", "#9A938A", "#5A544D", None), ("jupiter", "#E8C49A", "#B26A3A", "band"), ("saturn", "#F2DCA4", "#C9A35C", "ring"),
    ("uranus", "#9FE6E8", "#4FB3BF", "ring"), ("neptune", "#4B70DD", "#22357A", None), ("pluto", "#E9D6C2", "#9A7A62", None),
    ("titan", "#E8A23B", "#9A5A1A", None), ("europa", "#F1E8D8", "#A88A6A", "band"),
]
SPACE = [("galaxy", "galaxy"), ("nebula", "nebula"), ("black-hole", "blackhole"), ("comet", "comet"), ("star", "star"),
         ("supernova", "nova"), ("constellation", "stars"), ("asteroid", "asteroid"), ("satellite", "🛰"), ("rocket", "🚀"),
         ("space-station", "station"), ("telescope", "🔭"), ("aurora", "aurora"), ("eclipse", "eclipse"), ("orbit", "orbitm")]

PLACES = [
    ("new-york", 40.7, -74.0, "NYC"), ("mexico-city", 19.4, -99.1, "CDMX"), ("sao-paulo", -23.5, -46.6, "SP"), ("buenos-aires", -34.6, -58.4, "BA"),
    ("punta-arenas", -53.2, -70.9, "PUQ"), ("lima", -12.0, -77.0, "LIM"), ("san-francisco", 37.8, -122.4, "SF"), ("honolulu", 21.3, -157.9, "HNL"),
    ("anchorage", 61.2, -149.9, "ANC"), ("reykjavik", 64.1, -21.9, "REY"), ("london", 51.5, -0.1, "LDN"), ("paris", 48.9, 2.35, "PAR"),
    ("athens", 37.98, 23.7, "ATH"), ("rome", 41.9, 12.5, "ROM"), ("istanbul", 41.0, 28.9, "IST"), ("cairo", 30.0, 31.2, "CAI"),
    ("lagos", 6.5, 3.4, "LOS"), ("nairobi", -1.3, 36.8, "NBO"), ("cape-town", -33.9, 18.4, "CPT"), ("jerusalem", 31.8, 35.2, "JRS"),
    ("tehran", 35.7, 51.4, "THR"), ("mumbai", 19.1, 72.9, "BOM"), ("kathmandu", 27.7, 85.3, "KTM"), ("bangkok", 13.8, 100.5, "BKK"),
    ("beijing", 39.9, 116.4, "PEK"), ("seoul", 37.6, 127.0, "SEL"), ("tokyo", 35.7, 139.7, "TYO"), ("sydney", -33.9, 151.2, "SYD"),
    ("auckland", -36.8, 174.8, "AKL"), ("antarctica", -82.0, 135.0, "ANT"), ("north-pole", 90.0, 0.0, "N"), ("equator", 0.0, -78.5, "EQ"),
]

CLIMATES = [
    ("polar", "❄", -30), ("tundra", "✳", -15), ("alpine", "▲", -5), ("boreal", "🌲", 0), ("oceanic", "🌊", 10), ("continental", "☁", 8),
    ("temperate", "🍃", 13), ("mediterranean", "🫒", 18), ("monsoon", "☔", 26), ("rainforest", "🌴", 27), ("savanna", "🦒", 25),
    ("steppe", "🌾", 12), ("desert", "🌵", 32), ("volcanic", "🌋", 40), ("reef", "🐠", 28),
]

AI_DATA = [
    ("neural-net", "net"), ("transformer", "attn"), ("embedding", "cloud"), ("token", "tok"), ("vector", "vec"), ("graph", "graph"),
    ("database", "db"), ("dataset", "grid"), ("bits", "bits"), ("chip", "chip"), ("agent", "🤖"), ("prompt", "prompt"),
    ("search", "🔎"), ("citation", "❝"), ("ledger", "ledger"), ("signal", "wave"), ("cluster", "cluster"), ("compression", "zip"),
]

CULTURES = [
    ("greek", "Ω", 210), ("roman", "Ⅻ", 0), ("egyptian", "𓂀", 45), ("mesopotamian", "𒀭", 35), ("persian", "✺", 190), ("indian", "ॐ", 25),
    ("chinese", "☯", 0), ("japanese", "⛩", 355), ("korean", "☯", 215), ("tibetan", "☸", 40), ("khmer", "ក", 30), ("polynesian", "🌺", 170),
    ("maori", "꩜", 15), ("aboriginal", "◎", 20), ("maya", "☀", 140), ("aztec", "◈", 75), ("inca", "☼", 50), ("andean", "▦", 330),
    ("navajo", "✧", 15), ("inuit", "❅", 200), ("norse", "ᛟ", 210), ("celtic", "☘", 130), ("slavic", "✵", 0), ("hebrew", "✡", 220),
    ("arabic", "۞", 150), ("ethiopian", "✠", 55), ("yoruba", "◍", 110), ("zulu", "◆", 30), ("swahili", "⚓", 180), ("andalusian", "✶", 40),
]
