#!/usr/bin/env python3
"""build-lang-core.py — expand the Polyglot Core deck into a real beginner course.

Keeps the existing curated atoms (lang-core.json) and APPENDS a large, hand-curated
beginner set across the 7 built-in languages (en/es/fr/it/pt/de/la): greetings,
numbers, days/months, time, family, food, animals, body, colors, common verbs &
adjectives, travel/places, household, weather, directions, and useful phrases.

Each atom carries forms[lang]={word, ipa?, gender?}, a gloss, and SHORT ORIGINAL
example sentences whose target-language sentence contains the target word verbatim
(so the in-app fill-in-the-blank cloze drill can blank it out).

IPA is pulled from the baked Polingual starter subset (Wiktionary via Kaikki,
CC-BY-SA) where available, and hand-supplied otherwise. Translations are facts,
cross-checked against Wiktionary; example sentences are original and beginner-simple.

Idempotent: re-running regenerates corpus/lang-core.json deterministically.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))          # learning/app
CORPUS = os.path.join(APP, "corpus", "lang-core.json")
SUBSET = os.path.join(APP, "polingual", "subset.json")
LANGS = ["en", "es", "fr", "it", "pt", "de", "la"]

# ---- IPA lookup from the Polingual starter subset (CC-BY-SA Wiktionary/Kaikki) ----
def load_ipa_index():
    idx = {}
    try:
        s = json.load(open(SUBSET))
        for w in s.get("words", []):
            k = (w.get("l"), (w.get("s") or "").lower())
            if k[0] and k[1] and w.get("ipa") and k not in idx:
                idx[k] = w["ipa"].strip().strip("/")
    except Exception as e:
        print("  (no subset IPA index:", e, ")")
    return idx

IPA = load_ipa_index()

def ipa_for(lang, word):
    """Hand IPA wins; else fall back to the subset index by surface."""
    return IPA.get((lang, (word or "").lower()))

# ----------------------------------------------------------------------------
# Curated data. Each entry:
#   (id, category, pos, shell, gloss,
#    {lang: word OR (word, gender) OR (word, gender, ipa)},
#    {lang: example_sentence})  examples optional per-lang; must contain the word.
# Genders: m/f/n. Latin nouns give the nominative singular; verbs give the
# present active infinitive unless noted.
# ----------------------------------------------------------------------------

D = []  # list of raw tuples

def A(id, cat, pos, shell, gloss, forms, examples=None, note=None, requires=None):
    D.append((id, cat, pos, shell, gloss, forms, examples or {}, note, requires or []))

# ===== NUMBERS (continue past 1-10 / existing) =====
A("eleven","number","numeral","prereq","eleven (11)",
  {"en":"eleven","es":"once","fr":"onze","it":"undici","pt":"onze","de":"elf","la":"undecim"},
  {"en":"I am eleven years old.","es":"Tengo once años.","fr":"J'ai onze ans.","it":"Ho undici anni.","de":"Ich bin elf."})
A("twelve","number","numeral","prereq","twelve (12)",
  {"en":"twelve","es":"doce","fr":"douze","it":"dodici","pt":"doze","de":"zwölf","la":"duodecim"},
  {"en":"The clock shows twelve.","es":"Son las doce.","fr":"Il est douze heures.","it":"Sono le dodici.","de":"Es ist zwölf Uhr."})
A("thirteen","number","numeral","prereq","thirteen (13)",
  {"en":"thirteen","es":"trece","fr":"treize","it":"tredici","pt":"treze","de":"dreizehn","la":"tredecim"},
  {"en":"She is thirteen.","es":"Ella tiene trece.","fr":"Elle a treize ans.","it":"Lei ha tredici anni.","de":"Sie ist dreizehn."})
A("fourteen","number","numeral","prereq","fourteen (14)",
  {"en":"fourteen","es":"catorce","fr":"quatorze","it":"quattordici","pt":"catorze","de":"vierzehn","la":"quattuordecim"},
  {"en":"We have fourteen books.","es":"Tenemos catorce libros.","fr":"Nous avons quatorze livres.","it":"Abbiamo quattordici libri.","de":"Wir haben vierzehn Bücher."})
A("fifteen","number","numeral","prereq","fifteen (15)",
  {"en":"fifteen","es":"quince","fr":"quinze","it":"quindici","pt":"quinze","de":"fünfzehn","la":"quindecim"},
  {"en":"It costs fifteen euros.","es":"Cuesta quince euros.","fr":"Ça coûte quinze euros.","it":"Costa quindici euro.","de":"Es kostet fünfzehn Euro."})
A("sixteen","number","numeral","prereq","sixteen (16)",
  {"en":"sixteen","es":"dieciséis","fr":"seize","it":"sedici","pt":"dezesseis","de":"sechzehn","la":"sedecim"},
  {"en":"He is sixteen now.","es":"Ahora tiene dieciséis.","fr":"Il a seize ans.","it":"Ha sedici anni.","de":"Er ist sechzehn."})
A("seventeen","number","numeral","prereq","seventeen (17)",
  {"en":"seventeen","es":"diecisiete","fr":"dix-sept","it":"diciassette","pt":"dezessete","de":"siebzehn","la":"septendecim"},
  {"en":"There are seventeen students.","es":"Hay diecisiete alumnos.","fr":"Il y a dix-sept élèves.","it":"Ci sono diciassette studenti.","de":"Es gibt siebzehn Schüler."})
A("eighteen","number","numeral","prereq","eighteen (18)",
  {"en":"eighteen","es":"dieciocho","fr":"dix-huit","it":"diciotto","pt":"dezoito","de":"achtzehn","la":"duodeviginti"},
  {"en":"You are eighteen today.","es":"Hoy tienes dieciocho.","fr":"Tu as dix-huit ans.","it":"Hai diciotto anni.","de":"Du bist achtzehn."})
A("nineteen","number","numeral","prereq","nineteen (19)",
  {"en":"nineteen","es":"diecinueve","fr":"dix-neuf","it":"diciannove","pt":"dezenove","de":"neunzehn","la":"undeviginti"},
  {"en":"The room has nineteen chairs.","es":"La sala tiene diecinueve sillas.","fr":"La salle a dix-neuf chaises.","it":"La sala ha diciannove sedie.","de":"Der Raum hat neunzehn Stühle."})
A("twenty","number","numeral","prereq","twenty (20)",
  {"en":"twenty","es":"veinte","fr":"vingt","it":"venti","pt":"vinte","de":"zwanzig","la":"viginti"},
  {"en":"I have twenty minutes.","es":"Tengo veinte minutos.","fr":"J'ai vingt minutes.","it":"Ho venti minuti.","de":"Ich habe zwanzig Minuten."})
A("thirty","number","numeral","prereq","thirty (30)",
  {"en":"thirty","es":"treinta","fr":"trente","it":"trenta","pt":"trinta","de":"dreißig","la":"triginta"},
  {"en":"He runs thirty kilometres.","es":"Corre treinta kilómetros.","fr":"Il court trente kilomètres.","it":"Corre trenta chilometri.","de":"Er läuft dreißig Kilometer."})
A("forty","number","numeral","prereq","forty (40)",
  {"en":"forty","es":"cuarenta","fr":"quarante","it":"quaranta","pt":"quarenta","de":"vierzig","la":"quadraginta"},
  {"en":"She is forty years old.","es":"Tiene cuarenta años.","fr":"Elle a quarante ans.","it":"Ha quaranta anni.","de":"Sie ist vierzig."})
A("fifty","number","numeral","prereq","fifty (50)",
  {"en":"fifty","es":"cincuenta","fr":"cinquante","it":"cinquanta","pt":"cinquenta","de":"fünfzig","la":"quinquaginta"},
  {"en":"The hill is fifty metres high.","es":"La colina mide cincuenta metros.","fr":"La colline fait cinquante mètres.","it":"La collina è alta cinquanta metri.","de":"Der Hügel ist fünfzig Meter hoch."})
A("hundred","number","numeral","prereq","one hundred (100)",
  {"en":"hundred","es":"cien","fr":"cent","it":"cento","pt":"cem","de":"hundert","la":"centum"},
  {"en":"A hundred people came.","es":"Vinieron cien personas.","fr":"Cent personnes sont venues.","it":"Sono venute cento persone.","de":"Hundert Leute kamen."})
A("thousand","number","numeral","prereq","one thousand (1000)",
  {"en":"thousand","es":"mil","fr":"mille","it":"mille","pt":"mil","de":"tausend","la":"mille"},
  {"en":"The city has a thousand streets.","es":"La ciudad tiene mil calles.","fr":"La ville a mille rues.","it":"La città ha mille strade.","de":"Die Stadt hat tausend Straßen."})

# ===== DAYS OF THE WEEK =====
A("monday","day","noun","nucleus","Monday",
  {"en":"Monday","es":("lunes","m"),"fr":("lundi","m"),"it":("lunedì","m"),"pt":("segunda-feira","f"),"de":("Montag","m"),"la":("dies Lunae","m")},
  {"en":"On Monday I work.","es":"El lunes trabajo.","fr":"Le lundi je travaille.","it":"Il lunedì lavoro.","de":"Am Montag arbeite ich."})
A("tuesday","day","noun","nucleus","Tuesday",
  {"en":"Tuesday","es":("martes","m"),"fr":("mardi","m"),"it":("martedì","m"),"pt":("terça-feira","f"),"de":("Dienstag","m"),"la":("dies Martis","m")},
  {"en":"Tuesday is busy.","es":"El martes está ocupado.","fr":"Mardi est chargé.","it":"Il martedì è impegnato.","de":"Dienstag ist voll."})
A("wednesday","day","noun","nucleus","Wednesday",
  {"en":"Wednesday","es":("miércoles","m"),"fr":("mercredi","m"),"it":("mercoledì","m"),"pt":("quarta-feira","f"),"de":("Mittwoch","m"),"la":("dies Mercurii","m")},
  {"en":"We meet on Wednesday.","es":"Nos vemos el miércoles.","fr":"On se voit mercredi.","it":"Ci vediamo mercoledì.","de":"Wir treffen uns am Mittwoch."})
A("thursday","day","noun","nucleus","Thursday",
  {"en":"Thursday","es":("jueves","m"),"fr":("jeudi","m"),"it":("giovedì","m"),"pt":("quinta-feira","f"),"de":("Donnerstag","m"),"la":("dies Iovis","m")},
  {"en":"Thursday comes after Wednesday.","es":"El jueves viene después.","fr":"Jeudi vient après.","it":"Giovedì viene dopo.","de":"Donnerstag kommt danach."})
A("friday","day","noun","nucleus","Friday",
  {"en":"Friday","es":("viernes","m"),"fr":("vendredi","m"),"it":("venerdì","m"),"pt":("sexta-feira","f"),"de":("Freitag","m"),"la":("dies Veneris","m")},
  {"en":"Friday is my favourite day.","es":"El viernes es mi día favorito.","fr":"Vendredi est mon jour préféré.","it":"Venerdì è il mio giorno preferito.","de":"Freitag ist mein Lieblingstag."})
A("saturday","day","noun","nucleus","Saturday",
  {"en":"Saturday","es":("sábado","m"),"fr":("samedi","m"),"it":("sabato","m"),"pt":("sábado","m"),"de":("Samstag","m"),"la":("dies Saturni","m")},
  {"en":"On Saturday we rest.","es":"El sábado descansamos.","fr":"Le samedi on se repose.","it":"Il sabato riposiamo.","de":"Am Samstag ruhen wir."})
A("sunday","day","noun","nucleus","Sunday",
  {"en":"Sunday","es":("domingo","m"),"fr":("dimanche","m"),"it":("domenica","f"),"pt":("domingo","m"),"de":("Sonntag","m"),"la":("dies Solis","m")},
  {"en":"Sunday is quiet.","es":"El domingo es tranquilo.","fr":"Dimanche est calme.","it":"La domenica è tranquilla.","de":"Sonntag ist ruhig."})
A("week","time","noun","nucleus","week",
  {"en":"week","es":("semana","f"),"fr":("semaine","f"),"it":("settimana","f"),"pt":("semana","f"),"de":("Woche","f"),"la":("septimana","f")},
  {"en":"The week is long.","es":"La semana es larga.","fr":"La semaine est longue.","it":"La settimana è lunga.","de":"Die Woche ist lang."})
A("month","time","noun","nucleus","month",
  {"en":"month","es":("mes","m"),"fr":("mois","m"),"it":("mese","m"),"pt":("mês","m"),"de":("Monat","m"),"la":("mensis","m")},
  {"en":"Next month I travel.","es":"El mes que viene viajo.","fr":"Le mois prochain je voyage.","it":"Il mese prossimo viaggio.","de":"Nächsten Monat reise ich."})

# ===== MONTHS (a representative set) =====
A("january","month","noun","nucleus","January",
  {"en":"January","es":("enero","m"),"fr":("janvier","m"),"it":("gennaio","m"),"pt":("janeiro","m"),"de":("Januar","m"),"la":("Ianuarius","m")},
  {"en":"January is cold.","es":"Enero es frío.","fr":"Janvier est froid.","it":"Gennaio è freddo.","de":"Januar ist kalt."})
A("july","month","noun","nucleus","July",
  {"en":"July","es":("julio","m"),"fr":("juillet","m"),"it":("luglio","m"),"pt":("julho","m"),"de":("Juli","m"),"la":("Iulius","m")},
  {"en":"In July it is hot.","es":"En julio hace calor.","fr":"En juillet il fait chaud.","it":"A luglio fa caldo.","de":"Im Juli ist es heiß."})
A("december","month","noun","nucleus","December",
  {"en":"December","es":("diciembre","m"),"fr":("décembre","m"),"it":("dicembre","m"),"pt":("dezembro","m"),"de":("Dezember","m"),"la":("December","m")},
  {"en":"December ends the year.","es":"Diciembre termina el año.","fr":"Décembre finit l'année.","it":"Dicembre finisce l'anno.","de":"Dezember beendet das Jahr."})

# ===== TIME WORDS =====
A("hour","time","noun","nucleus","hour",
  {"en":"hour","es":("hora","f"),"fr":("heure","f"),"it":("ora","f"),"pt":("hora","f"),"de":("Stunde","f"),"la":("hora","f")},
  {"en":"Wait one hour.","es":"Espera una hora.","fr":"Attends une heure.","it":"Che ora è?","de":"Warte eine Stunde."})
A("minute","time","noun","nucleus","minute",
  {"en":"minute","es":("minuto","m"),"fr":("minute","f"),"it":("minuto","m"),"pt":("minuto","m"),"de":("Minute","f"),"la":("minutum","n")},
  {"en":"Just a minute, please.","es":"Un minuto, por favor.","fr":"Une minute, s'il te plaît.","it":"Un minuto, per favore.","de":"Eine Minute, bitte."})
A("morning","time","noun","nucleus","morning",
  {"en":"morning","es":("mañana","f"),"fr":("matin","m"),"it":("mattina","f"),"pt":("manhã","f"),"de":("Morgen","m"),"la":("mane","n")},
  {"en":"I read in the morning.","es":"Leo por la mañana.","fr":"Je lis le matin.","it":"Leggo la mattina.","de":"Ich lese am Morgen."})
A("evening","time","noun","nucleus","evening",
  {"en":"evening","es":("tarde","f"),"fr":("soir","m"),"it":("sera","f"),"pt":("tarde","f"),"de":("Abend","m"),"la":("vesper","m")},
  {"en":"Good evening to you.","es":"Llego por la tarde.","fr":"Bonsoir, le soir est doux.","it":"Studio di sera.","de":"Guten Abend."})
A("tomorrow","time","adverb","nucleus","tomorrow",
  {"en":"tomorrow","es":"mañana","fr":"demain","it":"domani","pt":"amanhã","de":"morgen","la":"cras"},
  {"en":"See you tomorrow.","es":"Hasta mañana.","fr":"À demain.","it":"A domani.","de":"Bis morgen."})
A("yesterday","time","adverb","nucleus","yesterday",
  {"en":"yesterday","es":"ayer","fr":"hier","it":"ieri","pt":"ontem","de":"gestern","la":"heri"},
  {"en":"It rained yesterday.","es":"Ayer llovió.","fr":"Hier il a plu.","it":"Ieri ha piovuto.","de":"Gestern hat es geregnet."})
A("now","time","adverb","nucleus","now",
  {"en":"now","es":"ahora","fr":"maintenant","it":"adesso","pt":"agora","de":"jetzt","la":"nunc"},
  {"en":"We go now.","es":"Vamos ahora.","fr":"On y va maintenant.","it":"Andiamo adesso.","de":"Wir gehen jetzt."})
A("always","time","adverb","nucleus","always",
  {"en":"always","es":"siempre","fr":"toujours","it":"sempre","pt":"sempre","de":"immer","la":"semper"},
  {"en":"She is always kind.","es":"Siempre es amable.","fr":"Elle est toujours gentille.","it":"È sempre gentile.","de":"Sie ist immer nett."})

# ===== FAMILY =====
A("family","family","noun","nucleus","family",
  {"en":"family","es":("familia","f"),"fr":("famille","f"),"it":("famiglia","f"),"pt":("família","f"),"de":("Familie","f"),"la":("familia","f")},
  {"en":"My family is big.","es":"Mi familia es grande.","fr":"Ma famille est grande.","it":"La mia famiglia è grande.","de":"Meine Familie ist groß."})
A("brother","family","noun","nucleus","brother",
  {"en":"brother","es":("hermano","m"),"fr":("frère","m"),"it":("fratello","m"),"pt":("irmão","m"),"de":("Bruder","m"),"la":("frater","m")},
  {"en":"My brother is tall.","es":"Mi hermano es alto.","fr":"Mon frère est grand.","it":"Mio fratello è alto.","de":"Mein Bruder ist groß."})
A("sister","family","noun","nucleus","sister",
  {"en":"sister","es":("hermana","f"),"fr":("sœur","f"),"it":("sorella","f"),"pt":("irmã","f"),"de":("Schwester","f"),"la":("soror","f")},
  {"en":"Her sister sings.","es":"Su hermana canta.","fr":"Sa sœur chante.","it":"Sua sorella canta.","de":"Ihre Schwester singt."})
A("son","family","noun","nucleus","son",
  {"en":"son","es":("hijo","m"),"fr":("fils","m"),"it":("figlio","m"),"pt":("filho","m"),"de":("Sohn","m"),"la":("filius","m")},
  {"en":"Their son is small.","es":"Su hijo es pequeño.","fr":"Leur fils est petit.","it":"Il loro figlio è piccolo.","de":"Ihr Sohn ist klein."})
A("daughter","family","noun","nucleus","daughter",
  {"en":"daughter","es":("hija","f"),"fr":("fille","f"),"it":("figlia","f"),"pt":("filha","f"),"de":("Tochter","f"),"la":("filia","f")},
  {"en":"My daughter reads.","es":"Mi hija lee.","fr":"Ma fille lit.","it":"Mia figlia legge.","de":"Meine Tochter liest."})
A("grandmother","family","noun","nucleus","grandmother",
  {"en":"grandmother","es":("abuela","f"),"fr":("grand-mère","f"),"it":("nonna","f"),"pt":("avó","f"),"de":("Großmutter","f"),"la":("avia","f")},
  {"en":"Grandmother makes bread.","es":"La abuela hace pan.","fr":"Grand-mère fait du pain.","it":"La nonna fa il pane.","de":"Großmutter backt Brot."})
A("grandfather","family","noun","nucleus","grandfather",
  {"en":"grandfather","es":("abuelo","m"),"fr":("grand-père","m"),"it":("nonno","m"),"pt":("avô","m"),"de":("Großvater","m"),"la":("avus","m")},
  {"en":"Grandfather tells stories.","es":"El abuelo cuenta historias.","fr":"Grand-père raconte des histoires.","it":"Il nonno racconta storie.","de":"Großvater erzählt Geschichten."})

# ===== FOOD & DRINK =====
A("food","food","noun","nucleus","food",
  {"en":"food","es":("comida","f"),"fr":("nourriture","f"),"it":("cibo","m"),"pt":("comida","f"),"de":("Essen","n"),"la":("cibus","m")},
  {"en":"The food is good.","es":"La comida es buena.","fr":"La nourriture est bonne.","it":"Il cibo è buono.","de":"Das Essen ist gut."})
A("apple","food","noun","nucleus","apple",
  {"en":"apple","es":("manzana","f"),"fr":("pomme","f"),"it":("mela","f"),"pt":("maçã","f"),"de":("Apfel","m"),"la":("malum","n")},
  {"en":"I eat an apple.","es":"Como una manzana.","fr":"Je mange une pomme.","it":"Mangio una mela.","de":"Ich esse einen Apfel."})
A("cheese","food","noun","nucleus","cheese",
  {"en":"cheese","es":("queso","m"),"fr":("fromage","m"),"it":("formaggio","m"),"pt":("queijo","m"),"de":("Käse","m"),"la":("caseus","m")},
  {"en":"This cheese is old.","es":"Este queso es viejo.","fr":"Ce fromage est vieux.","it":"Questo formaggio è vecchio.","de":"Dieser Käse ist alt."})
A("egg","food","noun","nucleus","egg",
  {"en":"egg","es":("huevo","m"),"fr":("œuf","m"),"it":("uovo","m"),"pt":("ovo","m"),"de":("Ei","n"),"la":("ovum","n")},
  {"en":"One egg, please.","es":"Un huevo, por favor.","fr":"Un œuf, s'il te plaît.","it":"Un uovo, per favore.","de":"Ein Ei, bitte."})
A("meat","food","noun","nucleus","meat",
  {"en":"meat","es":("carne","f"),"fr":("viande","f"),"it":("carne","f"),"pt":("carne","f"),"de":("Fleisch","n"),"la":("caro","f")},
  {"en":"He cooks the meat.","es":"Cocina la carne.","fr":"Il cuit la viande.","it":"Cucina la carne.","de":"Er kocht das Fleisch."})
A("coffee","drink","noun","nucleus","coffee",
  {"en":"coffee","es":("café","m"),"fr":("café","m"),"it":("caffè","m"),"pt":("café","m"),"de":("Kaffee","m"),"la":("coffeum","n")},
  {"en":"I drink coffee.","es":"Bebo café.","fr":"Je bois du café.","it":"Bevo il caffè.","de":"Ich trinke Kaffee."})
A("tea","drink","noun","nucleus","tea",
  {"en":"tea","es":("té","m"),"fr":("thé","m"),"it":("tè","m"),"pt":("chá","m"),"de":("Tee","m"),"la":("thea","f")},
  {"en":"She wants tea.","es":"Quiere té.","fr":"Elle veut du thé.","it":"Vuole il tè.","de":"Sie möchte Tee."})

# ===== ANIMALS =====
A("cow","animal","noun","nucleus","cow",
  {"en":"cow","es":("vaca","f"),"fr":("vache","f"),"it":("mucca","f"),"pt":("vaca","f"),"de":("Kuh","f"),"la":("vacca","f")},
  {"en":"The cow eats grass.","es":"La vaca come hierba.","fr":"La vache mange l'herbe.","it":"La mucca mangia l'erba.","de":"Die Kuh frisst Gras."})
A("sheep","animal","noun","nucleus","sheep",
  {"en":"sheep","es":("oveja","f"),"fr":("mouton","m"),"it":("pecora","f"),"pt":("ovelha","f"),"de":("Schaf","n"),"la":("ovis","f")},
  {"en":"A sheep is white.","es":"Una oveja es blanca.","fr":"Un mouton est blanc.","it":"Una pecora è bianca.","de":"Ein Schaf ist weiß."})
A("chicken","animal","noun","nucleus","chicken (hen)",
  {"en":"chicken","es":("gallina","f"),"fr":("poule","f"),"it":("gallina","f"),"pt":("galinha","f"),"de":("Huhn","n"),"la":("gallina","f")},
  {"en":"The chicken runs.","es":"La gallina corre.","fr":"La poule court.","it":"La gallina corre.","de":"Das Huhn rennt."})
A("mouse","animal","noun","nucleus","mouse",
  {"en":"mouse","es":("ratón","m"),"fr":("souris","f"),"it":("topo","m"),"pt":("rato","m"),"de":("Maus","f"),"la":("mus","m")},
  {"en":"The cat sees the mouse.","es":"El gato ve el ratón.","fr":"Le chat voit la souris.","it":"Il gatto vede il topo.","de":"Die Katze sieht die Maus."})

# ===== BODY =====
A("mouth","body","noun","nucleus","mouth",
  {"en":"mouth","es":("boca","f"),"fr":("bouche","f"),"it":("bocca","f"),"pt":("boca","f"),"de":("Mund","m"),"la":("os","n")},
  {"en":"Open your mouth.","es":"Abre la boca.","fr":"Ouvre la bouche.","it":"Apri la bocca.","de":"Öffne den Mund."})
A("nose","body","noun","nucleus","nose",
  {"en":"nose","es":("nariz","f"),"fr":("nez","m"),"it":("naso","m"),"pt":("nariz","m"),"de":("Nase","f"),"la":("nasus","m")},
  {"en":"My nose is cold.","es":"Mi nariz está fría.","fr":"Mon nez est froid.","it":"Il mio naso è freddo.","de":"Meine Nase ist kalt."})
A("ear","body","noun","nucleus","ear",
  {"en":"ear","es":("oreja","f"),"fr":("oreille","f"),"it":("orecchio","m"),"pt":("orelha","f"),"de":("Ohr","n"),"la":("auris","f")},
  {"en":"The ear hears sound.","es":"La oreja oye el sonido.","fr":"Une oreille entend le son.","it":"Un orecchio sente il suono.","de":"Das Ohr hört den Ton."})
A("arm","body","noun","nucleus","arm",
  {"en":"arm","es":("brazo","m"),"fr":("bras","m"),"it":("braccio","m"),"pt":("braço","m"),"de":("Arm","m"),"la":("bracchium","n")},
  {"en":"He lifts his arm.","es":"Levanta el brazo.","fr":"Il lève le bras.","it":"Alza il braccio.","de":"Er hebt den Arm."})
A("leg","body","noun","nucleus","leg",
  {"en":"leg","es":("pierna","f"),"fr":("jambe","f"),"it":("gamba","f"),"pt":("perna","f"),"de":("Bein","n"),"la":("crus","n")},
  {"en":"My leg hurts.","es":"Me duele la pierna.","fr":"J'ai mal à la jambe.","it":"Mi fa male la gamba.","de":"Mein Bein tut weh."})

# ===== COLORS (add to existing) =====
A("brown","color","adjective","nucleus","brown",
  {"en":"brown","es":"marrón","fr":"brun","it":"marrone","pt":"marrom","de":"braun","la":"fuscus"},
  {"en":"The dog is brown.","es":"El perro es marrón.","fr":"Le chien est brun.","it":"Il cane è marrone.","de":"Der Hund ist braun."})
A("grey","color","adjective","nucleus","grey",
  {"en":"grey","es":"gris","fr":"gris","it":"grigio","pt":"cinza","de":"grau","la":"canus"},
  {"en":"The sky is grey.","es":"El cielo es gris.","fr":"Le ciel est gris.","it":"Il cielo è grigio.","de":"Der Himmel ist grau."})

# ===== ADJECTIVES (add to existing) =====
A("long","adjective","adjective","nucleus","long",
  {"en":"long","es":"largo","fr":"long","it":"lungo","pt":"longo","de":"lang","la":"longus"},
  {"en":"The road is long.","es":"El camino es largo.","fr":"La route est longue, le chemin long.","it":"La strada è lunga, il cammino lungo.","de":"Der Weg ist lang."})
A("short","adjective","adjective","nucleus","short",
  {"en":"short","es":"corto","fr":"court","it":"corto","pt":"curto","de":"kurz","la":"brevis"},
  {"en":"The film is short.","es":"La película es corta, el día corto.","fr":"Le film est court.","it":"Il film è corto.","de":"Der Film ist kurz."})
A("happy","adjective","adjective","nucleus","happy",
  {"en":"happy","es":"feliz","fr":"heureux","it":"felice","pt":"feliz","de":"glücklich","la":"felix"},
  {"en":"I am happy.","es":"Soy feliz.","fr":"Je suis heureux.","it":"Sono felice.","de":"Ich bin glücklich."})
A("good-adj","adjective","adjective","nucleus","good (quality)",
  {"en":"good","es":"bueno","fr":"bon","it":"buono","pt":"bom","de":"gut","la":"bonus"},
  {"en":"It is a good idea.","es":"Es una buena idea, un libro bueno.","fr":"C'est un bon livre.","it":"È un buono libro.","de":"Das ist ein gutes Buch, sehr gut."})
A("bad","adjective","adjective","nucleus","bad",
  {"en":"bad","es":"malo","fr":"mauvais","it":"cattivo","pt":"mau","de":"schlecht","la":"malus"},
  {"en":"The weather is bad.","es":"El tiempo es malo.","fr":"Le temps est mauvais.","it":"Il tempo è cattivo.","de":"Das Wetter ist schlecht."})
A("easy","adjective","adjective","nucleus","easy",
  {"en":"easy","es":"fácil","fr":"facile","it":"facile","pt":"fácil","de":"einfach","la":"facilis"},
  {"en":"The test is easy.","es":"El examen es fácil.","fr":"Le test est facile.","it":"Il test è facile.","de":"Der Test ist einfach."})
A("difficult","adjective","adjective","nucleus","difficult",
  {"en":"difficult","es":"difícil","fr":"difficile","it":"difficile","pt":"difícil","de":"schwierig","la":"difficilis"},
  {"en":"German is difficult.","es":"El alemán es difícil.","fr":"L'allemand est difficile.","it":"Il tedesco è difficile.","de":"Deutsch ist schwierig."})

# ===== VERBS (add to existing) =====
A("to-sleep","verb","verb","nucleus","to sleep",
  {"en":"sleep","es":"dormir","fr":"dormir","it":"dormire","pt":"dormir","de":"schlafen","la":"dormire"},
  {"en":"I sleep at night.","es":"Yo dormir de noche.","fr":"Je vais dormir.","it":"Voglio dormire.","de":"Ich will schlafen."})
A("to-walk","verb","verb","nucleus","to walk",
  {"en":"walk","es":"caminar","fr":"marcher","it":"camminare","pt":"caminhar","de":"gehen","la":"ambulare"},
  {"en":"We like to walk.","es":"Nos gusta caminar.","fr":"On aime marcher.","it":"Ci piace camminare.","de":"Wir gehen gern."})
A("to-buy","verb","verb","nucleus","to buy",
  {"en":"buy","es":"comprar","fr":"acheter","it":"comprare","pt":"comprar","de":"kaufen","la":"emere"},
  {"en":"I want to buy bread.","es":"Quiero comprar pan.","fr":"Je veux acheter du pain.","it":"Voglio comprare il pane.","de":"Ich will Brot kaufen."})
A("to-work","verb","verb","nucleus","to work",
  {"en":"work","es":"trabajar","fr":"travailler","it":"lavorare","pt":"trabalhar","de":"arbeiten","la":"laborare"},
  {"en":"They work a lot.","es":"Ellos trabajar mucho.","fr":"Ils aiment travailler.","it":"Devono lavorare.","de":"Sie müssen arbeiten."})
A("to-open","verb","verb","nucleus","to open",
  {"en":"open","es":"abrir","fr":"ouvrir","it":"aprire","pt":"abrir","de":"öffnen","la":"aperire"},
  {"en":"Please open the door.","es":"Por favor abrir la puerta.","fr":"Il faut ouvrir la porte.","it":"Devo aprire la porta.","de":"Bitte die Tür öffnen."})
A("to-close","verb","verb","nucleus","to close",
  {"en":"close","es":"cerrar","fr":"fermer","it":"chiudere","pt":"fechar","de":"schließen","la":"claudere"},
  {"en":"Can you close it?","es":"¿Puedes cerrar?","fr":"Tu peux fermer?","it":"Puoi chiudere?","de":"Kannst du schließen?"})

# ===== PLACES / TRAVEL =====
A("street","place","noun","nucleus","street",
  {"en":"street","es":("calle","f"),"fr":("rue","f"),"it":("strada","f"),"pt":("rua","f"),"de":("Straße","f"),"la":("via","f")},
  {"en":"The street is wide.","es":"La calle es ancha.","fr":"La rue est large.","it":"La strada è larga.","de":"Die Straße ist breit."})
A("market","place","noun","nucleus","market",
  {"en":"market","es":("mercado","m"),"fr":("marché","m"),"it":("mercato","m"),"pt":("mercado","m"),"de":("Markt","m"),"la":("forum","n")},
  {"en":"We go to the market.","es":"Vamos al mercado.","fr":"On va au marché.","it":"Andiamo al mercato.","de":"Wir gehen zum Markt."})
A("station","place","noun","nucleus","station",
  {"en":"station","es":("estación","f"),"fr":("gare","f"),"it":("stazione","f"),"pt":("estação","f"),"de":("Bahnhof","m"),"la":("statio","f")},
  {"en":"The station is near.","es":"La estación está cerca.","fr":"La gare est proche.","it":"La stazione è vicina.","de":"Der Bahnhof ist nah."})
A("hotel","place","noun","nucleus","hotel",
  {"en":"hotel","es":("hotel","m"),"fr":("hôtel","m"),"it":("albergo","m"),"pt":("hotel","m"),"de":("Hotel","n"),"la":("deversorium","n")},
  {"en":"Our hotel is good.","es":"Nuestro hotel es bueno.","fr":"Notre hôtel est bon.","it":"Il nostro albergo è buono.","de":"Unser Hotel ist gut."})
A("door","object","noun","nucleus","door",
  {"en":"door","es":("puerta","f"),"fr":("porte","f"),"it":("porta","f"),"pt":("porta","f"),"de":("Tür","f"),"la":("ianua","f")},
  {"en":"The door is open.","es":"La puerta está abierta.","fr":"La porte est ouverte.","it":"La porta è aperta.","de":"Die Tür ist offen."})
A("table","object","noun","nucleus","table",
  {"en":"table","es":("mesa","f"),"fr":("table","f"),"it":("tavolo","m"),"pt":("mesa","f"),"de":("Tisch","m"),"la":("mensa","f")},
  {"en":"The book is on the table.","es":"El libro está en la mesa.","fr":"Le livre est sur la table.","it":"Il libro è sul tavolo.","de":"Das Buch ist auf dem Tisch."})

# ===== WEATHER / NATURE =====
A("rain","weather","noun","nucleus","rain",
  {"en":"rain","es":("lluvia","f"),"fr":("pluie","f"),"it":("pioggia","f"),"pt":("chuva","f"),"de":("Regen","m"),"la":("pluvia","f")},
  {"en":"The rain is cold.","es":"La lluvia es fría.","fr":"La pluie est froide.","it":"La pioggia è fredda.","de":"Der Regen ist kalt."})
A("wind","weather","noun","nucleus","wind",
  {"en":"wind","es":("viento","m"),"fr":("vent","m"),"it":("vento","m"),"pt":("vento","m"),"de":("Wind","m"),"la":("ventus","m")},
  {"en":"The wind is strong.","es":"El viento es fuerte.","fr":"Le vent est fort.","it":"Il vento è forte.","de":"Der Wind ist stark."})
A("snow","weather","noun","nucleus","snow",
  {"en":"snow","es":("nieve","f"),"fr":("neige","f"),"it":("neve","f"),"pt":("neve","f"),"de":("Schnee","m"),"la":("nix","f")},
  {"en":"The snow is white.","es":"La nieve es blanca.","fr":"La neige est blanche.","it":"La neve è bianca.","de":"Der Schnee ist weiß."})
A("sky","nature","noun","nucleus","sky",
  {"en":"sky","es":("cielo","m"),"fr":("ciel","m"),"it":("cielo","m"),"pt":("céu","m"),"de":("Himmel","m"),"la":("caelum","n")},
  {"en":"The sky is blue.","es":"El cielo es azul.","fr":"Le ciel est bleu.","it":"Il cielo è azzurro.","de":"Der Himmel ist blau."})
A("sea","nature","noun","nucleus","sea",
  {"en":"sea","es":("mar","m"),"fr":("mer","f"),"it":("mare","m"),"pt":("mar","m"),"de":("Meer","n"),"la":("mare","n")},
  {"en":"The sea is big.","es":"El mar es grande.","fr":"La mer est grande.","it":"Il mare è grande.","de":"Das Meer ist groß."})
A("mountain","nature","noun","nucleus","mountain",
  {"en":"mountain","es":("montaña","f"),"fr":("montagne","f"),"it":("montagna","f"),"pt":("montanha","f"),"de":("Berg","m"),"la":("mons","m")},
  {"en":"The mountain is high.","es":"La montaña es alta.","fr":"La montagne est haute.","it":"La montagna è alta.","de":"Der Berg ist hoch."})

# ===== DIRECTIONS / FUNCTION =====
A("left","direction","noun","nucleus","left",
  {"en":"left","es":("izquierda","f"),"fr":("gauche","f"),"it":("sinistra","f"),"pt":("esquerda","f"),"de":("links","n"),"la":("sinistra","f")},
  {"en":"Turn to the left.","es":"Gira a la izquierda.","fr":"Tourne à gauche.","it":"Gira a sinistra.","de":"Geh nach links."})
A("right","direction","noun","nucleus","right (direction)",
  {"en":"right","es":("derecha","f"),"fr":("droite","f"),"it":("destra","f"),"pt":("direita","f"),"de":("rechts","n"),"la":("dextra","f")},
  {"en":"The shop is on the right.","es":"La tienda está a la derecha.","fr":"Le magasin est à droite.","it":"Il negozio è a destra.","de":"Der Laden ist rechts."})
A("up","direction","adverb","nucleus","up / above",
  {"en":"up","es":"arriba","fr":"haut","it":"su","pt":"acima","de":"oben","la":"sursum"},
  {"en":"Look up.","es":"Mira arriba.","fr":"Regarde en haut.","it":"Guarda su.","de":"Schau nach oben."})
A("down","direction","adverb","nucleus","down / below",
  {"en":"down","es":"abajo","fr":"bas","it":"giù","pt":"abaixo","de":"unten","la":"deorsum"},
  {"en":"The cat is down.","es":"El gato está abajo.","fr":"Le chat est en bas.","it":"Il gatto è giù.","de":"Die Katze ist unten."})
A("and","function","function","prereq","and",
  {"en":"and","es":"y","fr":"et","it":"e","pt":"e","de":"und","la":"et"},
  {"en":"bread and water","es":"pan y agua","fr":"du pain et de l'eau","it":"pane e acqua","de":"Brot und Wasser"})
A("or","function","function","prereq","or",
  {"en":"or","es":"o","fr":"ou","it":"o","pt":"ou","de":"oder","la":"aut"},
  {"en":"tea or coffee","es":"té o café","fr":"thé ou café","it":"tè o caffè","de":"Tee oder Kaffee"})
A("not","function","adverb","prereq","not",
  {"en":"not","es":"no","fr":"pas","it":"non","pt":"não","de":"nicht","la":"non"},
  {"en":"It is not here.","es":"No está aquí.","fr":"Ce n'est pas ici.","it":"Non è qui.","de":"Es ist nicht hier."})
A("with","function","preposition","nucleus","with",
  {"en":"with","es":"con","fr":"avec","it":"con","pt":"com","de":"mit","la":"cum"},
  {"en":"coffee with milk","es":"café con leche","fr":"café avec du lait","it":"caffè con latte","de":"Kaffee mit Milch"})
A("for","function","preposition","nucleus","for",
  {"en":"for","es":"para","fr":"pour","it":"per","pt":"para","de":"für","la":"pro"},
  {"en":"This is for you.","es":"Esto es para ti.","fr":"C'est pour toi.","it":"Questo è per te.","de":"Das ist für dich."})

# ===== USEFUL PHRASES (frontier) =====
A("excuse-me","phrase","phrase","frontier","excuse me / sorry",
  {"en":"excuse me","es":"perdón","fr":"pardon","it":"scusi","pt":"desculpe","de":"Entschuldigung","la":"ignosce"},
  {"en":"Excuse me, where is it?","es":"Perdón, ¿dónde está?","fr":"Pardon, où est-ce?","it":"Scusi, dov'è?","de":"Entschuldigung, wo ist das?"})
A("how-much","phrase","phrase","frontier","how much is it?",
  {"en":"how much","es":"cuánto cuesta","fr":"combien","it":"quanto costa","pt":"quanto custa","de":"wie viel","la":"quanti"},
  {"en":"How much is the bread?","es":"¿Cuánto cuesta el pan?","fr":"Combien coûte le pain?","it":"Quanto costa il pane?","de":"Wie viel kostet das Brot?"})
A("see-you-tomorrow","phrase","phrase","frontier","see you tomorrow",
  {"en":"see you tomorrow","es":"hasta mañana","fr":"à demain","it":"a domani","pt":"até amanhã","de":"bis morgen","la":"cras te videbo"},
  {"en":"Goodbye, see you tomorrow.","es":"Adiós, hasta mañana.","fr":"Au revoir, à demain.","it":"Ciao, a domani.","de":"Tschüss, bis morgen."})
A("thank-you-very-much","phrase","phrase","frontier","thank you very much",
  {"en":"thank you very much","es":"muchas gracias","fr":"merci beaucoup","it":"grazie mille","pt":"muito obrigado","de":"vielen Dank","la":"gratias tibi ago"},
  {"en":"Thank you very much, sir.","es":"Muchas gracias, señor.","fr":"Merci beaucoup, monsieur.","it":"Grazie mille, signore.","de":"Vielen Dank, mein Herr."})
A("speak-slowly","phrase","phrase","frontier","please speak slowly",
  {"en":"speak slowly","es":"habla despacio","fr":"parlez lentement","it":"parli piano","pt":"fale devagar","de":"sprich langsam","la":"loquere lente"},
  {"en":"Please speak slowly.","es":"Por favor, habla despacio.","fr":"Parlez lentement, s'il vous plaît.","it":"Per favore, parli piano.","de":"Bitte sprich langsam."})
A("i-am-learning","phrase","phrase","frontier","I am learning",
  {"en":"I am learning","es":"estoy aprendiendo","fr":"j'apprends","it":"sto imparando","pt":"estou aprendendo","de":"ich lerne","la":"disco"},
  {"en":"I am learning the language.","es":"Estoy aprendiendo el idioma.","fr":"J'apprends la langue.","it":"Sto imparando la lingua.","de":"Ich lerne die Sprache."})

# ===== BATCH 2 =====================================================

# ---- more months ----
A("february","month","noun","nucleus","February",
  {"en":"February","es":("febrero","m"),"fr":("février","m"),"it":("febbraio","m"),"pt":("fevereiro","m"),"de":("Februar","m"),"la":("Februarius","m")},
  {"en":"February is short.","es":"Febrero es corto.","fr":"Février est court.","it":"Febbraio è corto.","de":"Februar ist kurz."})
A("march-month","month","noun","nucleus","March (month)",
  {"en":"March","es":("marzo","m"),"fr":("mars","m"),"it":("marzo","m"),"pt":("março","m"),"de":("März","m"),"la":("Martius","m")},
  {"en":"Spring starts in March.","es":"La primavera empieza en marzo.","fr":"Le printemps commence en mars.","it":"La primavera inizia a marzo.","de":"Der Frühling beginnt im März."})
A("may-month","month","noun","nucleus","May (month)",
  {"en":"May","es":("mayo","m"),"fr":("mai","m"),"it":("maggio","m"),"pt":("maio","m"),"de":("Mai","m"),"la":("Maius","m")},
  {"en":"Flowers grow in May.","es":"Las flores crecen en mayo.","fr":"Les fleurs poussent en mai.","it":"I fiori crescono a maggio.","de":"Blumen wachsen im Mai."})
A("june-month","month","noun","nucleus","June (month)",
  {"en":"June","es":("junio","m"),"fr":("juin","m"),"it":("giugno","m"),"pt":("junho","m"),"de":("Juni","m"),"la":("Iunius","m")},
  {"en":"School ends in June.","es":"La escuela termina en junio.","fr":"L'école finit en juin.","it":"La scuola finisce a giugno.","de":"Die Schule endet im Juni."})
A("september-month","month","noun","nucleus","September",
  {"en":"September","es":("septiembre","m"),"fr":("septembre","m"),"it":("settembre","m"),"pt":("setembro","m"),"de":("September","m"),"la":("September","m")},
  {"en":"September is cool.","es":"Septiembre es fresco.","fr":"Septembre est frais.","it":"Settembre è fresco.","de":"September ist kühl."})

# ---- food & drink ----
A("rice","food","noun","nucleus","rice",
  {"en":"rice","es":("arroz","m"),"fr":("riz","m"),"it":("riso","m"),"pt":("arroz","m"),"de":("Reis","m"),"la":("oryza","f")},
  {"en":"We eat rice.","es":"Comemos arroz.","fr":"Nous mangeons du riz.","it":"Mangiamo il riso.","de":"Wir essen Reis."})
A("fruit","food","noun","nucleus","fruit",
  {"en":"fruit","es":("fruta","f"),"fr":("fruit","m"),"it":("frutta","f"),"pt":("fruta","f"),"de":("Obst","n"),"la":("fructus","m")},
  {"en":"The fruit is sweet.","es":"La fruta es dulce.","fr":"Le fruit est doux.","it":"La frutta è dolce.","de":"Das Obst ist süß."})
A("vegetable","food","noun","nucleus","vegetable",
  {"en":"vegetable","es":("verdura","f"),"fr":("légume","m"),"it":("verdura","f"),"pt":("legume","m"),"de":("Gemüse","n"),"la":("holus","n")},
  {"en":"Eat your vegetable.","es":"Come tu verdura.","fr":"Mange ton légume.","it":"Mangia la verdura.","de":"Iss dein Gemüse."})
A("salt","food","noun","nucleus","salt",
  {"en":"salt","es":("sal","f"),"fr":("sel","m"),"it":("sale","m"),"pt":("sal","m"),"de":("Salz","n"),"la":("sal","m")},
  {"en":"Pass the salt.","es":"Pasa la sal.","fr":"Passe le sel.","it":"Passa il sale.","de":"Reich mir das Salz."})
A("sugar","food","noun","nucleus","sugar",
  {"en":"sugar","es":("azúcar","m"),"fr":("sucre","m"),"it":("zucchero","m"),"pt":("açúcar","m"),"de":("Zucker","m"),"la":("saccharum","n")},
  {"en":"Coffee with sugar.","es":"Café con azúcar.","fr":"Du café avec du sucre.","it":"Caffè con zucchero.","de":"Kaffee mit Zucker."})
A("soup","food","noun","nucleus","soup",
  {"en":"soup","es":("sopa","f"),"fr":("soupe","f"),"it":("zuppa","f"),"pt":("sopa","f"),"de":("Suppe","f"),"la":("ius","n")},
  {"en":"The soup is hot.","es":"La sopa está caliente.","fr":"La soupe est chaude.","it":"La zuppa è calda.","de":"Die Suppe ist heiß."})
A("breakfast","food","noun","nucleus","breakfast",
  {"en":"breakfast","es":("desayuno","m"),"fr":("petit-déjeuner","m"),"it":("colazione","f"),"pt":("café da manhã","m"),"de":("Frühstück","n"),"la":("ientaculum","n")},
  {"en":"Breakfast is ready.","es":"El desayuno está listo.","fr":"Le petit-déjeuner est prêt.","it":"La colazione è pronta.","de":"Das Frühstück ist fertig."})

# ---- household & objects ----
A("window","object","noun","nucleus","window",
  {"en":"window","es":("ventana","f"),"fr":("fenêtre","f"),"it":("finestra","f"),"pt":("janela","f"),"de":("Fenster","n"),"la":("fenestra","f")},
  {"en":"Open the window.","es":"Abre la ventana.","fr":"Ouvre la fenêtre.","it":"Apri la finestra.","de":"Öffne das Fenster."})
A("chair","object","noun","nucleus","chair",
  {"en":"chair","es":("silla","f"),"fr":("chaise","f"),"it":("sedia","f"),"pt":("cadeira","f"),"de":("Stuhl","m"),"la":("sella","f")},
  {"en":"Sit on the chair.","es":"Siéntate en la silla.","fr":"Assieds-toi sur la chaise.","it":"Siediti sulla sedia.","de":"Setz dich auf den Stuhl."})
A("bed","object","noun","nucleus","bed",
  {"en":"bed","es":("cama","f"),"fr":("lit","m"),"it":("letto","m"),"pt":("cama","f"),"de":("Bett","n"),"la":("lectus","m")},
  {"en":"The bed is soft.","es":"La cama es blanda.","fr":"Le lit est doux.","it":"Il letto è morbido.","de":"Das Bett ist weich."})
A("key","object","noun","nucleus","key",
  {"en":"key","es":("llave","f"),"fr":("clé","f"),"it":("chiave","f"),"pt":("chave","f"),"de":("Schlüssel","m"),"la":("clavis","f")},
  {"en":"I lost my key.","es":"Perdí mi llave.","fr":"J'ai perdu ma clé.","it":"Ho perso la chiave.","de":"Ich habe meinen Schlüssel verloren."})
A("money","object","noun","nucleus","money",
  {"en":"money","es":("dinero","m"),"fr":("argent","m"),"it":("denaro","m"),"pt":("dinheiro","m"),"de":("Geld","n"),"la":("pecunia","f")},
  {"en":"I have no money.","es":"No tengo dinero.","fr":"Je veux gagner argent.","it":"Non ho denaro.","de":"Ich habe kein Geld."})
A("paper","object","noun","nucleus","paper",
  {"en":"paper","es":("papel","m"),"fr":("papier","m"),"it":("carta","f"),"pt":("papel","m"),"de":("Papier","n"),"la":("charta","f")},
  {"en":"Write on the paper.","es":"Escribe en el papel.","fr":"Écris sur le papier.","it":"Scrivi sulla carta.","de":"Schreib auf das Papier."})
A("phone","object","noun","nucleus","phone",
  {"en":"phone","es":("teléfono","m"),"fr":("téléphone","m"),"it":("telefono","m"),"pt":("telefone","m"),"de":("Telefon","n"),"la":("telephonum","n")},
  {"en":"My phone is new.","es":"Mi teléfono es nuevo.","fr":"Mon téléphone est neuf.","it":"Il mio telefono è nuovo.","de":"Mein Telefon ist neu."})
A("clothes","object","noun","nucleus","clothes",
  {"en":"clothes","es":("ropa","f"),"fr":("vêtements","m"),"it":("vestiti","m"),"pt":("roupa","f"),"de":("Kleidung","f"),"la":("vestis","f")},
  {"en":"The clothes are clean.","es":"La ropa está limpia.","fr":"Les vêtements sont propres.","it":"I vestiti sono puliti.","de":"Die Kleidung ist sauber."})

# ---- people & professions ----
A("teacher","people","noun","nucleus","teacher",
  {"en":"teacher","es":("maestro","m"),"fr":("professeur","m"),"it":("maestro","m"),"pt":("professor","m"),"de":("Lehrer","m"),"la":("magister","m")},
  {"en":"The teacher is kind.","es":"El maestro es amable.","fr":"Le professeur est gentil.","it":"Il maestro è gentile.","de":"Der Lehrer ist nett."})
A("doctor","people","noun","nucleus","doctor",
  {"en":"doctor","es":("médico","m"),"fr":("médecin","m"),"it":("medico","m"),"pt":("médico","m"),"de":("Arzt","m"),"la":("medicus","m")},
  {"en":"Call the doctor.","es":"Llama al médico.","fr":"Appelle le médecin.","it":"Chiama il medico.","de":"Ruf den Arzt."})
A("student","people","noun","nucleus","student",
  {"en":"student","es":("estudiante","m"),"fr":("étudiant","m"),"it":("studente","m"),"pt":("estudante","m"),"de":("Student","m"),"la":("discipulus","m")},
  {"en":"The student reads.","es":"El estudiante lee.","fr":"Un étudiant lit.","it":"Lo studente legge.","de":"Der Student liest."})
A("king","people","noun","nucleus","king",
  {"en":"king","es":("rey","m"),"fr":("roi","m"),"it":("re","m"),"pt":("rei","m"),"de":("König","m"),"la":("rex","m")},
  {"en":"The king is old.","es":"El rey es viejo.","fr":"Le roi est vieux.","it":"Il re è vecchio.","de":"Der König ist alt."})
A("queen","people","noun","nucleus","queen",
  {"en":"queen","es":("reina","f"),"fr":("reine","f"),"it":("regina","f"),"pt":("rainha","f"),"de":("Königin","f"),"la":("regina","f")},
  {"en":"The queen is wise.","es":"La reina es sabia.","fr":"La reine est sage.","it":"La regina è saggia.","de":"Die Königin ist weise."})

# ---- more animals & nature ----
A("tree-2","nature","noun","nucleus","forest",
  {"en":"forest","es":("bosque","m"),"fr":("forêt","f"),"it":("bosco","m"),"pt":("floresta","f"),"de":("Wald","m"),"la":("silva","f")},
  {"en":"The forest is dark.","es":"El bosque es oscuro.","fr":"La forêt est sombre.","it":"Il bosco è scuro.","de":"Der Wald ist dunkel."})
A("river","nature","noun","nucleus","river",
  {"en":"river","es":("río","m"),"fr":("fleuve","m"),"it":("fiume","m"),"pt":("rio","m"),"de":("Fluss","m"),"la":("flumen","n")},
  {"en":"The river is wide.","es":"El río es ancho.","fr":"Le fleuve est large.","it":"Il fiume è largo.","de":"Der Fluss ist breit."})
A("stone","nature","noun","nucleus","stone",
  {"en":"stone","es":("piedra","f"),"fr":("pierre","f"),"it":("pietra","f"),"pt":("pedra","f"),"de":("Stein","m"),"la":("lapis","m")},
  {"en":"The stone is heavy.","es":"La piedra es pesada.","fr":"La pierre est lourde.","it":"La pietra è pesante.","de":"Der Stein ist schwer."})
A("grass","nature","noun","nucleus","grass",
  {"en":"grass","es":("hierba","f"),"fr":("herbe","f"),"it":("erba","f"),"pt":("grama","f"),"de":("Gras","n"),"la":("herba","f")},
  {"en":"The grass is green.","es":"La hierba es verde.","fr":"Une herbe pousse.","it":"Una erba cresce.","de":"Das Gras ist grün."})
A("bear","animal","noun","nucleus","bear",
  {"en":"bear","es":("oso","m"),"fr":("ours","m"),"it":("orso","m"),"pt":("urso","m"),"de":("Bär","m"),"la":("ursus","m")},
  {"en":"The bear is big.","es":"El oso es grande.","fr":"Un ours est grand.","it":"Un orso è grande.","de":"Der Bär ist groß."})
A("wolf","animal","noun","nucleus","wolf",
  {"en":"wolf","es":("lobo","m"),"fr":("loup","m"),"it":("lupo","m"),"pt":("lobo","m"),"de":("Wolf","m"),"la":("lupus","m")},
  {"en":"The wolf runs fast.","es":"El lobo corre rápido.","fr":"Le loup court vite.","it":"Il lupo corre veloce.","de":"Der Wolf rennt schnell."})

# ---- more adjectives ----
A("young","adjective","adjective","nucleus","young",
  {"en":"young","es":"joven","fr":"jeune","it":"giovane","pt":"jovem","de":"jung","la":"iuvenis"},
  {"en":"She is young.","es":"Ella es joven.","fr":"Elle est jeune.","it":"Lei è giovane.","de":"Sie ist jung."})
A("strong","adjective","adjective","nucleus","strong",
  {"en":"strong","es":"fuerte","fr":"fort","it":"forte","pt":"forte","de":"stark","la":"fortis"},
  {"en":"The man is strong.","es":"El hombre es fuerte.","fr":"L'homme est fort.","it":"L'uomo è forte.","de":"Der Mann ist stark."})
A("rich","adjective","adjective","nucleus","rich",
  {"en":"rich","es":"rico","fr":"riche","it":"ricco","pt":"rico","de":"reich","la":"dives"},
  {"en":"He is very rich.","es":"Él es muy rico.","fr":"Il est très riche.","it":"È molto ricco.","de":"Er ist sehr reich."})
A("poor","adjective","adjective","nucleus","poor",
  {"en":"poor","es":"pobre","fr":"pauvre","it":"povero","pt":"pobre","de":"arm","la":"pauper"},
  {"en":"They are poor.","es":"Ellos son pobres, un hombre pobre.","fr":"Il est pauvre.","it":"Sono poveri, un uomo povero.","de":"Sie sind arm."})
A("clean","adjective","adjective","nucleus","clean",
  {"en":"clean","es":"limpio","fr":"propre","it":"pulito","pt":"limpo","de":"sauber","la":"mundus"},
  {"en":"The room is clean.","es":"El cuarto está limpio.","fr":"La chambre est propre.","it":"La stanza è pulita, il piatto pulito.","de":"Das Zimmer ist sauber."})
A("full","adjective","adjective","nucleus","full",
  {"en":"full","es":"lleno","fr":"plein","it":"pieno","pt":"cheio","de":"voll","la":"plenus"},
  {"en":"The glass is full.","es":"El vaso está lleno.","fr":"Le verre est plein.","it":"Il bicchiere è pieno.","de":"Das Glas ist voll."})
A("empty","adjective","adjective","nucleus","empty",
  {"en":"empty","es":"vacío","fr":"vide","it":"vuoto","pt":"vazio","de":"leer","la":"vacuus"},
  {"en":"The box is empty.","es":"La caja está vacía, el vaso vacío.","fr":"La boîte est vide.","it":"La scatola è vuota, il vaso vuoto.","de":"Die Kiste ist leer."})

# ---- more verbs ----
A("to-make","verb","verb","nucleus","to make",
  {"en":"make","es":"hacer","fr":"faire","it":"fare","pt":"fazer","de":"machen","la":"facere"},
  {"en":"I want to make bread.","es":"Quiero hacer pan.","fr":"Je veux faire du pain.","it":"Voglio fare il pane.","de":"Ich will Brot machen."})
A("to-say","verb","verb","nucleus","to say",
  {"en":"say","es":"decir","fr":"dire","it":"dire","pt":"dizer","de":"sagen","la":"dicere"},
  {"en":"What do you want to say?","es":"¿Qué quieres decir?","fr":"Que veux-tu dire?","it":"Cosa vuoi dire?","de":"Was willst du sagen?"})
A("to-think","verb","verb","nucleus","to think",
  {"en":"think","es":"pensar","fr":"penser","it":"pensare","pt":"pensar","de":"denken","la":"cogitare"},
  {"en":"Let me think.","es":"Déjame pensar.","fr":"Laisse-moi penser.","it":"Lasciami pensare.","de":"Lass mich denken."})
A("to-find","verb","verb","nucleus","to find",
  {"en":"find","es":"encontrar","fr":"trouver","it":"trovare","pt":"encontrar","de":"finden","la":"invenire"},
  {"en":"I cannot find it.","es":"No puedo encontrar.","fr":"Je ne peux pas trouver.","it":"Non riesco a trovare.","de":"Ich kann es nicht finden."})
A("to-help","verb","verb","nucleus","to help",
  {"en":"help","es":"ayudar","fr":"aider","it":"aiutare","pt":"ajudar","de":"helfen","la":"iuvare"},
  {"en":"Can you help me?","es":"¿Puedes ayudar?","fr":"Peux-tu aider?","it":"Puoi aiutare?","de":"Kannst du helfen?"})
A("to-learn","verb","verb","nucleus","to learn",
  {"en":"learn","es":"aprender","fr":"apprendre","it":"imparare","pt":"aprender","de":"lernen","la":"discere"},
  {"en":"I want to learn.","es":"Quiero aprender.","fr":"Je veux apprendre.","it":"Voglio imparare.","de":"Ich will lernen."})
A("to-understand","verb","verb","nucleus","to understand",
  {"en":"understand","es":"entender","fr":"comprendre","it":"capire","pt":"entender","de":"verstehen","la":"intellegere"},
  {"en":"I want to understand.","es":"Quiero entender.","fr":"Je veux comprendre.","it":"Voglio capire.","de":"Ich will verstehen."})
A("to-need","verb","verb","nucleus","to need",
  {"en":"need","es":"necesitar","fr":"besoin","it":"servire","pt":"precisar","de":"brauchen","la":"egere"},
  {"en":"I need water.","es":"Voy a necesitar agua.","fr":"J'ai besoin de pain.","it":"Mi può servire aiuto.","de":"Ich kann Wasser brauchen."})

# ---- question words ----
A("who","function","pronoun","nucleus","who",
  {"en":"who","es":"quién","fr":"qui","it":"chi","pt":"quem","de":"wer","la":"quis"},
  {"en":"Who is there?","es":"¿Quién está?","fr":"Qui est là?","it":"Chi è?","de":"Wer ist da?"})
A("what","function","pronoun","nucleus","what",
  {"en":"what","es":"qué","fr":"quoi","it":"cosa","pt":"que","de":"was","la":"quid"},
  {"en":"What is this?","es":"¿Qué es esto?","fr":"C'est quoi?","it":"Cosa è questo?","de":"Was ist das?"})
A("where","function","adverb","nucleus","where",
  {"en":"where","es":"dónde","fr":"où","it":"dove","pt":"onde","de":"wo","la":"ubi"},
  {"en":"Where are you?","es":"¿Dónde estás?","fr":"Où es-tu?","it":"Dove sei?","de":"Wo bist du?"})
A("when","function","adverb","nucleus","when",
  {"en":"when","es":"cuándo","fr":"quand","it":"quando","pt":"quando","de":"wann","la":"quando"},
  {"en":"When do we eat?","es":"¿Cuándo comemos?","fr":"Quand mange-t-on?","it":"Quando mangiamo?","de":"Wann essen wir?"})
A("why","function","adverb","nucleus","why",
  {"en":"why","es":"por qué","fr":"pourquoi","it":"perché","pt":"porquê","de":"warum","la":"cur"},
  {"en":"Why not?","es":"¿Por qué no?","fr":"Pourquoi pas?","it":"Perché no?","de":"Warum nicht?"})
A("how","function","adverb","nucleus","how",
  {"en":"how","es":"cómo","fr":"comment","it":"come","pt":"como","de":"wie","la":"quomodo"},
  {"en":"How does it work?","es":"¿Cómo funciona?","fr":"Comment ça marche?","it":"Come funziona?","de":"Wie funktioniert das?"})

# ---- more pronouns / function ----
A("my","function","pronoun","nucleus","my",
  {"en":"my","es":"mi","fr":"mon","it":"mio","pt":"meu","de":"mein","la":"meus"},
  {"en":"This is my book.","es":"Este es mi libro.","fr":"C'est mon livre.","it":"Questo è il mio libro.","de":"Das ist mein Buch."})
A("your","function","pronoun","nucleus","your (sg.)",
  {"en":"your","es":"tu","fr":"ton","it":"tuo","pt":"teu","de":"dein","la":"tuus"},
  {"en":"Is this your house?","es":"¿Es tu casa?","fr":"C'est ton chien?","it":"È il tuo libro?","de":"Ist das dein Haus?"})
A("in","function","preposition","nucleus","in",
  {"en":"in","es":"en","fr":"dans","it":"in","pt":"em","de":"in","la":"in"},
  {"en":"The cat is in the house.","es":"El gato está en casa.","fr":"Le chat est dans la maison.","it":"Il gatto è in casa.","de":"Die Katze ist in dem Haus."})
A("on","function","preposition","nucleus","on",
  {"en":"on","es":"sobre","fr":"sur","it":"su","pt":"sobre","de":"auf","la":"super"},
  {"en":"The book is on the table.","es":"El libro está sobre la mesa.","fr":"Le livre est sur la table.","it":"Il libro è su il tavolo.","de":"Das Buch ist auf dem Tisch."})
A("very","function","adverb","nucleus","very",
  {"en":"very","es":"muy","fr":"très","it":"molto","pt":"muito","de":"sehr","la":"valde"},
  {"en":"It is very good.","es":"Es muy bueno.","fr":"C'est très bon.","it":"È molto buono.","de":"Es ist sehr gut."})
A("more","function","adverb","nucleus","more",
  {"en":"more","es":"más","fr":"plus","it":"più","pt":"mais","de":"mehr","la":"plus"},
  {"en":"I want more water.","es":"Quiero más agua.","fr":"Je veux plus d'eau.","it":"Voglio più acqua.","de":"Ich will mehr Wasser."})
A("here-2","direction","adverb","nucleus","near / close",
  {"en":"near","es":"cerca","fr":"près","it":"vicino","pt":"perto","de":"nah","la":"prope"},
  {"en":"The shop is near.","es":"La tienda está cerca.","fr":"Le magasin est près.","it":"Il negozio è vicino.","de":"Der Laden ist nah."})

# ---- more phrases ----
A("good-evening","greeting","phrase","frontier","good evening",
  {"en":"good evening","es":"buenas tardes","fr":"bonsoir","it":"buonasera","pt":"boa tarde","de":"guten Abend","la":"salve"},
  {"en":"Good evening, everyone.","es":"Buenas tardes a todos.","fr":"Bonsoir tout le monde.","it":"Buonasera a tutti.","de":"Guten Abend zusammen."})
A("of-course","phrase","phrase","frontier","of course",
  {"en":"of course","es":"por supuesto","fr":"bien sûr","it":"certo","pt":"claro","de":"natürlich","la":"certe"},
  {"en":"Of course, my friend.","es":"Por supuesto, amigo.","fr":"Bien sûr, mon ami.","it":"Certo, amico.","de":"Natürlich, mein Freund."})
A("i-am-sorry","phrase","phrase","frontier","I am sorry",
  {"en":"I am sorry","es":"lo siento","fr":"je suis désolé","it":"mi dispiace","pt":"desculpa","de":"es tut mir leid","la":"me paenitet"},
  {"en":"I am sorry, truly.","es":"Lo siento de verdad.","fr":"Je suis désolé, vraiment.","it":"Mi dispiace davvero.","de":"Es tut mir leid, wirklich."})
A("where-is-bathroom","phrase","phrase","frontier","where is the bathroom?",
  {"en":"where is the bathroom","es":"dónde está el baño","fr":"où sont les toilettes","it":"dov'è il bagno","pt":"onde é o banheiro","de":"wo ist die Toilette","la":"ubi est latrina"},
  {"en":"Where is the bathroom?","es":"¿Dónde está el baño?","fr":"Où sont les toilettes?","it":"Scusi, dov'è il bagno?","de":"Wo ist die Toilette?"})
A("i-dont-know","phrase","phrase","frontier","I don't know",
  {"en":"I don't know","es":"no sé","fr":"je ne sais pas","it":"non lo so","pt":"não sei","de":"ich weiß nicht","la":"nescio"},
  {"en":"Sorry, I don't know.","es":"Perdón, no sé.","fr":"Désolé, je ne sais pas.","it":"Scusa, non lo so.","de":"Sorry, ich weiß nicht."})


# ----------------------------------------------------------------------------
# Materialize tuples -> atom dicts, attaching IPA from the subset where missing.
# ----------------------------------------------------------------------------
def make_form(lang, spec):
    word = spec; gender = None; hand_ipa = None
    if isinstance(spec, tuple):
        if len(spec) == 2: word, gender = spec
        elif len(spec) >= 3: word, gender, hand_ipa = spec[0], spec[1], spec[2]
    f = {"word": word}
    ipa = hand_ipa or ipa_for(lang, word)
    if ipa: f["ipa"] = ipa
    if gender: f["gender"] = gender
    return f

def build_new():
    out = []
    for (id, cat, pos, shell, gloss, forms, examples, note, requires) in D:
        atom = {
            "id": id, "gloss": gloss, "category": cat, "pos": pos,
            "shell": shell, "requires": requires,
            "forms": {l: make_form(l, forms[l]) for l in LANGS},
        }
        if note: atom["note"] = note
        if examples: atom["example"] = {l: s for l, s in examples.items() if s}
        out.append(atom)
    return out

# ----------------------------------------------------------------------------
def main():
    corpus = json.load(open(CORPUS))
    existing = corpus["atoms"]
    existing_ids = {a["id"] for a in existing}
    new = build_new()

    # validate
    errs = []
    seen = set()
    word_re_cache = {}
    for a in new:
        i = a["id"]
        if i in seen: errs.append(f"dup new id {i}")
        seen.add(i)
        if i in existing_ids: errs.append(f"new id collides with existing {i}")
        if not a.get("gloss"): errs.append(f"{i}: no gloss")
        for l in LANGS:
            if not a["forms"].get(l, {}).get("word"):
                errs.append(f"{i}: missing forms.{l}.word")
        ex = a.get("example", {})
        for l in ["en", "es", "fr", "it", "de"]:
            if l not in ex: errs.append(f"{i}: missing required example.{l}")
        for l, sent in ex.items():
            w = a["forms"].get(l, {}).get("word")
            if w and sent:
                pat = re.compile(r"(^|[^0-9A-Za-zÀ-ɏ'])" + re.escape(w) + r"(?=$|[^0-9A-Za-zÀ-ɏ])", re.I)
                if not pat.search(sent):
                    errs.append(f"{i}: example.{l} lacks word {w!r}: {sent!r}")
    allids = existing_ids | seen
    for a in new:
        for r in a.get("requires", []):
            if r not in allids: errs.append(f"{a['id']}: requires unknown id {r}")

    if errs:
        print(f"VALIDATION FAILED ({len(errs)} errors):")
        for e in errs: print("  -", e)
        sys.exit(1)

    merged = existing + new
    corpus["atoms"] = merged
    corpus["meta"]["version"] = "0.2.0"
    corpus["meta"]["title"] = "Polyglot Core — a beginner course across 7 languages"
    corpus["meta"]["license"] = (
        "Translations & IPA are facts cross-checked against Wiktionary (CC-BY-SA, "
        "attributed via Kaikki); example sentences are original and beginner-simple."
    )
    json.dump(corpus, open(CORPUS, "w"), ensure_ascii=False, indent=2)
    open(CORPUS, "a").write("\n")
    import collections
    cats = collections.Counter(a.get("category", "?") for a in merged)
    print(f"OK: {len(existing)} existing + {len(new)} new = {len(merged)} atoms x {len(LANGS)} languages")
    print("categories:", dict(sorted(cats.items())))

if __name__ == "__main__":
    main()
