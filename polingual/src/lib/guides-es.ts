import { FACTS } from "./facts";
import { BILINGUAL_2009, SIMILARITY_2021 } from "./guide-sources";
import { wordHref, wordRows } from "./guide-words";
import type { Guide } from "./guides";

const JUGAR = { href: "/play", label: "Juega gratis con palabras" };
const CTA = "Descárgala en el App Store";

const TERCER_IDIOMA: Guide = {
  slug: "tercer-idioma-para-bilingues",
  lang: "es",
  pair: "third-language-for-spanish-english-bilinguals",
  title: "Un tercer idioma si hablas español e inglés",
  description: "Qué tercer idioma conviene a quien habla español e inglés, con una tabla de palabras en portugués, italiano, francés y alemán.",
  lede: "Quien habla español e inglés empieza un tercer idioma con dos vocabularios a su favor. La elección depende de cuál de los dos quieres aprovechar.",
  sections: [
    {
      h: "La ventaja de ser bilingüe",
      p: "En un estudio de 2009 de la Universidad Northwestern, sesenta estudiantes aprendieron palabras de un idioma inventado. Los grupos bilingües, uno de inglés y español y otro de inglés y mandarín, dominaron casi el doble de palabras que el grupo monolingüe.",
      more: ["Las palabras inventadas se parecían poco a los idiomas que ya hablaban, así que la ventaja vino de la experiencia de aprender palabras en dos sistemas. Un tercer idioma real suma otra ventaja: palabras parecidas a las que ya conoces."],
    },
    {
      h: "Vocabulario compartido",
      p: "Cada fila enlaza con una página de palabra de Polingual. Lee la fila completa para ver cuál de tus dos idiomas te acerca a cada idioma nuevo.",
      table: {
        caption: "Seis significados en español, inglés y cuatro idiomas candidatos",
        head: ["Español", "Inglés", "Portugués", "Italiano", "Francés", "Alemán"],
        rows: wordRows(["water", "hand", "night", "milk", "book", "new"], ["en", "pt", "it", "fr", "de"], "es"),
      },
      more: [
        "Las columnas de portugués e italiano siguen a la de español fila por fila. El francés comparte el mismo origen latino con otra ortografía y otro sonido, como en leche y lait.",
        "La columna de alemán sigue al inglés: water y Wasser, hand y Hand, milk y Milch, book y Buch. Quien habla español e inglés tiene una llave para cada familia.",
      ],
    },
    {
      h: "Cuatro candidatos",
      p: "El portugués se escribe casi como el español y trae sonidos nuevos, como las vocales nasales de mão. El italiano se pronuncia como se escribe, así que la lectura y el habla avanzan juntas.",
      more: ["El francés te premia dos veces, porque el inglés tomó miles de palabras del francés y el español comparte sus raíces latinas. El alemán conviene cuando quieres apoyarte en tu inglés y salir de la familia romance."],
    },
    {
      h: "Aprender con tus dos idiomas",
      p: "Polingual muestra cada palabra nueva junto a las palabras en español y en inglés del mismo significado. Quien estudia francés ve lait con leche y milk, y quien estudia alemán ve Milch con el mismo par.",
      more: [
        "La app está completa en español y en inglés. La prueba de nivel se hace una vez por idioma, así que te saltas las palabras que ya sabes en cada uno.",
        `Un conjunto admite hasta ${FACTS.setLimit} idiomas de una lista de ${FACTS.languageCount}, y todas las palabras vuelven en un solo repaso espaciado.`,
      ],
    },
    {
      h: "Repaso para las palabras parecidas",
      p: "Las palabras que se parecen a un idioma conocido se aprenden rápido y también se pueden olvidar rápido. En un estudio de 2021, los participantes obtuvieron 34 puntos con palabras de aspecto conocido y 16 con las desconocidas en la primera sesión, en una escala de 100. En la segunda sesión la diferencia bajó a 22 y 18.",
      more: ["Deja las palabras parecidas en el repaso junto con las demás. La ventaja inicial te pone en marcha y el repaso espaciado conserva las palabras."],
    },
  ],
  links: [
    { href: wordHref("water", "es"), label: "Agua en todos los idiomas" },
    { href: wordHref("milk", "es"), label: "Leche en todos los idiomas" },
    { href: "/es/learn/cognados-lenguas-romances", label: "Cognados en las lenguas romances" },
    JUGAR,
  ],
  sources: [BILINGUAL_2009, SIMILARITY_2021],
  faq: [
    { q: "¿Cuál es el mejor tercer idioma si hablo español e inglés?", a: "El portugués y el italiano comparten la mayor parte de su vocabulario con el español. El francés se apoya en tus dos idiomas y el alemán en el inglés." },
    { q: "¿Es más fácil un tercer idioma que el segundo?", a: "En un estudio de 2009 de la Universidad Northwestern, los adultos bilingües aprendieron casi el doble de palabras inventadas que los monolingües." },
    { q: "¿Puedo aprender dos idiomas nuevos a la vez?", a: `Sí. Un conjunto de Polingual admite hasta ${FACTS.setLimit} idiomas y todos comparten un mismo repaso.` },
    { q: "¿Polingual está en español?", a: "Sí. La app funciona en español y en inglés, y esta guía tiene una versión en inglés en polingual.com." },
  ],
  cta: CTA,
};

const COGNADOS: Guide = {
  slug: "cognados-lenguas-romances",
  lang: "es",
  pair: "romance-cognates",
  title: "Cognados en las lenguas romances",
  description: "Cognados del español, el francés, el italiano y el portugués que vienen del latín, con tablas de palabras y los patrones de sonido que los unen.",
  lede: "El español, el francés, el italiano y el portugués nacieron del latín. Una palabra que ya sabes en español suele señalar a sus parientes en los otros idiomas.",
  sections: [
    {
      h: "Una palabra latina en cuatro idiomas",
      p: "Un cognado es una palabra que comparte un antepasado con una palabra de otro idioma. Cada fila enlaza con una página de palabra de Polingual con la pronunciación de cada forma.",
      table: {
        caption: "Palabras latinas y sus descendientes",
        head: ["Español", "Latín", "Francés", "Italiano", "Portugués"],
        rows: wordRows(["hand", "moon", "bread", "wine", "hundred", "sea", "wind", "new"], ["la", "fr", "it", "pt"], "es"),
      },
      more: ["El español y el italiano suelen conservar la vocal final de la raíz latina, como en mano y vino. El francés la pierde, y el portugués pierde la n entre vocales, por eso luna pasa a ser lua."],
    },
    {
      h: "Patrones de sonido",
      p: "Algunos cognados parecen ajenos hasta que conoces el patrón. El grupo latino ct, como en octo, dio ch en español, tt en italiano, e it en francés y en portugués. Los grupos latinos cl y pl al inicio de palabra dieron ll en español y ch en portugués.",
      table: {
        caption: "Dos patrones de sonido del latín en cuatro idiomas",
        head: ["Español", "Latín", "Francés", "Italiano", "Portugués"],
        rows: wordRows(["eight", "night", "milk", "key", "full", "rain"], ["la", "fr", "it", "pt"], "es"),
      },
      more: ["Cuando sabes que la ll del español equivale a la ch del portugués, lluvia y chuva se leen como una sola palabra, y lleno y cheio como otra. El italiano convierte esos grupos en chi y pi, y el francés los conserva."],
    },
    {
      h: "Parejas dentro de la familia",
      p: "Los cuatro idiomas también se dividen en parejas. El español y el portugués dicen comer donde el francés y el italiano dicen manger y mangiare. La misma división da hablar y falar frente a parler y parlare, y querer en los dos idiomas ibéricos frente a vouloir y volere.",
      more: ["El significado también puede cambiar. En italiano carta es papel, mientras que en español y en portugués carta es la que se envía por correo. Comprueba el significado de una palabra parecida la primera vez que la veas."],
    },
    {
      h: "Lo que dice la investigación",
      p: "En un estudio de 2021, los participantes obtuvieron 34 puntos con palabras nuevas parecidas a un idioma que conocían y 16 con las desconocidas en la primera sesión, en una escala de 100. En la segunda sesión la diferencia bajó a 22 y 18.",
      more: ["Los cognados te dan un comienzo rápido y el repaso espaciado los conserva. Repasar juntos los cognados de un significado también deja ver las diferencias pequeñas, como la tilde nasal de pão."],
    },
    {
      h: "Práctica",
      p: `Polingual muestra cada significado una vez con su palabra en todos los idiomas de tu conjunto, y un conjunto admite hasta ${FACTS.setLimit} idiomas. El francés, el italiano y el portugués caben junto al inglés en un conjunto con un solo repaso espaciado.`,
      more: ["Entre los juegos gratis está Same word, que pide emparejar un significado en varios idiomas. Las páginas de palabras muestran las formas de cada palabra una junto a otra."],
    },
  ],
  links: [
    { href: wordHref("night", "es"), label: "Noche en todos los idiomas" },
    { href: wordHref("rain", "es"), label: "Lluvia en todos los idiomas" },
    { href: "/es/learn/tercer-idioma-para-bilingues", label: "Un tercer idioma si hablas español e inglés" },
    JUGAR,
  ],
  sources: [SIMILARITY_2021],
  faq: [
    { q: "¿Qué es un cognado?", a: "Una palabra que comparte un antepasado con una palabra de otro idioma, como noche en español y nuit en francés, que vienen del latín nox." },
    { q: "¿El inglés tiene cognados con el español?", a: "Sí. El inglés tomó muchas palabras del francés y del latín, por eso music, fruit, lion y minute se parecen a música, fruta, león y minuto." },
    { q: "¿Los cognados siempre significan lo mismo?", a: "La mayoría sí, y algunos cambian. En italiano carta es papel y en español carta es la que se envía por correo." },
    { q: "¿Cómo practico los cognados?", a: "Estudia las palabras emparentadas como un solo grupo. Polingual muestra un significado con su palabra en cada uno de tus idiomas y las repasa en una misma cola." },
  ],
  cta: CTA,
};

export const ES_GUIDES: Guide[] = [TERCER_IDIOMA, COGNADOS];
