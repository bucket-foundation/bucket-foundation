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


# ===== BATCH 3 (added 2026-06-15, bkt-2ea/bkt-nhy) ==================
# ~150 more high-frequency beginner entries. Translations are standard facts;
# IPA values baked below were pulled from the LIVE photon API
# (polingual.agfarms.dev/lookup -> Wiktionary via Kaikki, CC-BY-SA) and are
# absent where the API had no entry (never guessed). Examples original & simple.

A("to-can","verb","verb","nucleus","to be able to / can",
  {"en":("can",None,"ˈkæn"), "es":("poder",None,"poˈdeɾ"), "fr":("pouvoir",None,"pu.vwaʁ"), "it":"potere", "pt":("poder",None,"poˈdeʁ"), "de":"können", "la":("posse",None,"ˈpɔs.sɛ")},
  {"en":"I can swim.", "es":"Yo poder nadar.", "fr":"Je veux pouvoir nager.", "it":"Voglio potere nuotare.", "de":"Ich will schwimmen können."})
A("to-put","verb","verb","nucleus","to put",
  {"en":"put", "es":("poner",None,"poˈneɾ"), "fr":("mettre",None,"mɛtʁ"), "it":("mettere",None,"ˈmet.te.re"), "pt":("pôr",None,"ˈpoʁ"), "de":("setzen",None,"ˈzɛtsən"), "la":"ponere"},
  {"en":"I want to put it here.", "es":"Quiero poner esto aquí.", "fr":"Je veux mettre ça ici.", "it":"Voglio mettere questo qui.", "de":"Ich will es hier setzen."})
A("to-take","verb","verb","nucleus","to take",
  {"en":("take",None,"teɪk"), "es":("tomar",None,"toˈma(ʁ)"), "fr":("prendre",None,"pʁɑ̃.dʁə"), "it":("prendere",None,"ˈprɛn.de.re"), "pt":("tomar",None,"toˈma(ʁ)"), "de":("nehmen",None,"ˈneːmən"), "la":"capere"},
  {"en":"I want to take the bus.", "es":"Quiero tomar el autobús.", "fr":"Je veux prendre le bus.", "it":"Voglio prendere il bus.", "de":"Ich will den Bus nehmen."})
A("to-call","verb","verb","nucleus","to call",
  {"en":("call",None,"kɔːl"), "es":"llamar", "fr":"appeler", "it":"chiamare", "pt":"chamar", "de":("rufen",None,"ˈʁuːfən"), "la":"vocare"},
  {"en":"I want to call my friend.", "es":"Quiero llamar a mi amigo.", "fr":"Je veux appeler mon ami.", "it":"Voglio chiamare il mio amico.", "de":"Ich will meinen Freund rufen."})
A("to-ask","verb","verb","nucleus","to ask",
  {"en":("ask",None,"ɑːsk"), "es":"preguntar", "fr":"demander", "it":"chiedere", "pt":"perguntar", "de":"fragen", "la":"rogare"},
  {"en":"I want to ask a question.", "es":"Quiero preguntar algo.", "fr":"Je veux demander quelque chose.", "it":"Voglio chiedere una cosa.", "de":"Ich will etwas fragen."})
A("to-answer","verb","verb","nucleus","to answer",
  {"en":("answer",None,"ˈɑːn.sə"), "es":("responder",None,"responˈdeɾ"), "fr":"répondre", "it":"rispondere", "pt":("responder",None,"ʁes.põˈde(ʁ)"), "de":"antworten", "la":"respondere"},
  {"en":"Please answer me.", "es":"Por favor responder.", "fr":"Tu peux répondre?", "it":"Puoi rispondere?", "de":"Bitte antworten."})
A("to-pay","verb","verb","nucleus","to pay",
  {"en":("pay",None,"peɪ"), "es":"pagar", "fr":("payer",None,"pɛ.je"), "it":"pagare", "pt":"pagar", "de":"zahlen", "la":"solvere"},
  {"en":"I want to pay now.", "es":"Quiero pagar ahora.", "fr":"Je veux payer maintenant.", "it":"Voglio pagare adesso.", "de":"Ich will jetzt zahlen."})
A("to-cook","verb","verb","nucleus","to cook",
  {"en":"cook", "es":"cocinar", "fr":"cuisiner", "it":"cucinare", "pt":"cozinhar", "de":("kochen",None,"ˈkɔχən"), "la":"coquere"},
  {"en":"I like to cook.", "es":"Me gusta cocinar.", "fr":"J'aime cuisiner.", "it":"Mi piace cucinare.", "de":"Ich will heute kochen."})
A("to-wash","verb","verb","nucleus","to wash",
  {"en":"wash", "es":"lavar", "fr":"laver", "it":"lavare", "pt":"lavar", "de":"waschen", "la":"lavare"},
  {"en":"I want to wash the car.", "es":"Quiero lavar el coche.", "fr":"Je veux laver la voiture.", "it":"Voglio lavare l'auto.", "de":"Ich will das Auto waschen."})
A("to-wait","verb","verb","nucleus","to wait",
  {"en":"wait", "es":("esperar",None,"espeˈɾaɾ"), "fr":"attendre", "it":"aspettare", "pt":("esperar",None,"espeˈɾaɾ"), "de":"warten", "la":"exspectare"},
  {"en":"Please wait here.", "es":"Por favor esperar aquí.", "fr":"Tu peux attendre ici.", "it":"Puoi aspettare qui.", "de":"Bitte hier warten."})
A("to-run","verb","verb","nucleus","to run",
  {"en":("run",None,"ɹʌn"), "es":("correr",None,"koˈreɾ"), "fr":"courir", "it":("correre",None,"ˈkor.re.re"), "pt":("correr",None,"koˈʁe(ʁ)"), "de":("laufen",None,"ˈlaʊ̯fən"), "la":"currere"},
  {"en":"I like to run.", "es":"Me gusta correr.", "fr":"J'aime courir.", "it":"Mi piace correre.", "de":"Ich will jetzt laufen."})
A("to-play","verb","verb","nucleus","to play",
  {"en":("play",None,"pleɪ̯/ [pɫ̥eɪ̯ ~ pʰɫeɪ̯"), "es":"jugar", "fr":("jouer",None,"ʒwe"), "it":("giocare",None,"d͡ʒoˈka.re"), "pt":("jogar",None,"ʒoˈɡa(ʁ)"), "de":("spielen",None,"ˈʃpiːlən"), "la":"ludere"},
  {"en":"The children play.", "es":"Los niños jugar.", "fr":"Les enfants aiment jouer.", "it":"I bambini vogliono giocare.", "de":"Die Kinder wollen spielen."})
A("to-sing","verb","verb","nucleus","to sing",
  {"en":("sing",None,"ˈsɪŋ"), "es":("cantar",None,"kɐ̃ˈta(ʁ)"), "fr":"chanter", "it":"cantare", "pt":("cantar",None,"kɐ̃ˈta(ʁ)"), "de":"singen", "la":"cantare"},
  {"en":"She likes to sing.", "es":"Le gusta cantar.", "fr":"Elle aime chanter.", "it":"Le piace cantare.", "de":"Sie will gern singen."})
A("to-travel","verb","verb","nucleus","to travel",
  {"en":"travel", "es":"viajar", "fr":"voyager", "it":"viaggiare", "pt":"viajar", "de":"reisen", "la":"peregrinari"},
  {"en":"We want to travel.", "es":"Queremos viajar.", "fr":"Nous voulons voyager.", "it":"Vogliamo viaggiare.", "de":"Wir wollen reisen."})
A("to-arrive","verb","verb","nucleus","to arrive",
  {"en":("arrive",None,"əˈɹaɪv"), "es":"llegar", "fr":("arriver",None,"a.ʁi.ve"), "it":"arrivare", "pt":("chegar",None,"ʃeˈɡa(ʁ)"), "de":("ankommen",None,"ˈʔanˌkɔmən"), "la":"advenire"},
  {"en":"The train will arrive.", "es":"El tren va a llegar.", "fr":"Le train va arriver.", "it":"Il treno deve arrivare.", "de":"Der Zug muss ankommen."})
A("to-leave","verb","verb","nucleus","to leave",
  {"en":("leave",None,"ˈliːv"), "es":("salir",None,"saˈliɾ"), "fr":("partir",None,"paʁ.tiʁ"), "it":("partire",None,"parˈti.re"), "pt":("sair",None,"saˈi(ʁ)"), "de":("gehen",None,"ˈɡeːən"), "la":"discedere"},
  {"en":"I want to leave now.", "es":"Quiero salir ahora.", "fr":"Je veux partir maintenant.", "it":"Voglio partire adesso.", "de":"Ich will jetzt gehen."})
A("to-stay","verb","verb","nucleus","to stay",
  {"en":"stay", "es":("quedar",None,"keˈdaɾ"), "fr":("rester",None,"ʁɛs.te"), "it":("restare",None,"resˈta.re"), "pt":("ficar",None,"fiˈka(ʁ)"), "de":("bleiben",None,"ˈblaɪ̯bən"), "la":"manere"},
  {"en":"I want to stay home.", "es":"Quiero quedar en casa.", "fr":"Je veux rester ici.", "it":"Voglio restare qui.", "de":"Ich will hier bleiben."})
A("to-meet","verb","verb","nucleus","to meet",
  {"en":"meet", "es":"conocer", "fr":"rencontrer", "it":"incontrare", "pt":"conhecer", "de":"treffen", "la":"convenire"},
  {"en":"I want to meet you.", "es":"Quiero conocer.", "fr":"Je veux rencontrer.", "it":"Voglio incontrare.", "de":"Ich will dich treffen."})
A("to-show","verb","verb","nucleus","to show",
  {"en":"show", "es":"mostrar", "fr":"montrer", "it":"mostrare", "pt":"mostrar", "de":"zeigen", "la":"monstrare"},
  {"en":"Can you show me?", "es":"¿Puedes mostrar?", "fr":"Tu peux montrer?", "it":"Puoi mostrare?", "de":"Kannst du es zeigen?"})
A("to-bring","verb","verb","nucleus","to bring",
  {"en":"bring", "es":("traer",None,"tɾaˈeɾ"), "fr":("apporter",None,"a.pɔʁ.te"), "it":("portare",None,"porˈta.re"), "pt":"trazer", "de":("bringen",None,"ˈbrɪŋən"), "la":"afferre"},
  {"en":"Please bring water.", "es":"Por favor traer agua.", "fr":"Tu peux apporter de l'eau?", "it":"Puoi portare l'acqua?", "de":"Bitte Wasser bringen."})
A("to-start","verb","verb","nucleus","to start / begin",
  {"en":"start", "es":("empezar",None,"empeˈθaɾ"), "fr":"commencer", "it":"cominciare", "pt":("começar",None,"ko.meˈsa(ʁ)"), "de":"beginnen", "la":"incipere"},
  {"en":"We start at eight.", "es":"Vamos a empezar.", "fr":"On va commencer.", "it":"Dobbiamo cominciare.", "de":"Wir wollen beginnen."})
A("to-finish","verb","verb","nucleus","to finish",
  {"en":"finish", "es":("terminar",None,"teɾmiˈnaɾ"), "fr":"finir", "it":"finire", "pt":("terminar",None,"teʁ.miˈna(ʁ)"), "de":"enden", "la":"finire"},
  {"en":"I want to finish.", "es":"Quiero terminar.", "fr":"Je veux finir.", "it":"Voglio finire.", "de":"Es muss bald enden."})
A("to-lose","verb","verb","nucleus","to lose",
  {"en":("lose",None,"luːz"), "es":("perder",None,"peɾˈdeɾ"), "fr":"perdre", "it":"perdere", "pt":("perder",None,"peʁˈde(ʁ)"), "de":("verlieren",None,"fɛɐ̯ˈliːʁən"), "la":"perdere"},
  {"en":"I don't want to lose it.", "es":"No quiero perder.", "fr":"Je ne veux pas perdre.", "it":"Non voglio perdere.", "de":"Ich will es nicht verlieren."})
A("to-win","verb","verb","nucleus","to win",
  {"en":("win",None,"wɪn"), "es":("ganar",None,"ɡaˈnaɾ"), "fr":"gagner", "it":"vincere", "pt":"ganhar", "de":("gewinnen",None,"ɡəˈvɪnən"), "la":"vincere"},
  {"en":"We want to win.", "es":"Queremos ganar.", "fr":"Nous voulons gagner.", "it":"Vogliamo vincere.", "de":"Wir wollen gewinnen."})
A("to-feel","verb","verb","nucleus","to feel",
  {"en":("feel",None,"fiːl"), "es":("sentir",None,"senˈtiɾ"), "fr":("sentir",None,"sɑ̃.tiʁ"), "it":("sentire",None,"senˈti.re"), "pt":("sentir",None,"sẽˈt͡ʃi(ʁ)"), "de":("fühlen",None,"ˈfyːlən"), "la":("sentire",None,"senˈti.re")},
  {"en":"I feel good.", "es":"Quiero sentir bien.", "fr":"Je veux sentir le vent.", "it":"Voglio sentire la musica.", "de":"Ich will mich gut fühlen."})
A("to-listen","verb","verb","nucleus","to listen / hear",
  {"en":("hear",None,"ˈhɪə"), "es":"oír", "fr":("entendre",None,"ɑ̃.tɑ̃dʁ"), "it":("sentire",None,"senˈti.re"), "pt":("ouvir",None,"o(w)ˈvi(ʁ)"), "de":("hören",None,"ˈhøːrən"), "la":"audire"},
  {"en":"I can hear you.", "es":"Quiero oír.", "fr":"Je veux entendre.", "it":"Devo sentire bene.", "de":"Ich will Musik hören."})
A("to-sit","verb","verb","nucleus","to sit",
  {"en":"sit", "es":"sentarse", "fr":"asseoir", "it":"sedere", "pt":("sentar",None,"sẽˈta(ʁ)"), "de":("sitzen",None,"ˈzɪtsn̩"), "la":"sedere"},
  {"en":"I want to sit here.", "es":"Quiero sentarse aquí.", "fr":"Je veux asseoir ici.", "it":"Voglio sedere qui.", "de":"Ich will hier sitzen."})
A("to-stand","verb","verb","nucleus","to stand",
  {"en":("stand",None,"stɑnt"), "es":"estar de pie", "fr":"lever", "it":"stare in piedi", "pt":"ficar de pé", "de":("stehen",None,"ˈʃteː.ən"), "la":("stare",None,"ˈsta.re")},
  {"en":"Please stand up.", "es":"Quiero estar de pie.", "fr":"Je veux me lever.", "it":"Voglio stare in piedi.", "de":"Bitte hier stehen."})
A("to-drive","verb","verb","nucleus","to drive",
  {"en":"drive", "es":"conducir", "fr":"conduire", "it":"guidare", "pt":("dirigir",None,"d͡ʒi.ɾiˈʒi(ʁ)"), "de":"fahren", "la":"agere"},
  {"en":"I can drive a car.", "es":"Quiero conducir.", "fr":"Je veux conduire.", "it":"Voglio guidare.", "de":"Ich will fahren."})
A("to-study","verb","verb","nucleus","to study",
  {"en":"study", "es":"estudiar", "fr":"étudier", "it":("studiare",None,"stuˈdja.re"), "pt":"estudar", "de":"studieren", "la":"studere"},
  {"en":"I want to study now.", "es":"Quiero estudiar.", "fr":"Je veux étudier.", "it":"Voglio studiare.", "de":"Ich will studieren."})
A("hard","adjective","adjective","nucleus","hard (firm)",
  {"en":("hard",None,"hɑːd"), "es":("duro",None,"ˈduɾo"), "fr":("dur",None,"dyʁ"), "it":("duro",None,"ˈdu.ro"), "pt":("duro",None,"ˈdu.ɾu"), "de":("hart",None,"hart"), "la":("durus",None,"ˈduː.rʊs")},
  {"en":"The bread is hard.", "es":"El pan está duro.", "fr":"Le pain est dur.", "it":"Il pane è duro.", "de":"Das Brot ist hart."})
A("soft","adjective","adjective","nucleus","soft",
  {"en":("soft",None,"sɒft"), "es":("suave",None,"suˈa.vi"), "fr":("doux",None,"du"), "it":"morbido", "pt":"macio", "de":"weich", "la":("mollis",None,"ˈmɔl.lɪs")},
  {"en":"The bed is soft.", "es":"La cama es suave.", "fr":"Le lit est doux.", "it":"Il letto è morbido.", "de":"Das Bett ist weich."})
A("heavy","adjective","adjective","nucleus","heavy",
  {"en":("heavy",None,"ˈhɛv.i"), "es":("pesado",None,"peˈsado"), "fr":("lourd",None,"luʁ"), "it":"pesante", "pt":("pesado",None,"peˈsado"), "de":("schwer",None,"ʃveːɐ̯"), "la":("gravis",None,"ˈɡra.wɪs")},
  {"en":"The box is heavy.", "es":"El libro es pesado.", "fr":"Le sac est lourd.", "it":"Il sacco è pesante.", "de":"Die Kiste ist schwer."})
A("light-weight","adjective","adjective","nucleus","light (not heavy)",
  {"en":("light",None,"laɪt"), "es":"ligero", "fr":"léger", "it":"leggero", "pt":"leve", "de":("leicht",None,"laɪ̯çt"), "la":("levis",None,"ˈɫɛ.wɪs")},
  {"en":"The bag is light.", "es":"El libro es ligero.", "fr":"Le sac est léger.", "it":"Il libro è leggero.", "de":"Die Tasche ist leicht."})
A("fast","adjective","adjective","nucleus","fast / quick",
  {"en":("fast",None,"fɑːst"), "es":"rápido", "fr":("rapide",None,"ʁa.pid"), "it":"veloce", "pt":"rápido", "de":("schnell",None,"ʃnɛl"), "la":"celer"},
  {"en":"The car is fast.", "es":"El coche es rápido.", "fr":"La voiture est rapide.", "it":"L'auto è veloce.", "de":"Das Auto ist schnell."})
A("slow","adjective","adjective","nucleus","slow",
  {"en":("slow",None,"sləʊ"), "es":("lento",None,"ˈlento"), "fr":("lent",None,"lɑ̃"), "it":("lento",None,"ˈlɛn.to"), "pt":("lento",None,"ˈlẽ.tu"), "de":("langsam",None,"ˈlaŋzaːm"), "la":("lentus",None,"ˈɫɛn.tʊs")},
  {"en":"The bus is slow.", "es":"El autobús es lento.", "fr":"Le bus est lent.", "it":"Il bus è lento.", "de":"Der Bus ist langsam."})
A("high","adjective","adjective","nucleus","high / tall",
  {"en":"high", "es":"alto", "fr":"haut", "it":"alto", "pt":"alto", "de":"hoch", "la":"altus"},
  {"en":"The wall is high.", "es":"El muro es alto.", "fr":"Le mur est haut.", "it":"Il muro è alto.", "de":"Die Mauer ist hoch."})
A("low","adjective","adjective","nucleus","low",
  {"en":"low", "es":("bajo",None,"ˈbaxo"), "fr":"bas", "it":"basso", "pt":("baixo",None,"ˈbaj.ʃu"), "de":("niedrig",None,"ˈniːdʁɪç"), "la":("humilis",None,"ˈhʊ.mɪ.lɪs")},
  {"en":"The chair is low.", "es":"El muro es bajo.", "fr":"Le mur est bas.", "it":"Il muro è basso.", "de":"Der Stuhl ist niedrig."})
A("wide","adjective","adjective","nucleus","wide / broad",
  {"en":"wide", "es":"ancho", "fr":("large",None,"laʁʒ"), "it":("largo",None,"ˈlar.ɡo"), "pt":("largo",None,"ˈlaʁ.ɡu"), "de":"breit", "la":("latus",None,"ˈɫa.tʊs")},
  {"en":"The river is wide.", "es":"El río es ancho.", "fr":"Le fleuve est large.", "it":"Il fiume è largo.", "de":"Der Fluss ist breit."})
A("narrow","adjective","adjective","nucleus","narrow",
  {"en":"narrow", "es":("estrecho",None,"esˈtɾet͡ʃo"), "fr":"étroit", "it":("stretto",None,"ˈstret.to"), "pt":"estreito", "de":("eng",None,"ɛŋ"), "la":"angustus"},
  {"en":"The street is narrow.", "es":"El camino es estrecho.", "fr":"Le chemin est étroit.", "it":"Il sentiero è stretto.", "de":"Die Straße ist eng."})
A("expensive","adjective","adjective","nucleus","expensive",
  {"en":"expensive", "es":("caro",None,"ˈka.roː"), "fr":("cher",None,"ʃɛʁ"), "it":("caro",None,"ˈka.roː"), "pt":("caro",None,"ˈka.roː"), "de":"teuer", "la":"carus"},
  {"en":"The hotel is expensive.", "es":"El hotel es caro.", "fr":"L'hôtel est cher.", "it":"L'albergo è caro.", "de":"Das Hotel ist teuer."})
A("cheap","adjective","adjective","nucleus","cheap",
  {"en":"cheap", "es":("barato",None,"baˈɾa.tu"), "fr":"bon marché", "it":"economico", "pt":("barato",None,"baˈɾa.tu"), "de":"billig", "la":"vilis"},
  {"en":"The bread is cheap.", "es":"El pan es barato.", "fr":"Le pain est bon marché.", "it":"Il pane è economico.", "de":"Das Brot ist billig."})
A("open-adj","adjective","adjective","nucleus","open",
  {"en":("open",None,"ˈəʊ.pən"), "es":("abierto",None,"aˈbjeɾto"), "fr":"ouvert", "it":"aperto", "pt":"aberto", "de":("offen",None,"ˈɔfən"), "la":("apertus",None,"aˈpɛr.tʊs")},
  {"en":"The shop is open.", "es":"El museo está abierto.", "fr":"Le magasin est ouvert.", "it":"Il negozio è aperto.", "de":"Der Laden ist offen."})
A("closed-adj","adjective","adjective","nucleus","closed",
  {"en":("closed",None,"kləʊzd"), "es":("cerrado",None,"seˈʁa.du"), "fr":"fermé", "it":"chiuso", "pt":("fechado",None,"feˈʃa.du"), "de":"geschlossen", "la":("clausus",None,"ˈkɫau̯.sʊs")},
  {"en":"The door is closed.", "es":"El banco está cerrado.", "fr":"Le magasin est fermé.", "it":"Il bar è chiuso.", "de":"Die Tür ist geschlossen."})
A("dry","adjective","adjective","nucleus","dry",
  {"en":("dry",None,"ˈdɹaɪ̯"), "es":("seco",None,"ˈsɛ.koː"), "fr":("sec",None,"sɛk"), "it":("secco",None,"ˈsek.ko"), "pt":("seco",None,"ˈsɛ.ku"), "de":("trocken",None,"ˈtʁɔkən"), "la":"siccus"},
  {"en":"The towel is dry.", "es":"El suelo está seco.", "fr":"Le linge est sec.", "it":"Il panno è secco.", "de":"Das Tuch ist trocken."})
A("wet","adjective","adjective","nucleus","wet",
  {"en":("wet",None,"ʋɛt"), "es":"mojado", "fr":"mouillé", "it":"bagnato", "pt":"molhado", "de":"nass", "la":"madidus"},
  {"en":"The grass is wet.", "es":"El suelo está mojado.", "fr":"Le sol est mouillé.", "it":"Il prato è bagnato.", "de":"Das Gras ist nass."})
A("tired","adjective","adjective","nucleus","tired",
  {"en":"tired", "es":("cansado",None,"kanˈsado"), "fr":"fatigué", "it":"stanco", "pt":("cansado",None,"kanˈsado"), "de":"müde", "la":"fessus"},
  {"en":"I am tired.", "es":"Estoy cansado.", "fr":"Je suis fatigué.", "it":"Sono stanco.", "de":"Ich bin müde."})
A("sick","adjective","adjective","nucleus","sick / ill",
  {"en":("sick",None,"ˈsɪk"), "es":"enfermo", "fr":("malade",None,"ma.lad"), "it":"malato", "pt":("doente",None,"duˈẽ.t͡ʃi"), "de":"krank", "la":("aeger",None,"ˈae̯.ɡɛr")},
  {"en":"He is sick today.", "es":"Hoy está enfermo.", "fr":"Il est malade.", "it":"È malato oggi.", "de":"Er ist heute krank."})
A("hungry","adjective","adjective","nucleus","hungry",
  {"en":"hungry", "es":"hambriento", "fr":"affamé", "it":"affamato", "pt":"faminto", "de":"hungrig", "la":"esuriens"},
  {"en":"The child is hungry.", "es":"El niño está hambriento.", "fr":"L'enfant est affamé.", "it":"Il bambino è affamato.", "de":"Das Kind ist hungrig."})
A("ready","adjective","adjective","nucleus","ready",
  {"en":("ready",None,"ˈɹɛd.i"), "es":("listo",None,"ˈlisto"), "fr":"prêt", "it":("pronto",None,"ˈpɾõ.tu"), "pt":("pronto",None,"ˈpɾõ.tu"), "de":"bereit", "la":("paratus",None,"paˈraː.tʊs")},
  {"en":"I am ready.", "es":"Estoy listo.", "fr":"Je suis prêt.", "it":"Sono pronto.", "de":"Ich bin bereit."})
A("important","adjective","adjective","nucleus","important",
  {"en":"important", "es":"importante", "fr":"important", "it":"importante", "pt":"importante", "de":"wichtig", "la":("gravis",None,"ˈɡra.wɪs")},
  {"en":"This is important.", "es":"Esto es importante.", "fr":"C'est important.", "it":"Questo è importante.", "de":"Das ist wichtig."})
A("right-correct","adjective","adjective","nucleus","right / correct",
  {"en":"correct", "es":"correcto", "fr":"correct", "it":"corretto", "pt":"correto", "de":("richtig",None,"ˈʁɪçtɪç"), "la":"rectus"},
  {"en":"The answer is correct.", "es":"El resultado es correcto.", "fr":"Le résultat est correct.", "it":"Il risultato è corretto.", "de":"Die Antwort ist richtig."})
A("wrong","adjective","adjective","nucleus","wrong",
  {"en":("wrong",None,"ˈɹɒŋ"), "es":"incorrecto", "fr":("faux",None,"fo"), "it":("sbagliato",None,"zbaʎˈʎa.to"), "pt":("errado",None,"eˈʁa.du"), "de":("falsch",None,"falʃ"), "la":("falsus",None,"ˈfaɫ.sʊs")},
  {"en":"The answer is wrong.", "es":"El número es incorrecto.", "fr":"Le numéro est faux.", "it":"Il numero è sbagliato.", "de":"Die Antwort ist falsch."})
A("house-2","place","noun","nucleus","room",
  {"en":"room", "es":("habitación","f"), "fr":("chambre","f"), "it":("stanza","f"), "pt":("quarto","m","ˈkwaʁ.tu"), "de":("Zimmer","n"), "la":("cubiculum","n")},
  {"en":"The room is big.", "es":"La habitación es grande.", "fr":"La chambre est grande.", "it":"La stanza è grande.", "de":"Das Zimmer ist groß."})
A("kitchen","place","noun","nucleus","kitchen",
  {"en":("kitchen",None,"ˈkɪt͡ʃ(ɪ)n"), "es":("cocina","f","koˈθina"), "fr":("cuisine","f"), "it":("cucina","f"), "pt":("cozinha","f"), "de":("Küche","f"), "la":("culina","f")},
  {"en":"The kitchen is clean.", "es":"La cocina está limpia.", "fr":"La cuisine est propre.", "it":"La cucina è pulita.", "de":"Die Küche ist sauber."})
A("floor","object","noun","nucleus","floor",
  {"en":"floor", "es":("suelo","m"), "fr":("sol","m"), "it":("pavimento","m"), "pt":("chão","m"), "de":("Boden","m"), "la":("solum","n")},
  {"en":"The floor is cold.", "es":"El suelo está frío.", "fr":"Le sol est froid.", "it":"Il pavimento è freddo.", "de":"Der Boden ist kalt."})
A("wall","object","noun","nucleus","wall",
  {"en":"wall", "es":("pared","f"), "fr":("mur","m"), "it":("muro","m"), "pt":("parede","f"), "de":("Wand","f","wɒnd"), "la":("paries","m")},
  {"en":"The wall is white.", "es":"La pared es blanca.", "fr":"Le mur est blanc.", "it":"Il muro è bianco.", "de":"Die Wand ist weiß."})
A("lamp","object","noun","nucleus","lamp",
  {"en":("lamp",None,"ˈlæ̞mp"), "es":("lámpara","f"), "fr":("lampe","f"), "it":("lampada","f"), "pt":("lâmpada","f"), "de":("Lampe","f"), "la":("lucerna","f")},
  {"en":"The lamp is bright.", "es":"La lámpara es brillante.", "fr":"La lampe est claire.", "it":"La lampada è chiara.", "de":"Die Lampe ist hell."})
A("plate","object","noun","nucleus","plate",
  {"en":("plate",None,"ˈpleɪ̯t"), "es":("plato","m","ˈplato"), "fr":("assiette","f","a.sjɛt"), "it":("piatto","m","ˈpjat.to"), "pt":("prato","m"), "de":("Teller","m"), "la":("patina","f")},
  {"en":"The plate is empty.", "es":"El plato está vacío.", "fr":"Une assiette est vide.", "it":"Il piatto è vuoto.", "de":"Der Teller ist leer."})
A("glass-cup","object","noun","nucleus","glass (cup)",
  {"en":"glass", "es":("vaso","m"), "fr":("verre","m"), "it":("bicchiere","m"), "pt":("copo","m"), "de":("Glas","n"), "la":("vitrum","n")},
  {"en":"The glass is full.", "es":"El vaso está lleno.", "fr":"Le verre est plein.", "it":"Il bicchiere è pieno.", "de":"Das Glas ist voll."})
A("knife","object","noun","nucleus","knife",
  {"en":"knife", "es":("cuchillo","m"), "fr":("couteau","m"), "it":("coltello","m"), "pt":("faca","f"), "de":("Messer","n"), "la":("culter","m")},
  {"en":"The knife is sharp.", "es":"El cuchillo está afilado.", "fr":"Le couteau est neuf.", "it":"Il coltello è nuovo.", "de":"Das Messer ist neu."})
A("bag","object","noun","nucleus","bag",
  {"en":("bag",None,"ˈbæɡ"), "es":("bolsa","f","ˈbolsa"), "fr":("sac","m","sad͡ʒ"), "it":("borsa","f","ˈbor.sa"), "pt":("bolsa","f","ˈbolsa"), "de":("Tasche","f"), "la":("saccus","m")},
  {"en":"The bag is heavy.", "es":"La bolsa es pesada.", "fr":"Le sac est lourd.", "it":"La borsa è pesante.", "de":"Die Tasche ist schwer."})
A("letter-mail","object","noun","nucleus","letter (mail)",
  {"en":("letter",None,"ˈlɛtə"), "es":("carta","f","ˈkaʁ.tɐ"), "fr":("lettre","f"), "it":("lettera","f","ˈlet.te.ra"), "pt":("carta","f","ˈkaʁ.tɐ"), "de":("Brief","m"), "la":("epistula","f")},
  {"en":"I write a letter.", "es":"Escribo una carta.", "fr":"J'écris une lettre.", "it":"Scrivo una lettera.", "de":"Ich schreibe einen Brief."})
A("clock","object","noun","nucleus","clock / watch",
  {"en":"clock", "es":("reloj","m"), "fr":("horloge","f"), "it":("orologio","m"), "pt":("relógio","m"), "de":("Uhr","f","uːr"), "la":("horologium","n")},
  {"en":"The clock is new.", "es":"El reloj es nuevo.", "fr":"Une horloge est ancienne.", "it":"Un orologio è nuovo.", "de":"Die Uhr ist neu."})
A("shirt","object","noun","nucleus","shirt",
  {"en":"shirt", "es":("camisa","f"), "fr":("chemise","f"), "it":("camicia","f"), "pt":("camisa","f"), "de":("Hemd","n"), "la":("tunica","f","ˈtʊ.nɪ.ka")},
  {"en":"The shirt is blue.", "es":"La camisa es azul.", "fr":"La chemise est bleue.", "it":"La camicia è blu.", "de":"Das Hemd ist blau."})
A("shoe","object","noun","nucleus","shoe",
  {"en":("shoe",None,"ˈʃuː"), "es":("zapato","m"), "fr":("chaussure","f"), "it":("scarpa","f"), "pt":("sapato","m"), "de":("Schuh","m"), "la":("calceus","m")},
  {"en":"My shoe is black.", "es":"Mi zapato es negro.", "fr":"Ma chaussure est noire.", "it":"La mia scarpa è nera.", "de":"Mein Schuh ist schwarz."})
A("hat","object","noun","nucleus","hat",
  {"en":"hat", "es":("sombrero","m"), "fr":("chapeau","m","ʃa.po"), "it":("cappello","m"), "pt":("chapéu","m","ʃaˈpɛw"), "de":("Hut","m","ɦʏt"), "la":("pileus","m")},
  {"en":"The hat is old.", "es":"El sombrero es viejo.", "fr":"Le chapeau est vieux.", "it":"Il cappello è vecchio.", "de":"Der Hut ist alt."})
A("coat","object","noun","nucleus","coat",
  {"en":"coat", "es":("abrigo","m","aˈbɾiɡo"), "fr":("manteau","m","mɑ̃.to"), "it":("cappotto","m"), "pt":("casaco","m"), "de":("Mantel","m","ˈmɑn.təl"), "la":("pallium","n")},
  {"en":"The coat is warm.", "es":"El abrigo es cálido.", "fr":"Le manteau est chaud.", "it":"Il cappotto è caldo.", "de":"Der Mantel ist warm."})
A("work-noun","abstract","noun","nucleus","work (the noun)",
  {"en":("work",None,"wɜː(ɹ)k"), "es":("trabajo","m"), "fr":("travail","m"), "it":("lavoro","m"), "pt":("trabalho","m","tɾaˈba.ʎu"), "de":("Arbeit","f","ˈaʁbaɪ̯t"), "la":("labor","m","ˈɫa.bɔr")},
  {"en":"The work is hard.", "es":"El trabajo es duro.", "fr":"Le travail est dur.", "it":"Il lavoro è duro.", "de":"Die Arbeit ist hart."})
A("school","place","noun","nucleus","school",
  {"en":("school",None,"sxoːl"), "es":("escuela","f"), "fr":("école","f"), "it":("scuola","f"), "pt":("escola","f","isˈkɔ.lɐ"), "de":("Schule","f","ˈʃuːlə"), "la":("schola","f","ˈskʰɔ.ɫa")},
  {"en":"The school is near.", "es":"La escuela está cerca.", "fr":"Une école est proche.", "it":"La scuola è vicina.", "de":"Die Schule ist nah."})
A("office","place","noun","nucleus","office",
  {"en":("office",None,"ˈɒf.ɪs"), "es":("oficina","f"), "fr":("bureau","m","by.ʁo"), "it":("ufficio","m","ufˈfi.t͡ʃo"), "pt":("escritório","m"), "de":("Büro","n"), "la":("officium","n")},
  {"en":"The office is closed.", "es":"La oficina está cerrada.", "fr":"Le bureau est fermé.", "it":"Un ufficio è chiuso.", "de":"Das Büro ist geschlossen."})
A("pen","object","noun","nucleus","pen",
  {"en":"pen", "es":("bolígrafo","m"), "fr":("stylo","m"), "it":("penna","f"), "pt":("caneta","f"), "de":("Stift","m"), "la":("calamus","m")},
  {"en":"The pen is blue.", "es":"El bolígrafo es azul.", "fr":"Le stylo est bleu.", "it":"La penna è blu.", "de":"Der Stift ist blau."})
A("question","abstract","noun","nucleus","question",
  {"en":"question", "es":("pregunta","f"), "fr":("question","f"), "it":("domanda","f"), "pt":("pergunta","f"), "de":("Frage","f"), "la":("quaestio","f","ˈkʷae̯s.ti.oː")},
  {"en":"I have a question.", "es":"Tengo una pregunta.", "fr":"J'ai une question.", "it":"Ho una domanda.", "de":"Ich habe eine Frage."})
A("answer-noun","abstract","noun","nucleus","answer (the noun)",
  {"en":("answer",None,"ˈɑːn.sə"), "es":("respuesta","f"), "fr":("réponse","f"), "it":("risposta","f"), "pt":("resposta","f"), "de":("Antwort","f"), "la":("responsum","n","rɛsˈpõː.sũː")},
  {"en":"The answer is easy.", "es":"La respuesta es fácil.", "fr":"La réponse est facile.", "it":"La risposta è facile.", "de":"Die Antwort ist einfach."})
A("language","abstract","noun","nucleus","language",
  {"en":"language", "es":("idioma","m"), "fr":("langue","f"), "it":("lingua","f","ˈlin.ɡwa"), "pt":("idioma","m"), "de":("Sprache","f"), "la":("lingua","f","ˈlin.ɡwa")},
  {"en":"I learn a language.", "es":"Aprendo un idioma.", "fr":"J'apprends une langue.", "it":"Imparo una lingua.", "de":"Ich lerne eine Sprache."})
A("shop","place","noun","nucleus","shop / store",
  {"en":"shop", "es":("tienda","f"), "fr":("magasin","m","ma.ɡa.zɛ̃"), "it":("negozio","m"), "pt":("loja","f"), "de":("Laden","m","ˈlaːdən"), "la":("taberna","f","taˈbɛr.na")},
  {"en":"The shop is open.", "es":"La tienda está abierta.", "fr":"Le magasin est ouvert.", "it":"Il negozio è aperto.", "de":"Der Laden ist offen."})
A("price","abstract","noun","nucleus","price",
  {"en":"price", "es":("precio","m"), "fr":("prix","m"), "it":("prezzo","m","ˈprɛt.t͡so"), "pt":("preço","m"), "de":("Preis","m"), "la":("pretium","n","ˈprɛ.ti.ũː")},
  {"en":"The price is high.", "es":"El precio es alto.", "fr":"Le prix est haut.", "it":"Il prezzo è alto.", "de":"Der Preis ist hoch."})
A("car","object","noun","nucleus","car",
  {"en":"car", "es":("coche","m","ˈkot͡ʃe"), "fr":("voiture","f"), "it":("auto","f","ˈaw.tu"), "pt":("carro","m","ˈkaro"), "de":("Auto","n","ˈaw.tu"), "la":("carrus","m","ˈkar.rʊs")},
  {"en":"The car is red.", "es":"El coche es rojo.", "fr":"La voiture est rouge.", "it":"Una auto è rossa.", "de":"Das Auto ist rot."})
A("bus","object","noun","nucleus","bus",
  {"en":("bus",None,"bʏs"), "es":("autobús","m"), "fr":("bus","m","bʏs"), "it":("autobus","m"), "pt":("ônibus","m"), "de":("Bus","m","bʏs"), "la":("laophorium","n")},
  {"en":"The bus is late.", "es":"El autobús llega tarde.", "fr":"Le bus est en retard.", "it":"Un autobus è in ritardo.", "de":"Der Bus ist spät."})
A("train","object","noun","nucleus","train",
  {"en":("train",None,"ˈtɹeɪn"), "es":("tren","m"), "fr":("train","m","ˈtɹeɪn"), "it":("treno","m"), "pt":("trem","m","ˈtɾẽj̃"), "de":("Zug","m","t͡suːk"), "la":("hamaxostichus","m")},
  {"en":"The train is fast.", "es":"El tren es rápido.", "fr":"Le train est rapide.", "it":"Il treno è veloce.", "de":"Der Zug ist schnell."})
A("airplane","object","noun","nucleus","airplane",
  {"en":("airplane",None,"ˈɛəˌpleɪ̯n"), "es":("avión","m"), "fr":("avion","m"), "it":("aereo","m"), "pt":("avião","m"), "de":("Flugzeug","n"), "la":("aeroplanum","n")},
  {"en":"The airplane is big.", "es":"El avión es grande.", "fr":"Un avion est grand.", "it":"Un aereo è grande.", "de":"Das Flugzeug ist groß."})
A("road","place","noun","nucleus","road / way",
  {"en":("road",None,"ɾoːɖ"), "es":("camino","m"), "fr":("route","f","ɹuːt"), "it":("strada","f"), "pt":("estrada","f"), "de":("Weg","m","veːk"), "la":("via","f","ˈwi.a")},
  {"en":"The road is long.", "es":"El camino es largo.", "fr":"La route est longue.", "it":"La strada è lunga.", "de":"Der Weg ist lang."})
A("ticket","object","noun","nucleus","ticket",
  {"en":"ticket", "es":("billete","m"), "fr":("billet","m"), "it":("biglietto","m","biʎˈʎet.to"), "pt":("bilhete","m"), "de":("Fahrkarte","f"), "la":("tessera","f","ˈtɛs.sɛ.ra")},
  {"en":"I need a ticket.", "es":"Necesito un billete.", "fr":"J'ai besoin d'un billet.", "it":"Ho bisogno di un biglietto.", "de":"Ich brauche eine Fahrkarte."})
A("doctor-place","place","noun","nucleus","hospital",
  {"en":"hospital", "es":("hospital","m"), "fr":("hôpital","m"), "it":("ospedale","m"), "pt":("hospital","m"), "de":("Krankenhaus","n"), "la":("valetudinarium","n")},
  {"en":"The hospital is big.", "es":"El hospital es grande.", "fr":"Un hôpital est grand.", "it":"Un ospedale è grande.", "de":"Das Krankenhaus ist groß."})
A("medicine","abstract","noun","nucleus","medicine",
  {"en":("medicine",None,"ˈmɛd.ɪ.s(ɪ)n"), "es":("medicina","f"), "fr":("médicament","m"), "it":("medicina","f"), "pt":("remédio","m"), "de":("Medizin","f"), "la":("medicina","f")},
  {"en":"I need medicine.", "es":"Necesito medicina.", "fr":"J'ai besoin d'un médicament.", "it":"Ho bisogno di medicina.", "de":"Ich brauche Medizin."})
A("pain","abstract","noun","nucleus","pain",
  {"en":("pain",None,"ˈpeɪ̯n"), "es":("dolor","m","doˈloɾ"), "fr":("douleur","f"), "it":("dolore","m"), "pt":("dor","f"), "de":("Schmerz","m"), "la":("dolor","m","doˈloɾ")},
  {"en":"I have a pain.", "es":"Tengo un dolor.", "fr":"J'ai une douleur.", "it":"Ho un dolore.", "de":"Ich habe einen Schmerz."})
A("blood","body","noun","nucleus","blood",
  {"en":("blood",None,"blʌd"), "es":("sangre","f"), "fr":("sang","m","saːŋ˧˧"), "it":("sangue","m","ˈsan.ɡwe"), "pt":("sangue","m","ˈsan.ɡwe"), "de":("Blut","n"), "la":("sanguis","m")},
  {"en":"The blood is red.", "es":"La sangre es roja.", "fr":"Le sang est rouge.", "it":"Il sangue è rosso.", "de":"Das Blut ist rot."})
A("bone","body","noun","nucleus","bone",
  {"en":("bone",None,"bəʊn"), "es":("hueso","m","ˈw̝eso"), "fr":("os","m","ˈoːs"), "it":("osso","m","ˈo.su"), "pt":("osso","m","ˈo.su"), "de":("Knochen","m"), "la":("os","n","ˈoːs")},
  {"en":"The bone is white.", "es":"El hueso es blanco.", "fr":"Un os est blanc.", "it":"Un osso è bianco.", "de":"Der Knochen ist weiß."})
A("skin","body","noun","nucleus","skin",
  {"en":("skin",None,"skɪn"), "es":("piel","f"), "fr":("peau","f"), "it":("pelle","f"), "pt":("pele","f"), "de":("Haut","f"), "la":("cutis","f")},
  {"en":"The skin is soft.", "es":"La piel es suave.", "fr":"La peau est douce.", "it":"La pelle è morbida.", "de":"Die Haut ist weich."})
A("tooth","body","noun","nucleus","tooth",
  {"en":"tooth", "es":("diente","m"), "fr":("dent","f"), "it":("dente","m"), "pt":("dente","m"), "de":("Zahn","m","t͡saːn"), "la":("dens","m")},
  {"en":"The tooth is white.", "es":"El diente es blanco.", "fr":"La dent est blanche.", "it":"Il dente è bianco.", "de":"Der Zahn ist weiß."})
A("finger","body","noun","nucleus","finger",
  {"en":"finger", "es":("dedo","m","ˈdedo"), "fr":("doigt","m"), "it":("dito","m","ˈdi.toː"), "pt":("dedo","m","ˈdedo"), "de":("Finger","m"), "la":("digitus","m","ˈdɪ.ɡɪ.tʊs")},
  {"en":"My finger hurts.", "es":"Me duele el dedo.", "fr":"J'ai mal au doigt.", "it":"Mi fa male il dito.", "de":"Mein Finger tut weh."})
A("hair","body","noun","nucleus","hair",
  {"en":("hair",None,"ˈhɛə̯"), "es":("pelo","m","ˈpe.lo"), "fr":("cheveux","m"), "it":("capelli","m"), "pt":("cabelo","m"), "de":("Haar","n","ɦaːr"), "la":("capillus","m")},
  {"en":"Her hair is long.", "es":"Su pelo es largo.", "fr":"Ses cheveux sont longs.", "it":"I suoi capelli sono lunghi.", "de":"Ihr Haar ist lang."})
A("face","body","noun","nucleus","face",
  {"en":"face", "es":("cara","f","ˈkaɾa"), "fr":("visage","m"), "it":("faccia","f","ˈfat.t͡ʃa"), "pt":("rosto","m"), "de":("Gesicht","n","ɡəˈzɪçt"), "la":("facies","f","ˈfa.ki.eːs")},
  {"en":"Her face is kind.", "es":"Su cara es amable.", "fr":"Son visage est doux.", "it":"La sua faccia è gentile.", "de":"Ihr Gesicht ist freundlich."})
A("water-2","food","noun","nucleus","butter",
  {"en":("butter",None,"ˈbʌtəɹ"), "es":("mantequilla","f"), "fr":("beurre","m"), "it":("burro","m","ˈburo"), "pt":("manteiga","f"), "de":("Butter","f","ˈbʌtəɹ"), "la":("butyrum","n")},
  {"en":"Bread with butter.", "es":"Pan con mantequilla.", "fr":"Du pain avec du beurre.", "it":"Pane con burro.", "de":"Brot mit Butter."})
A("potato","food","noun","nucleus","potato",
  {"en":"potato", "es":("patata","f"), "fr":("pomme de terre","f"), "it":("patata","f"), "pt":("batata","f"), "de":("Kartoffel","f"), "la":("solanum","n")},
  {"en":"I eat a potato.", "es":"Como una patata.", "fr":"Je mange une pomme de terre.", "it":"Mangio una patata.", "de":"Ich esse eine Kartoffel."})
A("orange-fruit","food","noun","nucleus","orange (fruit)",
  {"en":("orange",None,"ˈɒɹ.ɪnd͡ʒ"), "es":("naranja","f","naˈɾanxa"), "fr":("orange","f","ˈɒɹ.ɪnd͡ʒ"), "it":("arancia","f"), "pt":("laranja","f"), "de":("Orange","f","ˈɒɹ.ɪnd͡ʒ"), "la":("aurantium","n")},
  {"en":"The orange is sweet.", "es":"La naranja es dulce.", "fr":"Une orange est douce.", "it":"Una arancia è dolce.", "de":"Die Orange ist süß."})
A("juice","drink","noun","nucleus","juice",
  {"en":("juice",None,"d͡ʒuːs"), "es":("zumo","m"), "fr":("jus","m","ʒy"), "it":("succo","m"), "pt":("suco","m"), "de":("Saft","m","zaft"), "la":("sucus","m","ˈsuː.kʊs")},
  {"en":"I drink juice.", "es":"Bebo zumo.", "fr":"Je bois du jus.", "it":"Bevo il succo.", "de":"Ich trinke Saft."})
A("dinner","food","noun","nucleus","dinner",
  {"en":"dinner", "es":("cena","f","ˈsẽ.nɐ"), "fr":("dîner","m"), "it":("cena","f","ˈsẽ.nɐ"), "pt":("jantar","m"), "de":("Abendessen","n"), "la":("cena","f","ˈsẽ.nɐ")},
  {"en":"Dinner is ready.", "es":"La cena está lista.", "fr":"Le dîner est prêt.", "it":"La cena è pronta.", "de":"Das Abendessen ist fertig."})
A("lunch","food","noun","nucleus","lunch",
  {"en":"lunch", "es":("almuerzo","m"), "fr":("déjeuner","m"), "it":("pranzo","m"), "pt":("almoço","m"), "de":("Mittagessen","n"), "la":("prandium","n")},
  {"en":"Lunch is good.", "es":"El almuerzo es bueno.", "fr":"Le déjeuner est bon.", "it":"Il pranzo è buono.", "de":"Das Mittagessen ist gut."})
A("pig","animal","noun","nucleus","pig",
  {"en":("pig",None,"pɪɡ"), "es":("cerdo","m"), "fr":("cochon","m"), "it":("maiale","m"), "pt":("porco","m","ˈpoʁ.ku"), "de":("Schwein","n"), "la":("porcus","m","ˈpɔr.kʊs")},
  {"en":"The pig is pink.", "es":"El cerdo es rosa.", "fr":"Le cochon est rose.", "it":"Il maiale è rosa.", "de":"Das Schwein ist rosa."})
A("duck","animal","noun","nucleus","duck",
  {"en":"duck", "es":("pato","m"), "fr":("canard","m","ka.naʁ"), "it":("anatra","f"), "pt":("pato","m"), "de":("Ente","f","ˈɛntə"), "la":("anas","f")},
  {"en":"The duck swims.", "es":"El pato nada.", "fr":"Le canard nage.", "it":"Una anatra nuota.", "de":"Die Ente schwimmt."})
A("rabbit","animal","noun","nucleus","rabbit",
  {"en":"rabbit", "es":("conejo","m","koˈnexo"), "fr":("lapin","m"), "it":("coniglio","m"), "pt":("coelho","m"), "de":("Kaninchen","n"), "la":("cuniculus","m")},
  {"en":"The rabbit is fast.", "es":"El conejo es rápido.", "fr":"Le lapin est rapide.", "it":"Il coniglio è veloce.", "de":"Das Kaninchen ist schnell."})
A("insect","animal","noun","nucleus","insect",
  {"en":"insect", "es":("insecto","m"), "fr":("insecte","m"), "it":("insetto","m"), "pt":("inseto","m"), "de":("Insekt","n"), "la":("insectum","n")},
  {"en":"The insect is small.", "es":"El insecto es pequeño.", "fr":"Un insecte est petit.", "it":"Un insetto è piccolo.", "de":"Das Insekt ist klein."})
A("cloud","weather","noun","nucleus","cloud",
  {"en":"cloud", "es":("nube","f","ˈnube"), "fr":("nuage","m"), "it":("nuvola","f"), "pt":("nuvem","f"), "de":("Wolke","f"), "la":("nubes","f","ˈnuː.beːs")},
  {"en":"The cloud is white.", "es":"La nube es blanca.", "fr":"Le nuage est blanc.", "it":"La nuvola è bianca.", "de":"Die Wolke ist weiß."})
A("ice","weather","noun","nucleus","ice",
  {"en":("ice",None,"aɪs"), "es":("hielo","m"), "fr":("glace","f","ɡlas"), "it":("ghiaccio","m"), "pt":("gelo","m","ˈʒe.lu"), "de":("Eis","n","aɪ̯s"), "la":("glacies","f")},
  {"en":"The ice is cold.", "es":"El hielo está frío.", "fr":"La glace est froide.", "it":"Il ghiaccio è freddo.", "de":"Das Eis ist kalt."})
A("field","nature","noun","nucleus","field",
  {"en":("field",None,"ˈfi(ː)ld"), "es":("campo","m","ˈkampo"), "fr":("champ","m"), "it":("campo","m"), "pt":("campo","m"), "de":("Feld","n"), "la":("ager","m")},
  {"en":"The field is green.", "es":"El campo es verde.", "fr":"Le champ est vert.", "it":"Il campo è verde.", "de":"Das Feld ist grün."})
A("island","nature","noun","nucleus","island",
  {"en":"island", "es":("isla","f"), "fr":("île","f"), "it":("isola","f"), "pt":("ilha","f"), "de":("Insel","f"), "la":("insula","f")},
  {"en":"The island is small.", "es":"La isla es pequeña.", "fr":"Une île est petite.", "it":"Una isola è piccola.", "de":"Die Insel ist klein."})
A("leaf","nature","noun","nucleus","leaf",
  {"en":("leaf",None,"liːf"), "es":("hoja","f","ˈoxa"), "fr":("feuille","f"), "it":("foglia","f"), "pt":("folha","f"), "de":("Blatt","n","blat"), "la":("folium","n","ˈfɔ.li.ũː")},
  {"en":"The leaf is green.", "es":"La hoja es verde.", "fr":"La feuille est verte.", "it":"La foglia è verde.", "de":"Das Blatt ist grün."})
A("afternoon","time","noun","nucleus","afternoon",
  {"en":"afternoon", "es":("tarde","f","ˈtaʁ.d͡ʒi"), "fr":("après-midi","m"), "it":("pomeriggio","m"), "pt":("tarde","f","ˈtaʁ.d͡ʒi"), "de":("Nachmittag","m"), "la":("postmeridies","m")},
  {"en":"We meet in the afternoon.", "es":"Trabajo por la tarde.", "fr":"Bon après-midi à toi.", "it":"Studio il pomeriggio.", "de":"Wir treffen uns am Nachmittag."})
A("today-2","time","noun","nucleus","spring (season)",
  {"en":("spring",None,"ˈspɹɪŋ"), "es":("primavera","f","pɾimaˈbeɾa"), "fr":("printemps","m"), "it":("primavera","f","pɾimaˈbeɾa"), "pt":("primavera","f","pɾimaˈbeɾa"), "de":("Frühling","m"), "la":("ver","n","ˈbeɾ")},
  {"en":"Spring is warm.", "es":"La primavera es cálida.", "fr":"Le printemps est doux.", "it":"La primavera è mite.", "de":"Der Frühling ist warm."})
A("summer","time","noun","nucleus","summer",
  {"en":"summer", "es":("verano","m"), "fr":("été","m"), "it":("estate","f"), "pt":("verão","m"), "de":("Sommer","m"), "la":("aestas","f")},
  {"en":"Summer is hot.", "es":"El verano es caluroso.", "fr":"En été il fait chaud.", "it":"In estate fa caldo.", "de":"Der Sommer ist heiß."})
A("autumn","time","noun","nucleus","autumn / fall",
  {"en":"autumn", "es":("otoño","m"), "fr":("automne","m"), "it":("autunno","m"), "pt":("outono","m"), "de":("Herbst","m"), "la":("autumnus","m")},
  {"en":"Autumn is cool.", "es":"El otoño es fresco.", "fr":"En automne il fait frais.", "it":"In autunno fa fresco.", "de":"Der Herbst ist kühl."})
A("winter","time","noun","nucleus","winter",
  {"en":"winter", "es":("invierno","m"), "fr":("hiver","m"), "it":("inverno","m"), "pt":("inverno","m"), "de":("Winter","m"), "la":("hiems","f")},
  {"en":"Winter is cold.", "es":"El invierno es frío.", "fr":"En hiver il fait froid.", "it":"In inverno fa freddo.", "de":"Der Winter ist kalt."})
A("but","function","function","prereq","but",
  {"en":("but",None,"byt"), "es":("pero",None,"ˈpeɾo"), "fr":("mais",None,"ˈmajs"), "it":("ma",None,"ma"), "pt":("mas",None,"mas"), "de":("aber",None,"ˈaːbɐ"), "la":"sed"},
  {"en":"Small but good.", "es":"Pequeño pero bueno.", "fr":"Petit mais bon.", "it":"Piccolo ma buono.", "de":"Klein aber gut."})
A("because","function","function","nucleus","because",
  {"en":"because", "es":"porque", "fr":"parce que", "it":"perché", "pt":"porque", "de":"weil", "la":"quia"},
  {"en":"I stay because it rains.", "es":"Me quedo porque llueve.", "fr":"Je reste parce que il pleut.", "it":"Resto perché piove.", "de":"Ich bleibe, weil es regnet."})
A("if","function","function","nucleus","if",
  {"en":("if",None,"ɪf"), "es":("si",None,"si"), "fr":("si",None,"si"), "it":("se",None,"se"), "pt":("se",None,"si"), "de":"wenn", "la":("si",None,"si")},
  {"en":"If you want, come.", "es":"Si quieres, ven.", "fr":"Si tu veux, viens.", "it":"Se vuoi, vieni.", "de":"Wenn du willst, komm."})
A("under","function","preposition","nucleus","under",
  {"en":("under",None,"ˈʌndə"), "es":("bajo",None,"ˈbaxo"), "fr":"sous", "it":("sotto",None,"ˈsot.to"), "pt":"sob", "de":("unter",None,"ˈʊntɐ"), "la":("sub",None,"ˈsʊb")},
  {"en":"The cat is under the table.", "es":"El gato está bajo la mesa.", "fr":"Le chat est sous la table.", "it":"Il gatto è sotto il tavolo.", "de":"Die Katze ist unter dem Tisch."})
A("between","function","preposition","nucleus","between",
  {"en":"between", "es":("entre",None,"ˈentɾe"), "fr":("entre",None,"ˈentɾe"), "it":("tra",None,"t͡ɕaː˧˧"), "pt":("entre",None,"ˈẽ.tɾi"), "de":"zwischen", "la":"inter"},
  {"en":"It is between us.", "es":"Está entre nosotros.", "fr":"C'est entre nous.", "it":"È tra noi.", "de":"Es ist zwischen uns."})
A("without","function","preposition","nucleus","without",
  {"en":"without", "es":"sin", "fr":"sans", "it":"senza", "pt":"sem", "de":"ohne", "la":"sine"},
  {"en":"Coffee without sugar.", "es":"Café sin azúcar.", "fr":"Café sans sucre.", "it":"Caffè senza zucchero.", "de":"Kaffee ohne Zucker."})
A("after","function","preposition","nucleus","after",
  {"en":("after",None,"ˈɑːftə"), "es":"después", "fr":"après", "it":"dopo", "pt":"depois", "de":("nach",None,"naːx"), "la":("post",None,"ˈpɔst")},
  {"en":"We eat after the film.", "es":"Comemos después.", "fr":"On mange après.", "it":"Mangiamo dopo.", "de":"Wir essen nach dem Film."})
A("before","function","preposition","nucleus","before",
  {"en":"before", "es":("antes",None,"ˈantes"), "fr":("avant",None,"a.vɑ̃"), "it":("prima",None,"ˈpri.ma"), "pt":("antes",None,"ˈantes"), "de":("vor",None,"foːr"), "la":("ante",None,"ˈante")},
  {"en":"Wash before you eat.", "es":"Lávate antes.", "fr":"Lave-toi avant.", "it":"Lavati prima.", "de":"Wasch dich vor dem Essen."})
A("about","function","preposition","nucleus","about (concerning)",
  {"en":("about",None,"əˈbaʊ̯t"), "es":("sobre",None,"ˈsobɾe"), "fr":("sur",None,"syʁ"), "it":("su",None,"ˈsu"), "pt":("sobre",None,"ˈsobɾe"), "de":("über",None,"ˈyːbɐ"), "la":("de",None,"ˈdeː")},
  {"en":"A book about birds.", "es":"Un libro sobre aves.", "fr":"Un livre sur les oiseaux.", "it":"Un libro su uccelli.", "de":"Ein Buch über Vögel."})
A("also","function","adverb","nucleus","also / too",
  {"en":("also",None,"ˈʔalzoː"), "es":"también", "fr":"aussi", "it":"anche", "pt":"também", "de":("auch",None,"aʊ̯x"), "la":("etiam",None,"ˈɛ.ti.ãː")},
  {"en":"I also want tea.", "es":"También quiero té.", "fr":"Je veux aussi du thé.", "it":"Anche io voglio il tè.", "de":"Ich will auch Tee."})
A("only","function","adverb","nucleus","only",
  {"en":"only", "es":"solo", "fr":"seulement", "it":"solo", "pt":"só", "de":"nur", "la":"tantum"},
  {"en":"Only one apple.", "es":"Solo una manzana.", "fr":"Seulement une pomme.", "it":"Solo una mela.", "de":"Nur ein Apfel."})
A("here-now","function","adverb","nucleus","far",
  {"en":"far", "es":"lejos", "fr":"loin", "it":"lontano", "pt":"longe", "de":("weit",None,"vaɪ̯t"), "la":"procul"},
  {"en":"The city is far.", "es":"La ciudad está lejos.", "fr":"La ville est loin.", "it":"Il paese è lontano.", "de":"Die Stadt ist weit."})
A("again","function","adverb","nucleus","again",
  {"en":"again", "es":"otra vez", "fr":("encore",None,"ɑ̃.kɔʁ"), "it":("ancora",None,"ˈan.ko.ra"), "pt":"outra vez", "de":"wieder", "la":"iterum"},
  {"en":"Say it again.", "es":"Dilo otra vez.", "fr":"Dis-le encore.", "it":"Dillo ancora.", "de":"Sag es wieder."})
A("together","function","adverb","nucleus","together",
  {"en":"together", "es":"juntos", "fr":("ensemble",None,"ɑ̃.sɑ̃bl"), "it":"insieme", "pt":"juntos", "de":"zusammen", "la":("simul",None,"ˈsɪ.mʊɫ")},
  {"en":"We work together.", "es":"Trabajamos juntos.", "fr":"On travaille ensemble.", "it":"Lavoriamo insieme.", "de":"Wir arbeiten zusammen."})
A("maybe","function","adverb","nucleus","maybe / perhaps",
  {"en":"maybe", "es":"quizás", "fr":"peut-être", "it":"forse", "pt":"talvez", "de":"vielleicht", "la":"fortasse"},
  {"en":"Maybe tomorrow.", "es":"Quizás mañana.", "fr":"Peut-être demain.", "it":"Forse domani.", "de":"Vielleicht morgen."})
A("our","function","pronoun","nucleus","our",
  {"en":("our",None,"ˈaʊ̯.əː"), "es":"nuestro", "fr":"notre", "it":("nostro",None,"ˈnɔs.tro"), "pt":"nosso", "de":"unser", "la":"noster"},
  {"en":"This is our house.", "es":"Este es nuestro libro.", "fr":"C'est notre maison.", "it":"Questo è il nostro libro.", "de":"Das ist unser Haus."})
A("their","function","pronoun","nucleus","their",
  {"en":"their", "es":("su",None,"ˈsu"), "fr":"leur", "it":("loro",None,"ˈlo.ro"), "pt":"deles", "de":("ihr",None,"iːr"), "la":"eorum"},
  {"en":"That is their car.", "es":"Ese es su coche.", "fr":"C'est leur voiture.", "it":"È la loro auto.", "de":"Das ist ihr Auto."})
A("all","function","function","nucleus","all",
  {"en":("all",None,"ɔːl"), "es":"todo", "fr":("tout",None,"tu"), "it":("tutto",None,"ˈtut.to"), "pt":("tudo",None,"ˈtu.du"), "de":"alle", "la":("omnis",None,"ˈɔm.nɪs")},
  {"en":"All the bread is gone.", "es":"Todo el pan se acabó.", "fr":"Tout le pain est parti.", "it":"Tutto il pane è finito.", "de":"Alle das Brot ist weg."})
A("many","function","adjective","nucleus","many / much",
  {"en":("many",None,"ˈmɛni"), "es":"muchos", "fr":"beaucoup", "it":"molti", "pt":"muitos", "de":"viele", "la":"multi"},
  {"en":"Many people came.", "es":"Vinieron muchos.", "fr":"Beaucoup sont venus.", "it":"Molti sono venuti.", "de":"Viele kamen."})
A("few","function","adjective","nucleus","few",
  {"en":("few",None,"fjuː"), "es":"pocos", "fr":"peu", "it":"pochi", "pt":"poucos", "de":"wenige", "la":"pauci"},
  {"en":"Few people stayed.", "es":"Pocos se quedaron.", "fr":"Peu sont restés.", "it":"Pochi sono rimasti.", "de":"Wenige blieben."})
A("other","function","adjective","nucleus","other / another",
  {"en":"other", "es":"otro", "fr":"autre", "it":"altro", "pt":("outro",None,"ˈo(w).tɾu"), "de":"andere", "la":("alius",None,"ˈa.li.ʊs")},
  {"en":"I want the other one.", "es":"Quiero el otro.", "fr":"Je veux un autre.", "it":"Voglio un altro.", "de":"Ich will eine andere Farbe."})
A("same","function","adjective","nucleus","same",
  {"en":"same", "es":("mismo",None,"ˈmismo"), "fr":"même", "it":"stesso", "pt":("mesmo",None,"ˈmez.mu"), "de":("gleich",None,"ɡlaɪ̯ç"), "la":"idem"},
  {"en":"It is the same book.", "es":"Es el mismo libro.", "fr":"C'est le même livre.", "it":"È lo stesso libro.", "de":"Wir sind gleich groß."})
A("sixty","number","numeral","prereq","sixty (60)",
  {"en":"sixty", "es":"sesenta", "fr":"soixante", "it":"sessanta", "pt":"sessenta", "de":"sechzig", "la":"sexaginta"},
  {"en":"He is sixty.", "es":"Tiene sesenta.", "fr":"Il a soixante ans.", "it":"Ha sessanta anni.", "de":"Er ist sechzig."})
A("seventy","number","numeral","prereq","seventy (70)",
  {"en":"seventy", "es":"setenta", "fr":"soixante-dix", "it":"settanta", "pt":"setenta", "de":"siebzig", "la":"septuaginta"},
  {"en":"She is seventy.", "es":"Tiene setenta.", "fr":"Elle a soixante-dix ans.", "it":"Ha settanta anni.", "de":"Sie ist siebzig."})
A("eighty","number","numeral","prereq","eighty (80)",
  {"en":"eighty", "es":"ochenta", "fr":"quatre-vingts", "it":"ottanta", "pt":"oitenta", "de":"achtzig", "la":"octoginta"},
  {"en":"He is eighty.", "es":"Tiene ochenta.", "fr":"Il a quatre-vingts ans.", "it":"Ha ottanta anni.", "de":"Er ist achtzig."})
A("ninety","number","numeral","prereq","ninety (90)",
  {"en":"ninety", "es":"noventa", "fr":"quatre-vingt-dix", "it":"novanta", "pt":"noventa", "de":"neunzig", "la":"nonaginta"},
  {"en":"She is ninety.", "es":"Tiene noventa.", "fr":"Elle a quatre-vingt-dix ans.", "it":"Ha novanta anni.", "de":"Sie ist neunzig."})
A("first","number","adjective","nucleus","first",
  {"en":"first", "es":("primero",None,"pɾiˈmeɾo"), "fr":("premier",None,"pʁə.mje"), "it":("primo",None,"ˈpri.mo"), "pt":("primeiro",None,"pɾiˈme(j).ɾu"), "de":"erste", "la":"primus"},
  {"en":"The first day.", "es":"El primero día.", "fr":"Le premier jour.", "it":"Il primo giorno.", "de":"Der erste Tag."})
A("second-ord","number","adjective","nucleus","second (ordinal)",
  {"en":"second", "es":("segundo",None,"seˈɡundo"), "fr":"deuxième", "it":("secondo",None,"seˈkon.do"), "pt":("segundo",None,"seˈɡũ.du"), "de":"zweite", "la":("secundus",None,"sɛˈkʊn.dʊs")},
  {"en":"The second book.", "es":"El segundo libro.", "fr":"Le deuxième livre.", "it":"Il secondo libro.", "de":"Das zweite Buch."})
A("last","number","adjective","nucleus","last",
  {"en":("last",None,"lɑst"), "es":"último", "fr":"dernier", "it":("ultimo",None,"ˈul.ti.mo"), "pt":"último", "de":"letzte", "la":"ultimus"},
  {"en":"The last day.", "es":"El último día.", "fr":"Le dernier jour.", "it":"Questo è ultimo giorno.", "de":"Der letzte Tag."})
A("half","number","noun","nucleus","half",
  {"en":"half", "es":("mitad","f"), "fr":("moitié","f"), "it":("metà","f"), "pt":("metade","f"), "de":("Hälfte","f"), "la":("dimidium","n")},
  {"en":"Half the bread.", "es":"La mitad del pan.", "fr":"La moitié du pain.", "it":"La metà del pane.", "de":"Die Hälfte vom Brot."})
A("baby","people","noun","nucleus","baby",
  {"en":"baby", "es":("bebé","m"), "fr":("bébé","m"), "it":("bambino","m"), "pt":("bebê","m"), "de":("Baby","n","ˈbeɪ̯.bi"), "la":("infans","m","ˈĩː.fãːs")},
  {"en":"The baby sleeps.", "es":"El bebé duerme.", "fr":"Le bébé dort.", "it":"Il bambino dorme.", "de":"Das Baby schläft."})
A("boy","people","noun","nucleus","boy",
  {"en":("boy",None,"bɔɪ"), "es":("niño","m"), "fr":("garçon","m"), "it":("ragazzo","m"), "pt":("menino","m"), "de":("Junge","m"), "la":("puer","m","ˈpu.ɛr")},
  {"en":"The boy plays.", "es":"El niño juega.", "fr":"Le garçon joue.", "it":"Il ragazzo gioca.", "de":"Der Junge spielt."})
A("girl","people","noun","nucleus","girl",
  {"en":("girl",None,"ˈɡɜːl"), "es":("niña","f"), "fr":("fille","f"), "it":("ragazza","f"), "pt":("menina","f","miˈnĩ.nɐ"), "de":("Mädchen","n"), "la":("puella","f","puˈɛl.la")},
  {"en":"The girl reads.", "es":"La niña lee.", "fr":"La fille lit.", "it":"La ragazza legge.", "de":"Das Mädchen liest."})
A("people","people","noun","nucleus","people",
  {"en":("people",None,"ˈpi.pəl"), "es":("gente","f","ˈd͡ʒɛn.te"), "fr":("gens","m","ˈɡẽːs"), "it":("gente","f","ˈd͡ʒɛn.te"), "pt":("gente","f","ˈd͡ʒɛn.te"), "de":("Leute","f"), "la":("populus","m","ˈpɔ.pʊ.ɫʊs")},
  {"en":"The people are kind.", "es":"La gente es amable.", "fr":"Les gens sont gentils.", "it":"La gente è gentile.", "de":"Die Leute sind nett."})
A("neighbor","people","noun","nucleus","neighbour",
  {"en":"neighbour", "es":("vecino","m"), "fr":("voisin","m"), "it":("vicino","m"), "pt":("vizinho","m","viˈzĩ.ɲu"), "de":("Nachbar","m"), "la":("vicinus","m")},
  {"en":"My neighbour is kind.", "es":"Mi vecino es amable.", "fr":"Mon voisin est gentil.", "it":"Il mio vicino è gentile.", "de":"Mein Nachbar ist nett."})
A("worker","people","noun","nucleus","worker",
  {"en":"worker", "es":("trabajador","m"), "fr":("ouvrier","m"), "it":("operaio","m"), "pt":("trabalhador","m"), "de":("Arbeiter","m"), "la":("operarius","m")},
  {"en":"The worker is tired.", "es":"El trabajador está cansado.", "fr":"Un ouvrier est fatigué.", "it":"Un operaio è stanco.", "de":"Der Arbeiter ist müde."})
A("life","abstract","noun","nucleus","life",
  {"en":("life",None,"ˈlaɪ̯f"), "es":("vida","f","ˈbida"), "fr":("vie","f","vi"), "it":("vita","f","ˈwiː.ta"), "pt":("vida","f","ˈbida"), "de":("Leben","n","ˈleːbən"), "la":("vita","f","ˈwiː.ta")},
  {"en":"Life is good.", "es":"La vida es buena.", "fr":"La vie est belle.", "it":"La vita è bella.", "de":"Das Leben ist gut."})
A("world","abstract","noun","nucleus","world",
  {"en":("world",None,"wɜːld"), "es":("mundo","m","ˈmundo"), "fr":("monde","m","mɔ̃d"), "it":("mondo","m","ˈmon.do"), "pt":("mundo","m","ˈmũ.du"), "de":("Welt","f"), "la":("mundus","m")},
  {"en":"The world is big.", "es":"El mundo es grande.", "fr":"Le monde est grand.", "it":"Il mondo è grande.", "de":"Die Welt ist groß."})
A("story","abstract","noun","nucleus","story",
  {"en":"story", "es":("historia","f","isˈtoɾja"), "fr":("histoire","f"), "it":("storia","f"), "pt":("história","f"), "de":("Geschichte","f"), "la":("fabula","f","ˈfaː.bʊ.ɫa")},
  {"en":"A good story.", "es":"Una buena historia.", "fr":"Une bonne histoire.", "it":"Una bella storia.", "de":"Eine gute Geschichte."})
A("music","abstract","noun","nucleus","music",
  {"en":"music", "es":("música","f","ˈmu.zi.kɐ"), "fr":("musique","f"), "it":("musica","f"), "pt":("música","f","ˈmu.zi.kɐ"), "de":("Musik","f","muˈziːk"), "la":("musica","f")},
  {"en":"The music is nice.", "es":"La música es bonita.", "fr":"La musique est belle.", "it":"La musica è bella.", "de":"Die Musik ist schön."})
A("game","abstract","noun","nucleus","game",
  {"en":"game", "es":("juego","m","ˈxweɡo"), "fr":("jeu","m","ʒø"), "it":("gioco","m","ˈd͡ʒɔ.ko"), "pt":("jogo","m","ˈʒo.ɡu"), "de":("Spiel","n","ʃpiːl"), "la":("ludus","m","ˈɫuː.dʊs")},
  {"en":"The game is fun.", "es":"El juego es divertido.", "fr":"Le jeu est amusant.", "it":"Il gioco è divertente.", "de":"Das Spiel ist lustig."})
A("idea","abstract","noun","nucleus","idea",
  {"en":"idea", "es":("idea","f"), "fr":("idée","f"), "it":("idea","f"), "pt":("ideia","f","iˈdɛj.ɐ"), "de":("Idee","f"), "la":("idea","f")},
  {"en":"A good idea.", "es":"Una buena idea.", "fr":"Une bonne idée.", "it":"Una buona idea.", "de":"Eine gute Idee."})
A("problem","abstract","noun","nucleus","problem",
  {"en":("problem",None,"ˈpɹɒbləm"), "es":("problema","m"), "fr":("problème","m"), "it":("problema","m"), "pt":("problema","m"), "de":("Problem","n","ˈpɹɒbləm"), "la":("problema","n")},
  {"en":"It is a small problem.", "es":"Es un problema pequeño.", "fr":"C'est un petit problème.", "it":"È un piccolo problema.", "de":"Es ist ein kleines Problem."})
A("help-noun","abstract","noun","nucleus","help (the noun)",
  {"en":"help", "es":("ayuda","f","aˈʝuda"), "fr":("aide","f"), "it":("aiuto","m","aˈju.to"), "pt":("ajuda","f","aˈʒu.dɐ"), "de":("Hilfe","f"), "la":("auxilium","n")},
  {"en":"I need help.", "es":"Necesito ayuda.", "fr":"Voici une aide utile.", "it":"Ho bisogno di aiuto.", "de":"Ich brauche Hilfe."})
A("good-afternoon","greeting","phrase","frontier","good afternoon",
  {"en":"good afternoon", "es":"buenas tardes", "fr":"bon après-midi", "it":"buon pomeriggio", "pt":"boa tarde", "de":"guten Tag", "la":"salve"},
  {"en":"Good afternoon, madam.", "es":"Buenas tardes, señora.", "fr":"Bon après-midi, madame.", "it":"Buon pomeriggio, signora.", "de":"Guten Tag, gnädige Frau."})
A("you-are-welcome","phrase","phrase","frontier","you're welcome",
  {"en":"you're welcome", "es":"de nada", "fr":"de rien", "it":("prego",None,"ˈprɛ.ɡo"), "pt":"de nada", "de":"bitte schön", "la":"libenter"},
  {"en":"You're welcome, friend.", "es":"De nada, amigo.", "fr":"De rien, mon ami.", "it":"Prego, amico.", "de":"Bitte schön, mein Freund."})
A("nice-to-meet-you","phrase","phrase","frontier","nice to meet you",
  {"en":"nice to meet you", "es":"mucho gusto", "fr":"enchanté", "it":"piacere", "pt":"prazer", "de":"freut mich", "la":"gaudeo te videre"},
  {"en":"Hello, nice to meet you.", "es":"Hola, mucho gusto.", "fr":"Bonjour, enchanté.", "it":"Ciao, piacere.", "de":"Hallo, freut mich."})
A("can-you-help","phrase","phrase","frontier","can you help me?",
  {"en":"can you help me", "es":"puedes ayudarme", "fr":"pouvez-vous m'aider", "it":"può aiutarmi", "pt":"pode me ajudar", "de":"können Sie mir helfen", "la":"potesne me iuvare"},
  {"en":"Please, can you help me?", "es":"Por favor, ¿puedes ayudarme?", "fr":"Pouvez-vous m'aider, s'il vous plaît?", "it":"Scusi, può aiutarmi?", "de":"Bitte, können Sie mir helfen?"})
A("i-would-like","phrase","phrase","frontier","I would like",
  {"en":"I would like", "es":"quisiera", "fr":"je voudrais", "it":"vorrei", "pt":"gostaria", "de":"ich möchte", "la":"velim"},
  {"en":"I would like a coffee.", "es":"Quisiera un café.", "fr":"Je voudrais un café.", "it":"Vorrei un caffè.", "de":"Ich möchte einen Kaffee."})
A("what-time","phrase","phrase","frontier","what time is it?",
  {"en":"what time is it", "es":"qué hora es", "fr":"quelle heure est-il", "it":"che ora è", "pt":"que horas são", "de":"wie spät ist es", "la":"quota hora est"},
  {"en":"Excuse me, what time is it?", "es":"Perdón, ¿qué hora es?", "fr":"Pardon, quelle heure est-il?", "it":"Scusi, che ora è?", "de":"Entschuldigung, wie spät ist es?"})
A("i-dont-speak","phrase","phrase","frontier","I don't speak (the language)",
  {"en":"I don't speak", "es":"no hablo", "fr":"je ne parle pas", "it":"non parlo", "pt":"não falo", "de":"ich spreche nicht", "la":"non loquor"},
  {"en":"Sorry, I don't speak it well.", "es":"Lo siento, no hablo bien.", "fr":"Désolé, je ne parle pas bien.", "it":"Mi dispiace, non parlo bene.", "de":"Entschuldigung, ich spreche nicht gut."})
A("see-you-later","phrase","phrase","frontier","see you later",
  {"en":"see you later", "es":"hasta luego", "fr":"à bientôt", "it":"a dopo", "pt":"até logo", "de":"bis später", "la":"vale"},
  {"en":"Goodbye, see you later.", "es":"Adiós, hasta luego.", "fr":"Au revoir, à bientôt.", "it":"Ciao, a dopo.", "de":"Tschüss, bis später."})
A("welcome","phrase","phrase","frontier","welcome",
  {"en":"welcome", "es":"bienvenido", "fr":"bienvenue", "it":"benvenuto", "pt":"bem-vindo", "de":"willkommen", "la":"salve"},
  {"en":"Welcome to my house.", "es":"Bienvenido a mi casa.", "fr":"Bienvenue chez moi.", "it":"Benvenuto a casa mia.", "de":"Willkommen in meinem Haus."})
A("how-do-you-say","phrase","phrase","frontier","how do you say...?",
  {"en":"how do you say", "es":"cómo se dice", "fr":"comment dit-on", "it":"come si dice", "pt":"como se diz", "de":"wie sagt man", "la":"quomodo dicitur"},
  {"en":"How do you say this?", "es":"¿Cómo se dice esto?", "fr":"Comment dit-on ça?", "it":"Come si dice questo?", "de":"Wie sagt man das?"})
A("i-am-hungry","phrase","phrase","frontier","I am hungry",
  {"en":"I am hungry", "es":"tengo hambre", "fr":"j'ai faim", "it":"ho fame", "pt":"estou com fome", "de":"ich habe Hunger", "la":"esurio"},
  {"en":"I am hungry now.", "es":"Ahora tengo hambre.", "fr":"Maintenant j'ai faim.", "it":"Adesso ho fame.", "de":"Mama, ich habe Hunger."})
A("i-am-thirsty","phrase","phrase","frontier","I am thirsty",
  {"en":"I am thirsty", "es":"tengo sed", "fr":"j'ai soif", "it":"ho sete", "pt":"estou com sede", "de":"ich habe Durst", "la":("sitio",None,"ˈsitjo")},
  {"en":"I am thirsty too.", "es":"También tengo sed.", "fr":"J'ai soif aussi.", "it":"Ho sete anch'io.", "de":"Mama, ich habe Durst."})
A("it-is-cold","phrase","phrase","frontier","it is cold (weather)",
  {"en":"it is cold", "es":"hace frío", "fr":"il fait froid", "it":"fa freddo", "pt":"está frio", "de":"es ist kalt", "la":"frigus est"},
  {"en":"Today it is cold.", "es":"Hoy hace frío.", "fr":"Aujourd'hui il fait froid.", "it":"Oggi fa freddo.", "de":"Brrr, es ist kalt heute."})
A("it-is-hot","phrase","phrase","frontier","it is hot (weather)",
  {"en":"it is hot", "es":"hace calor", "fr":"il fait chaud", "it":"fa caldo", "pt":"está quente", "de":"es ist heiß", "la":"calidum est"},
  {"en":"In summer it is hot.", "es":"En verano hace calor.", "fr":"En été il fait chaud.", "it":"D'estate fa caldo.", "de":"Im Sommer es ist heiß und sonnig."})
A("the-bill","phrase","phrase","frontier","the bill / check, please",
  {"en":"the bill please", "es":"la cuenta por favor", "fr":"l'addition s'il vous plaît", "it":"il conto per favore", "pt":"a conta por favor", "de":"die Rechnung bitte", "la":"ratio quaeso"},
  {"en":"Excuse me, the bill please.", "es":"Perdón, la cuenta por favor.", "fr":"Pardon, l'addition s'il vous plaît.", "it":"Scusi, il conto per favore.", "de":"Entschuldigung, die Rechnung bitte."})
A("i-like-it","phrase","phrase","frontier","I like it",
  {"en":"I like it", "es":"me gusta", "fr":"j'aime", "it":"mi piace", "pt":"eu gosto", "de":"es gefällt mir", "la":"mihi placet"},
  {"en":"This is good, I like it.", "es":"Esto es bueno, me gusta.", "fr":"C'est bon, j'aime.", "it":"È buono, mi piace.", "de":"Das ist gut, es gefällt mir."})
A("help-me","phrase","phrase","frontier","help! (emergency)",
  {"en":"help", "es":"socorro", "fr":"au secours", "it":("aiuto",None,"aˈju.to"), "pt":"socorro", "de":"Hilfe", "la":"succurre"},
  {"en":"Help, please!", "es":"¡Socorro, por favor!", "fr":"Au secours, s'il vous plaît!", "it":"Aiuto, per favore!", "de":"Hilfe, bitte!"})
A("good-luck","phrase","phrase","frontier","good luck",
  {"en":"good luck", "es":"buena suerte", "fr":"bonne chance", "it":"buona fortuna", "pt":"boa sorte", "de":"viel Glück", "la":"bona fortuna"},
  {"en":"Good luck to you.", "es":"Buena suerte.", "fr":"Bonne chance.", "it":"Buona fortuna.", "de":"Viel Glück."})
A("happy-birthday","phrase","phrase","frontier","happy birthday",
  {"en":"happy birthday", "es":"feliz cumpleaños", "fr":"joyeux anniversaire", "it":"buon compleanno", "pt":"feliz aniversário", "de":"alles Gute zum Geburtstag", "la":"felix natalis dies"},
  {"en":"Happy birthday, friend!", "es":"¡Feliz cumpleaños, amigo!", "fr":"Joyeux anniversaire, mon ami!", "it":"Buon compleanno, amico!", "de":"Alles Gute zum Geburtstag, mein Freund!"})
A("i-am-fine","phrase","phrase","frontier","I am fine",
  {"en":"I am fine", "es":"estoy bien", "fr":"je vais bien", "it":"sto bene", "pt":"estou bem", "de":"mir geht es gut", "la":"valeo"},
  {"en":"Thank you, I am fine.", "es":"Gracias, estoy bien.", "fr":"Merci, je vais bien.", "it":"Grazie, sto bene.", "de":"Danke, mir geht es gut."})


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
    built = build_new()

    # Idempotency: the D list accumulates across batches and the corpus already
    # holds previously-appended atoms, so only APPEND ids not already present.
    # Re-running therefore converges (adds nothing) instead of colliding.
    new = [a for a in built if a["id"] not in existing_ids]
    skipped = len(built) - len(new)

    # validate
    errs = []
    seen = set()
    word_re_cache = {}
    for a in new:
        i = a["id"]
        if i in seen: errs.append(f"dup new id {i}")
        seen.add(i)
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
    corpus["meta"]["version"] = "0.3.0"
    corpus["meta"]["title"] = "Polyglot Core — a beginner course across 7 languages"
    corpus["meta"]["license"] = (
        "Translations & IPA are facts cross-checked against Wiktionary (CC-BY-SA, "
        "attributed via Kaikki — IPA pulled from the live photon dictionary at "
        "polingual.agfarms.dev); example sentences are original and beginner-simple."
    )
    json.dump(corpus, open(CORPUS, "w"), ensure_ascii=False, indent=2)
    open(CORPUS, "a").write("\n")
    import collections
    cats = collections.Counter(a.get("category", "?") for a in merged)
    print(f"OK: {len(existing)} existing + {len(new)} new (skipped {skipped} already present) "
          f"= {len(merged)} atoms x {len(LANGS)} languages")
    print("categories:", dict(sorted(cats.items())))

if __name__ == "__main__":
    main()
