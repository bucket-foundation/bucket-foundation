import { FACTS, SITE, type Faq } from "./facts";
import { HOMES, TARGETS } from "./stoa/host";
import { PER_ROUND, ROUNDS } from "./stoa/questions";
import { langLabel } from "./word-i18n";

export type TeachersLang = "en" | "es";
export type TeachersPage = "" | "/lesson-plan" | "/handout";

export const TEACHERS_LANGS: TeachersLang[] = ["en", "es"];
export const TEACHERS_PAGES: TeachersPage[] = ["", "/lesson-plan", "/handout"];
export const ROOM_SEATS = 100;
export const ANSWER_SECONDS = 20;
export const TARGET_LIMIT = 12;
export const QUESTION_COUNT = ROUNDS * PER_ROUND;

const HOST = SITE.replace("https://www.", "");
export const LIVE_ADDRESS = `${HOST}/live`;
export const JOIN_ADDRESS = `${HOST}/join`;

export function teachersPath(lang: TeachersLang, page: TeachersPage = ""): string {
  return `${lang === "en" ? "" : `/${lang}`}/teachers${page}`;
}

export function teachersPaths(): string[] {
  return TEACHERS_LANGS.flatMap((l) => TEACHERS_PAGES.map((p) => teachersPath(l, p)));
}

export function teachersAlternates(page: TeachersPage): Record<string, string> {
  return { en: `${SITE}${teachersPath("en", page)}`, es: `${SITE}${teachersPath("es", page)}`, "x-default": `${SITE}${teachersPath("en", page)}` };
}

export function teachersBreadcrumbJsonLd(lang: TeachersLang, page: TeachersPage) {
  const c = teachersCopy(lang);
  const leaf = page === "/lesson-plan" ? c.planLink : page === "/handout" ? c.handoutLink : null;
  const items = [
    { name: "Polingual", item: `${SITE}${lang === "en" ? "/" : `/${lang}`}` },
    { name: c.back, item: `${SITE}${teachersPath(lang)}` },
    ...(leaf ? [{ name: leaf, item: `${SITE}${teachersPath(lang, page)}` }] : []),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })),
  };
}

function listed(codes: string[], lang: TeachersLang): string {
  return new Intl.ListFormat(lang, { type: "conjunction" }).format(codes.map((c) => langLabel(c, lang)));
}

export function quizLanguages(lang: TeachersLang): string {
  return listed(TARGETS, lang);
}

export function promptLanguages(lang: TeachersLang): string {
  return listed(HOMES, lang);
}

type Step = { h: string; p: string };
type Row = { when: string; what: string; how: string };

export type TeachersCopy = {
  metaTitle: string;
  description: string;
  title: string;
  lede: string;
  start: string;
  app: string;
  stepsTitle: string;
  steps: Step[];
  questionsTitle: string;
  questions: string;
  controlsTitle: string;
  controls: Step[];
  printTitle: string;
  planLink: string;
  handoutLink: string;
  appTitle: string;
  appBody: string;
  faqTitle: string;
  faq: Faq[];
  print: string;
  back: string;
  plan: { metaTitle: string; description: string; title: string; facts: Step[]; beforeTitle: string; before: string[]; tableTitle: string; head: Row; rows: Row[]; afterTitle: string; after: string[] };
  handout: { metaTitle: string; description: string; title: string; lede: string; steps: string[]; code: string; nickname: string; wordsTitle: string; wordsLede: string; head: string[]; name: string };
};

const EN: TeachersCopy = {
  metaTitle: "Polingual for language teachers",
  description: "A free live word quiz for language classes. Host on the projector, students join by phone with a room code, no student accounts.",
  title: "Polingual for language teachers",
  lede: "A live word quiz for the whole class. You host on the projector and students answer on their phones. One game takes about ten minutes.",
  start: "Start a class game",
  app: "Download on the App Store",
  stepsTitle: "Ten minutes in class",
  steps: [
    { h: "Open the board", p: `Open ${LIVE_ADDRESS} on the classroom projector and sign in with your email. Choose the language for the prompts and up to ${TARGET_LIMIT} languages to quiz.` },
    { h: "Students join", p: `The board shows a 6 character room code and a QR code. Students scan the QR code or open ${JOIN_ADDRESS} and enter the room code. Each student picks a nickname from the names offered.` },
    { h: "Play the game", p: `The game runs ${ROUNDS} rounds of ${PER_ROUND} questions, with ${ANSWER_SECONDS} seconds for each. Every question has four answers, and students tap one on their phones.` },
    { h: "Read the board", p: "The board shows standings after each round and a final board at the end. Download the results file to keep the scores by nickname." },
  ],
  questionsTitle: "Questions",
  questions: "Most questions ask the class to pick a word or a translation in one of your quiz languages. Others show a word and ask which language it belongs to. A class that studies Spanish and French gets both in the same game.",
  controlsTitle: "Classroom controls",
  controls: [
    { h: "School mode", p: "Removes app links and promotions from the board and from every phone." },
    { h: "Teams", p: "Chorus mode splits the class into 2 to 4 teams. Open Floor has every student play alone." },
    { h: "Lock and remove", p: "Lock the room once your class is in. Remove any player from the lobby." },
    { h: "Pause and Next", p: "Pause the game to talk about an answer, or press Next to move on." },
  ],
  printTitle: "Printables",
  planLink: "Lesson plan",
  handoutLink: "Student handout",
  appTitle: "Polingual app",
  appBody: `Students who want to keep studying at home can use the Polingual app on ${FACTS.platforms}. It teaches ${FACTS.languageCount} languages.`,
  faqTitle: "Questions from teachers",
  faq: [
    { q: "What does it cost?", a: "Hosting and joining are free." },
    { q: "Do students need accounts?", a: "No. Students join with the room code and a nickname picked from a short list. They give no email and no real name. The teacher signs in with an email to host." },
    { q: "Which languages does the quiz cover?", a: `The quiz covers ${TARGETS.length} languages: ${quizLanguages("en")}. Prompts can appear in ${promptLanguages("en")}.` },
    { q: "How many students can join?", a: `One room holds up to ${ROOM_SEATS} players.` },
    { q: "What do students need?", a: "A phone or another device with a web browser. The game runs on a web page, with no install." },
    { q: "What happens to student data?", a: "Players give no personal details, and room records are deleted 24 hours after the room closes. The student data page at polingual.com/live/student-data has the details." },
  ],
  print: "Print this page",
  back: "Polingual for teachers",
  plan: {
    metaTitle: "Lesson plan: a ten-minute word round",
    description: "A printable one-page lesson plan for a ten-minute Polingual Live word quiz in a language class.",
    title: "Lesson plan: a ten-minute word round",
    facts: [
      { h: "Time", p: "10 minutes" },
      { h: "Level", p: "Any" },
      { h: "Goal", p: "Students recognize and recall words in the languages the class studies." },
      { h: "Materials", p: "A projector or shared screen and a phone for each student or pair. Print one handout for each student." },
    ],
    beforeTitle: "Before class",
    before: [
      `Open ${LIVE_ADDRESS} on the classroom computer, sign in with your email and accept the host terms.`,
      "Choose the prompt language and the languages to quiz. Turn on School mode.",
    ],
    tableTitle: "In class",
    head: { when: "Minute", what: "Step", how: "What happens" },
    rows: [
      { when: "0 to 1", what: "Open the room", how: "Press Open the room. The board shows the room code and a QR code." },
      { when: "1 to 3", what: "Join", how: `Students open ${JOIN_ADDRESS}, enter the code and pick a nickname. Lock the room once everyone is in, then press Start.` },
      { when: "3 to 9", what: "Play", how: `${ROUNDS} rounds of ${PER_ROUND} questions, ${ANSWER_SECONDS} seconds each. After each answer shows, have the class say the word aloud. Pause when a word needs a minute.` },
      { when: "9 to 10", what: "Review", how: "Read the final board. Students write the words they met on the handout. Download the results file." },
    ],
    afterTitle: "After class",
    after: [
      "Ask each student to share one word from the handout at the start of the next lesson.",
      "The results file pairs nicknames with scores. Keep it private.",
    ],
  },
  handout: {
    metaTitle: "Student handout: join the class game",
    description: "A printable student handout for joining a Polingual Live class game by phone with a room code.",
    title: "Join the class game",
    lede: "You need a phone with a web browser. You do not need an account.",
    steps: [
      `Open ${JOIN_ADDRESS} on your phone, or scan the QR code on the board.`,
      "Type the room code from the board.",
      "Pick a nickname from the names shown.",
      `When a question opens, tap one of the four answers. You have ${ANSWER_SECONDS} seconds.`,
    ],
    code: "Room code",
    nickname: "My nickname",
    wordsTitle: "Words from today",
    wordsLede: "After the game, write the words you want to keep.",
    head: ["Word", "Language", "Meaning"],
    name: "Name",
  },
};

const ES: TeachersCopy = {
  metaTitle: "Polingual para docentes de idiomas",
  description: "Un juego de palabras en vivo y gratis para clases de idiomas. Proyecta el tablero y el alumnado entra desde el teléfono con un código.",
  title: "Polingual para docentes de idiomas",
  lede: "Un juego de palabras en vivo para toda la clase. Tú diriges desde el proyector y el alumnado responde desde el teléfono. Una partida dura unos diez minutos.",
  start: "Empieza una partida en clase",
  app: "Descárgala en el App Store",
  stepsTitle: "Diez minutos en clase",
  steps: [
    { h: "Abre el tablero", p: `Abre ${LIVE_ADDRESS} en el proyector del aula e inicia sesión con tu correo. Elige el idioma de las preguntas y hasta ${TARGET_LIMIT} idiomas para el juego. El tablero y los teléfonos muestran los botones en inglés.` },
    { h: "El alumnado entra", p: `El tablero muestra un código de sala de 6 caracteres y un código QR. Cada estudiante escanea el QR o abre ${JOIN_ADDRESS} y escribe el código. Luego elige un apodo entre los nombres que aparecen.` },
    { h: "Dirige la partida", p: `La partida tiene ${ROUNDS} rondas de ${PER_ROUND} preguntas, con ${ANSWER_SECONDS} segundos para cada una. Cada pregunta tiene cuatro respuestas y cada estudiante toca una en su teléfono.` },
    { h: "Lee el tablero", p: "El tablero muestra la clasificación después de cada ronda y un tablero final. Descarga el archivo de resultados para guardar los puntos por apodo." },
  ],
  questionsTitle: "Preguntas",
  questions: "La mayoría de las preguntas piden elegir una palabra o una traducción en uno de los idiomas del juego. Otras muestran una palabra y preguntan de qué idioma es. Una clase que estudia español y francés recibe los dos en la misma partida.",
  controlsTitle: "Controles para el aula",
  controls: [
    { h: "Modo escolar", p: "La casilla School mode quita los enlaces a la app y las promociones del tablero y de cada teléfono." },
    { h: "Equipos", p: "El modo Chorus reparte la clase en 2 a 4 equipos. En Open Floor cada estudiante juega por su cuenta." },
    { h: "Cerrar y quitar", p: "Cierra la sala con Lock room cuando tu clase ya entró. Puedes quitar a cualquier jugador desde la sala de espera." },
    { h: "Pausa y siguiente", p: "Pausa la partida con Pause para comentar una respuesta, o pulsa Next para seguir." },
  ],
  printTitle: "Para imprimir",
  planLink: "Plan de clase",
  handoutLink: "Hoja para estudiantes",
  appTitle: "La app de Polingual",
  appBody: `Quien quiera seguir estudiando en casa puede usar la app de Polingual en iPhone y iPad. Enseña ${FACTS.languageCount} idiomas.`,
  faqTitle: "Preguntas de docentes",
  faq: [
    { q: "¿Cuánto cuesta?", a: "Dirigir una partida y entrar a ella es gratis." },
    { q: "¿El alumnado necesita cuentas?", a: "No. Cada estudiante entra con el código de sala y un apodo elegido de una lista corta. Nadie da su correo ni su nombre real. Quien dirige la partida inicia sesión con un correo." },
    { q: "¿Qué idiomas cubre el juego?", a: `El juego cubre ${TARGETS.length} idiomas: ${quizLanguages("es")}. Las preguntas pueden aparecer en ${promptLanguages("es")}.` },
    { q: "¿Cuántos estudiantes pueden entrar?", a: `Una sala admite hasta ${ROOM_SEATS} jugadores.` },
    { q: "¿Qué necesita cada estudiante?", a: "Un teléfono u otro dispositivo con navegador web. El juego corre en una página web y no hay que instalar nada." },
    { q: "¿Qué pasa con los datos del alumnado?", a: "Los jugadores no dan datos personales y los registros de la sala se borran 24 horas después de que la sala cierra. La página polingual.com/live/student-data, en inglés, tiene los detalles." },
  ],
  print: "Imprimir esta página",
  back: "Polingual para docentes",
  plan: {
    metaTitle: "Plan de clase: una ronda de palabras de diez minutos",
    description: "Un plan de clase de una página, listo para imprimir, para un juego de palabras de Polingual Live de diez minutos.",
    title: "Plan de clase: una ronda de palabras de diez minutos",
    facts: [
      { h: "Tiempo", p: "10 minutos" },
      { h: "Nivel", p: "Cualquiera" },
      { h: "Objetivo", p: "El alumnado reconoce y recuerda palabras en los idiomas que estudia la clase." },
      { h: "Materiales", p: "Un proyector o pantalla compartida y un teléfono por estudiante o por pareja. Imprime una hoja para cada estudiante." },
    ],
    beforeTitle: "Antes de la clase",
    before: [
      `Abre ${LIVE_ADDRESS} en la computadora del aula, inicia sesión con tu correo y acepta los términos para anfitriones.`,
      "Elige el idioma de las preguntas y los idiomas del juego. Activa School mode. Los botones del juego, como Lock room y Start, aparecen en inglés.",
    ],
    tableTitle: "En clase",
    head: { when: "Minuto", what: "Paso", how: "Qué pasa" },
    rows: [
      { when: "0 a 1", what: "Abre la sala", how: "Pulsa Open the room. El tablero muestra el código de sala y un código QR." },
      { when: "1 a 3", what: "Entrada", how: `Cada estudiante abre ${JOIN_ADDRESS}, escribe el código y elige un apodo. Cierra la sala con Lock room cuando todos estén dentro y pulsa Start.` },
      { when: "3 a 9", what: "Partida", how: `${ROUNDS} rondas de ${PER_ROUND} preguntas, ${ANSWER_SECONDS} segundos cada una. Cuando aparezca cada respuesta, la clase dice la palabra en voz alta. Pausa cuando una palabra necesite un minuto.` },
      { when: "9 a 10", what: "Repaso", how: "Lee el tablero final con la clase. Cada estudiante escribe en la hoja las palabras que vio. Descarga el archivo de resultados." },
    ],
    afterTitle: "Después de la clase",
    after: [
      "Pide a cada estudiante que comparta una palabra de su hoja al inicio de la próxima clase.",
      "El archivo de resultados une apodos con puntos. Guárdalo en privado.",
    ],
  },
  handout: {
    metaTitle: "Hoja para estudiantes: entra al juego de la clase",
    description: "Una hoja para imprimir que explica cómo entrar desde el teléfono a un juego de Polingual Live con un código de sala.",
    title: "Entra al juego de la clase",
    lede: "Necesitas un teléfono con navegador web. No necesitas una cuenta.",
    steps: [
      `Abre ${JOIN_ADDRESS} en tu teléfono o escanea el código QR del tablero.`,
      "Escribe el código de sala que ves en el tablero.",
      "Elige un apodo entre los nombres que aparecen.",
      `Cuando se abra una pregunta, toca una de las cuatro respuestas. Tienes ${ANSWER_SECONDS} segundos.`,
    ],
    code: "Código de sala",
    nickname: "Mi apodo",
    wordsTitle: "Palabras de hoy",
    wordsLede: "Después del juego, escribe las palabras que quieres recordar.",
    head: ["Palabra", "Idioma", "Significado"],
    name: "Nombre",
  },
};

const COPY: Record<TeachersLang, TeachersCopy> = { en: EN, es: ES };

export function teachersCopy(lang: TeachersLang): TeachersCopy {
  return COPY[lang];
}

export function isTeachersLang(code: string): code is TeachersLang {
  return code === "en" || code === "es";
}
