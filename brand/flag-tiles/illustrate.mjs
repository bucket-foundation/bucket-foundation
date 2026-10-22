import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const crafts = JSON.parse(readFileSync(join(root, "crafts.json"), "utf8"));
const repeat = (count, draw) =>
  Array.from({ length: count }, (_, i) => draw(i)).join("");
const rect = (x, y, w, h, fill, rx = 0, rest = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${rest}/>`;
const ellipse = (cx, cy, rx, ry, fill, rest = "") =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${rest}/>`;
const circle = (cx, cy, r, fill, rest = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${rest}/>`;
const path = (d, fill, rest = "") => `<path d="${d}" fill="${fill}" ${rest}/>`;
const line = (x1, y1, x2, y2, stroke, width = 1, rest = "") =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${width}" ${rest}/>`;
const group = (transform, body, rest = "") =>
  `<g transform="${transform}" ${rest}>${body}</g>`;
const shadow = (x, y, rx, ry = 13) =>
  ellipse(x, y, rx, ry, "#3b4739", 'opacity=".13" filter="url(#blur)"');
const tile = (x, y, size, accent, motif = "") =>
  group(
    `translate(${x} ${y})`,
    rect(0, 5, size, size, "#babbae", 3) +
      rect(0, 0, size, size, "url(#ceramic)", 3, 'stroke="#c5c7b8"') +
      rect(
        8,
        8,
        size - 16,
        size - 16,
        "none",
        1,
        `stroke="${accent}" stroke-width="1.4"`,
      ) +
      motif,
  );

const scenes = {
  PT: (a) =>
    shadow(322, 306, 165) +
    group(
      "translate(165 67) rotate(-7 145 108)",
      repeat(6, (i) => {
        const x = (i % 3) * 98;
        const y = Math.floor(i / 3) * 98;
        return tile(
          x,
          y,
          92,
          a,
          path(
            "M22 25C39 15 54 15 70 25M22 67C39 77 54 77 70 67",
            "none",
            `stroke="${a}" stroke-width="6" stroke-linecap="round"`,
          ) +
            circle(46, 46, 11, a) +
            circle(46, 46, 4, "#faf7e9"),
        );
      }),
    ) +
    group(
      "translate(440 260) rotate(9)",
      tile(
        0,
        0,
        65,
        a,
        circle(32, 32, 12, "none", `stroke="${a}" stroke-width="4"`),
      ),
    ) +
    line(120, 326, 503, 326, "#d4d7c9"),

  JP: (a) =>
    shadow(325, 315, 139) +
    path(
      "M176 193C188 275 236 308 320 308C404 308 452 275 464 193Z",
      "url(#lacquer)",
      'stroke="#502329" stroke-width="2"',
    ) +
    ellipse(320, 191, 144, 48, "#4f2028", 'stroke="#ad675c" stroke-width="3"') +
    ellipse(320, 188, 132, 38, a) +
    ellipse(320, 184, 119, 28, "url(#bowl)") +
    path(
      "M200 214C225 265 260 281 286 284",
      "none",
      'stroke="#f6c1a0" stroke-width="6" opacity=".35" stroke-linecap="round"',
    ) +
    path(
      "M340 291C381 287 411 266 432 238",
      "none",
      'stroke="#2c1421" stroke-width="6" opacity=".28" stroke-linecap="round"',
    ) +
    ellipse(320, 309, 67, 10, "#562d2a") +
    ellipse(320, 305, 65, 8, "#772d31") +
    group(
      "rotate(-8 380 114)",
      rect(235, 107, 252, 6, "#735e42", 3) +
        rect(251, 125, 252, 6, "#9f8661", 3),
    ),

  MX: (a) =>
    shadow(315, 322, 137) +
    group(
      "translate(320 202) rotate(-12)",
      ellipse(0, 7, 136, 116, "#c8bc9c") +
        ellipse(
          0,
          0,
          136,
          116,
          "url(#ceramic)",
          'stroke="#d2c8b0" stroke-width="2"',
        ) +
        ellipse(0, 0, 119, 100, "none", `stroke="${a}" stroke-width="6"`) +
        ellipse(0, 0, 82, 68, "#f2eedc", `stroke="${a}" stroke-width="3"`) +
        repeat(28, (i) => {
          const n = (i * Math.PI) / 14;
          return circle(
            Math.cos(n) * 101,
            Math.sin(n) * 85,
            i % 2 ? 4 : 6,
            i % 2 ? "#c4953e" : a,
          );
        }) +
        repeat(8, (i) =>
          group(
            `rotate(${i * 45})`,
            path(
              "M0 -16C-13 -29 -12 -45 0 -53C12 -45 13 -29 0 -16Z",
              i % 2 ? "#8b9b65" : a,
            ),
          ),
        ) +
        circle(0, 0, 10, "#c4953e"),
    ) +
    ellipse(465, 307, 31, 10, "#c8ba92") +
    path("M438 287L443 307Q465 322 488 307L494 287Z", "url(#ceramic)") +
    ellipse(466, 287, 28, 11, a),

  IN: (a) =>
    shadow(321, 307, 185) +
    group(
      "translate(122 100) rotate(-7 172 100)",
      rect(0, 0, 318, 205, "#d7c7a7", 2) +
        rect(6, 4, 306, 195, "#f5ead4", 1, 'filter="url(#grain)"') +
        repeat(35, (i) => {
          const x = 29 + (i % 7) * 44;
          const y = 28 + Math.floor(i / 7) * 38;
          return (
            circle(x, y, 7, a, 'opacity=".8"') +
            circle(x + 12, y + 13, 2, "#8c6d45", 'opacity=".65"')
          );
        }) +
        repeat(28, (i) => line(5 + i * 11, 201, 6 + i * 11, 213, "#c4b99a", 1)),
    ) +
    group(
      "translate(402 197) rotate(17)",
      rect(0, 10, 94, 73, "#6c4e36", 6) +
        rect(0, 0, 94, 73, "url(#wood)", 6, 'stroke="#8e6c4b"') +
        rect(30, -13, 34, 43, "#936f4b", 7) +
        path(
          "M35 -9V22M41 -9V22M47 -9V22M53 -9V22M59 -9V22",
          "none",
          'stroke="#b69268" stroke-width="1"',
        ) +
        repeat(6, (i) =>
          circle(19 + (i % 3) * 28, 43 + Math.floor(i / 3) * 18, 4, "#bb9771"),
        ),
    ) +
    ellipse(487, 126, 47, 17, "#b7a180") +
    ellipse(487, 123, 42, 14, a),

  GH: (a) =>
    shadow(326, 311, 167) +
    group(
      "translate(165 76) rotate(8 155 120)",
      repeat(8, (i) => {
        const colors = [
          "#b77c35",
          "#e3ba57",
          "#697759",
          "#bc8e51",
          "#b56943",
          "#d3b36a",
          "#617b68",
          "#d3aa53",
        ];
        return (
          rect(i * 38, (i % 2) * 10, 35, 221 - (i % 3) * 10, colors[i], 1) +
          rect(i * 38, (i % 2) * 10, 35, 221 - (i % 3) * 10, "url(#weave)") +
          repeat(5, (j) =>
            rect(
              i * 38,
              29 + j * 37 + (i % 2) * 10,
              35,
              j % 2 ? 2 : 4,
              "#f5e4ba",
              0,
              'opacity=".55"',
            ),
          ) +
          repeat(8, (j) =>
            line(
              i * 38 + 3 + j * 4,
              221 - (i % 3) * 10,
              i * 38 + 3 + j * 4,
              238 - (i % 3) * 10,
              colors[i],
              1.5,
            ),
          )
        );
      }),
    ) +
    group(
      "rotate(-14 137 275)",
      path("M105 269Q135 248 167 269Q135 288 105 269Z", "#8c6946") +
        path("M121 268L152 268", "none", `stroke="${a}" stroke-width="8"`),
    ),

  MA: (a) =>
    shadow(318, 316, 160) +
    group(
      "translate(181 75) rotate(-9 137 113)",
      rect(-7, 0, 285, 235, "#b3aa8f", 2) +
        rect(-7, -7, 285, 235, "#e7ddc4", 2) +
        repeat(25, (i) => {
          const x = (i % 5) * 53;
          const y = Math.floor(i / 5) * 43;
          const colors = [a, "#d8b971", "#eee7cf", "#456b6b"];
          return (
            rect(
              x,
              y,
              49,
              39,
              colors[(i * 3 + Math.floor(i / 5)) % 4],
              1,
              'stroke="#c8c0a8" stroke-width=".6"',
            ) +
            path(
              `M${x + 4} ${y + 3}H${x + 45}`,
              "none",
              'stroke="#ffffff77" stroke-width="1.4"',
            )
          );
        }),
    ) +
    group(
      "translate(480 283) rotate(19)",
      rect(0, 0, 33, 28, a, 1) +
        rect(39, 11, 27, 24, "#d8b971", 1) +
        path("M8 41L33 48L13 64Z", "#486c69"),
    ) +
    path("M130 252L144 281L125 300L113 274Z", "#bfa16c"),

  TR: (a) =>
    shadow(320, 322, 137) +
    ellipse(320, 207, 141, 111, "#c9baa0") +
    ellipse(
      320,
      200,
      141,
      111,
      "url(#ceramic)",
      'stroke="#d1c7ae" stroke-width="2"',
    ) +
    ellipse(320, 200, 123, 96, "none", 'stroke="#467f8b" stroke-width="4"') +
    ellipse(
      320,
      200,
      88,
      67,
      "#f5f0e1",
      'stroke="#739a98" stroke-width="1.7"',
    ) +
    repeat(24, (i) => {
      const n = (i * Math.PI) / 12;
      const x = 320 + Math.cos(n) * 107;
      const y = 200 + Math.sin(n) * 82;
      return ellipse(
        x,
        y,
        3,
        6,
        i % 2 ? a : "#467f8b",
        `transform="rotate(${i * 15} ${x} ${y})"`,
      );
    }) +
    path(
      "M261 211C285 173 310 243 338 195C354 172 371 179 381 196",
      "none",
      `stroke="${a}" stroke-width="5" stroke-linecap="round"`,
    ) +
    path(
      "M268 193C292 218 312 170 342 211C353 224 367 216 376 207",
      "none",
      'stroke="#427d88" stroke-width="3" stroke-linecap="round"',
    ) +
    ellipse(
      270,
      158,
      33,
      5,
      "white",
      'transform="rotate(-28 270 158)" opacity=".55"',
    ),

  IT: (a) =>
    shadow(318, 321, 109) +
    path(
      "M278 103L278 143C249 161 222 195 222 237C222 285 256 313 320 313C384 313 418 285 418 237C418 195 391 161 362 143L362 103Z",
      "url(#ceramic)",
      'stroke="#c7c3ae" stroke-width="2"',
    ) +
    path(
      "M246 180C205 142 187 188 209 229C219 247 227 246 235 244M394 180C435 142 453 188 431 229C421 247 413 246 405 244",
      "none",
      `stroke="${a}" stroke-width="12"`,
    ) +
    ellipse(320, 105, 42, 12, a) +
    ellipse(320, 102, 34, 7, "#b0aea0") +
    path(
      "M248 189Q320 211 392 189M239 222Q320 246 401 222M252 274Q320 294 388 274",
      "none",
      `stroke="${a}" stroke-width="4"`,
    ) +
    repeat(9, (i) =>
      circle(
        256 + i * 16,
        250 + Math.sin((i * Math.PI) / 8) * 7,
        4,
        i % 2 ? "#b6a150" : a,
      ),
    ) +
    path(
      "M263 167C239 198 242 250 260 274",
      "none",
      'stroke="white" stroke-width="8" stroke-linecap="round" opacity=".55"',
    ) +
    ellipse(320, 310, 60, 8, "#d3d0be"),

  FR: (a) =>
    shadow(316, 318, 138) +
    group(
      "translate(320 204) rotate(-12)",
      ellipse(0, 7, 128, 107, "#7a593c") +
        ellipse(
          0,
          0,
          128,
          107,
          "url(#copper)",
          'stroke="#8f704a" stroke-width="2"',
        ) +
        ellipse(0, 0, 113, 93, "#3d6d78", `stroke="${a}" stroke-width="3"`) +
        repeat(6, (i) => {
          const n = (i * Math.PI) / 3;
          return ellipse(
            Math.cos(n) * 63,
            Math.sin(n) * 51,
            28,
            22,
            i % 2 ? "#809a96" : "#416b7c",
            `stroke="${a}" stroke-width="4" transform="rotate(${i * 60} ${Math.cos(n) * 63} ${Math.sin(n) * 51})"`,
          );
        }) +
        ellipse(0, 0, 32, 27, "#d1b986", 'stroke="#997541" stroke-width="4"') +
        path(
          "M-101 -36Q-42 -85 48 -73",
          "none",
          'stroke="#ffffff88" stroke-width="3" stroke-linecap="round"',
        ),
    ) +
    group(
      "translate(486 234) rotate(20)",
      rect(0, 0, 10, 76, "#7f6347", 3) + path("M-5 74L15 74L5 95Z", "#b39b74"),
    ),

  NL: (a) =>
    shadow(325, 324, 103) +
    path(
      "M290 73L290 139C275 156 251 167 243 195C227 252 244 305 274 313H376C406 305 423 252 407 195C399 167 375 156 360 139V73Z",
      "url(#ceramic)",
      'stroke="#c6c8bd" stroke-width="2"',
    ) +
    ellipse(325, 74, 35, 10, a) +
    ellipse(325, 72, 27, 6, "#b0b7ae") +
    path(
      "M287 122H363M255 178Q325 199 395 178M246 275Q325 299 404 275",
      "none",
      `stroke="${a}" stroke-width="5"`,
    ) +
    repeat(5, (i) =>
      path(
        `M252 ${205 + i * 13}C280 ${188 + i * 13} 295 ${224 + i * 13} 323 ${205 + i * 13}S370 ${188 + i * 13} 399 ${205 + i * 13}`,
        "none",
        `stroke="${a}" stroke-width="2.5" opacity="${0.7 + i * 0.05}"`,
      ),
    ) +
    path(
      "M272 180C252 220 258 268 270 288",
      "none",
      'stroke="white" stroke-width="8" opacity=".65" stroke-linecap="round"',
    ) +
    group(
      "translate(466 282)",
      ellipse(0, 9, 35, 12, "#c8c9bc") +
        ellipse(0, 0, 35, 12, "url(#ceramic)") +
        ellipse(0, 0, 26, 7, "none", `stroke="${a}" stroke-width="2"`),
    ),

  FI: (a) =>
    shadow(319, 319, 115) +
    ellipse(319, 318, 101, 20, a, 'opacity=".09"') +
    path(
      "M249 96L264 298Q319 328 374 298L389 96Z",
      "url(#glass)",
      'stroke="#91b3b8" stroke-width="2"',
    ) +
    path(
      "M268 115L277 290Q319 311 361 290L370 115",
      "none",
      'stroke="#fafffc" stroke-width="6" opacity=".8"',
    ) +
    ellipse(
      319,
      96,
      70,
      23,
      "#d6e3dd",
      'fill-opacity=".35" stroke="#a0bcc1" stroke-width="3"',
    ) +
    ellipse(
      319,
      96,
      61,
      16,
      "#c7d9d8",
      'fill-opacity=".4" stroke="#fbfff6" stroke-width="2"',
    ) +
    ellipse(
      319,
      294,
      54,
      18,
      "#8eb7bb",
      'fill-opacity=".18" stroke="#9cbec0" stroke-width="2"',
    ) +
    path(
      "M292 123L298 286M342 122L337 283",
      "none",
      'stroke="#fcfff9" stroke-width="3" opacity=".72"',
    ) +
    group(
      "translate(455 234)",
      path(
        "M-31 0L-25 67Q0 80 25 67L31 0Z",
        "url(#glass)",
        'stroke="#a5c0bd" stroke-width="1.5"',
      ) +
        ellipse(
          0,
          0,
          31,
          10,
          "#cddfd6",
          'fill-opacity=".5" stroke="#a9c2bb" stroke-width="2"',
        ) +
        line(-20, 15, -17, 59, "#ffffffa1", 3),
    ),

  PE: (a) =>
    shadow(327, 315, 165) +
    group(
      "translate(173 65) rotate(-7 133 124)",
      repeat(4, (i) => {
        const cols = ["#a75749", "#c59a6a", "#7b7161", "#b97758"];
        return (
          rect(i * 67, 0, 64, 233, cols[i], 1) +
          rect(i * 67, 0, 64, 233, "url(#weave)") +
          repeat(8, (j) =>
            rect(
              i * 67,
              21 + j * 25,
              64,
              j % 2 ? 3 : 1,
              "#ead5af",
              0,
              'opacity=".65"',
            ),
          ) +
          repeat(13, (j) =>
            line(
              i * 67 + 2 + j * 5,
              233,
              i * 67 + 4 + j * 5,
              252 - (j % 3) * 3,
              cols[i],
              2,
            ),
          )
        );
      }),
    ) +
    group(
      "translate(484 260) rotate(17)",
      ellipse(0, 0, 34, 25, "#a75749") +
        repeat(9, (i) =>
          path(
            `M${-27 + i * 6} -17Q${-35 + i * 8} 0 ${-27 + i * 6} 17`,
            "none",
            'stroke="#d69b7c" stroke-width="2"',
          ),
        ),
    ) +
    path("M480 282Q505 311 529 294", "none", `stroke="${a}" stroke-width="2"`),

  KR: (a) =>
    shadow(322, 319, 112) +
    path(
      "M277 100L276 136C258 151 227 184 224 227C220 278 248 312 319 315C390 312 418 278 414 227C411 184 380 151 362 136L361 100Z",
      "url(#stoneware)",
      'stroke="#84897c" stroke-width="2"',
    ) +
    ellipse(319, 102, 42, 12, "#8a8b7c") +
    ellipse(319, 100, 33, 7, "#5e695d") +
    path(
      "M259 156C283 164 351 173 379 158L396 194C345 205 279 196 244 186ZM237 215C279 227 347 232 408 219L408 242C364 261 285 255 233 242ZM245 270C299 279 347 288 394 274L382 297C331 309 274 300 257 292Z",
      "#e8e5d6",
      'filter="url(#grain)" opacity=".9"',
    ) +
    path(
      "M266 163C247 193 244 244 264 274",
      "none",
      'stroke="#ffffff" stroke-width="4" opacity=".27" stroke-linecap="round"',
    ) +
    ellipse(319, 313, 62, 8, a, 'opacity=".55"') +
    ellipse(466, 294, 37, 14, "url(#stoneware)") +
    ellipse(466, 288, 37, 13, "#dcdcca", 'stroke="#9ba18c" stroke-width="2"'),

  BR: (a) =>
    shadow(329, 319, 168) +
    group(
      "translate(153 66) skewY(-4)",
      rect(0, 5, 330, 245, "#c1c5b5", 2) +
        repeat(24, (i) => {
          const x = (i % 6) * 55;
          const y = Math.floor(i / 6) * 60;
          const side = i % 3 === 0;
          return (
            rect(
              x,
              y,
              53,
              58,
              "url(#ceramic)",
              1,
              'stroke="#d2d4c4" stroke-width="1"',
            ) +
            rect(x + (side ? 7 : 34), y + 9, side ? 13 : 10, 38, a, 1) +
            rect(
              x + (side ? 26 : 8),
              y + (i % 2 ? 32 : 10),
              18,
              6,
              "#87a79c",
              1,
            )
          );
        }),
    ) +
    rect(445, 308, 60, 7, "#b9bcae", 1) +
    group(
      "translate(457 293) rotate(11)",
      rect(0, 0, 55, 44, "url(#ceramic)", 2) + rect(9, 8, 11, 28, a, 1),
    ),

  ID: (a) =>
    shadow(321, 311, 169) +
    group(
      "translate(155 83) rotate(7 160 108)",
      path("M0 0H316L329 221L12 211Z", "#ded1b5", 'filter="url(#grain)"') +
        path("M7 7H310L321 212L19 203Z", a) +
        repeat(56, (i) => {
          const x = 30 + (i % 8) * 38;
          const y = 27 + Math.floor(i / 8) * 27;
          return (
            circle(x, y, 4, "#f1dfbd") +
            circle(x + 11, y + 8, 1.5, "#f1dfbd") +
            circle(x - 10, y + 8, 1.5, "#f1dfbd")
          );
        }) +
        path("M18 199L318 207", "none", 'stroke="#d7c3a1" stroke-width="3"'),
    ) +
    group(
      "translate(484 99) rotate(27)",
      rect(-4, 9, 9, 92, "#8c6a43", 4) +
        ellipse(0, 4, 22, 15, "url(#copper)") +
        ellipse(0, 0, 19, 10, "#c6a165") +
        path(
          "M17 0Q39 -1 40 14L31 20",
          "none",
          'stroke="#b78d53" stroke-width="5" stroke-linecap="round"',
        ),
    ) +
    ellipse(125, 291, 26, 10, "#c6a367") +
    ellipse(125, 287, 22, 7, "#e4c995"),

  NZ: (a) =>
    shadow(319, 319, 168) +
    path(
      "M171 186L187 291Q236 315 285 291L301 186Z",
      "url(#clay)",
      'stroke="#ad7956" stroke-width="2" filter="url(#grain)"',
    ) +
    ellipse(236, 186, 65, 22, "#c7926d") +
    ellipse(236, 185, 54, 16, "#8f6549") +
    path(
      "M355 143L365 281Q412 306 459 281L469 143Z",
      "url(#clay)",
      'stroke="#b27e5a" stroke-width="2" filter="url(#grain)"',
    ) +
    ellipse(412, 143, 57, 18, "#d09b73") +
    ellipse(412, 142, 47, 12, "#90664b") +
    path(
      "M297 265L303 307Q329 322 355 307L361 265Z",
      "url(#clay)",
      'stroke="#b47e58" stroke-width="1.5"',
    ) +
    ellipse(329, 265, 32, 11, "#d49e76") +
    ellipse(329, 264, 25, 7, "#95684b") +
    path(
      "M190 214Q236 232 282 214M194 250Q236 267 278 250M366 181Q412 196 458 181M369 229Q412 245 455 229",
      "none",
      'stroke="#a97250" stroke-width="1.8" opacity=".6"',
    ) +
    path(
      "M203 205L213 282M383 161L390 276",
      "none",
      'stroke="#e8ba8d" stroke-width="7" opacity=".45" stroke-linecap="round"',
    ),
};

const icons = {
  PT: '<rect x="7" y="7" width="34" height="34" rx="3"/><path d="M24 7V41M7 24H41M12 12L19 19M29 29L36 36"/>',
  JP: '<path d="M6 20C8 32 15 38 24 38S40 32 42 20M17 37V41H31V37"/><ellipse cx="24" cy="19" rx="18" ry="6"/><path d="M11 10L38 7M12 14L40 11"/>',
  MX: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="3"/><path d="M24 6V10M24 38V42M6 24H10M38 24H42"/>',
  IN: '<path d="M9 22L33 17L40 34L15 40Z"/><path d="M18 20L16 11Q22 5 28 9L31 18M13 27L35 22M16 31L36 26"/>',
  GH: '<path d="M8 6V42M16 6V42M24 6V42M32 6V42M40 6V42M5 13H43M5 23H43M5 33H43"/>',
  MA: '<rect x="6" y="7" width="16" height="15" rx="1"/><rect x="26" y="7" width="15" height="15" rx="1"/><path d="M6 27H22V42H6ZM28 30L40 27L43 39L31 42Z"/>',
  TR: '<ellipse cx="24" cy="24" rx="19" ry="16"/><ellipse cx="24" cy="24" rx="13" ry="10"/><path d="M15 26Q21 17 26 25T34 23"/>',
  IT: '<path d="M19 8H29V16C37 21 39 30 33 38Q24 43 15 38C9 30 11 21 19 16ZM12 22C2 15 2 31 12 31M36 22C46 15 46 31 36 31M16 28Q24 32 32 28"/>',
  FR: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="4"/><path d="M24 11V20M24 28V37M11 24H20M28 24H37"/>',
  NL: '<path d="M19 5H29V15C37 19 40 27 35 39Q24 44 13 39C8 27 11 19 19 15ZM13 26Q18 21 24 26T35 26M13 32Q18 27 24 32T35 32"/>',
  FI: '<ellipse cx="24" cy="10" rx="13" ry="4"/><path d="M11 10L14 38Q24 44 34 38L37 10M17 17L19 35M30 17L28 35"/>',
  PE: '<path d="M9 7H39V38H9ZM19 7V38M29 7V38M9 15H39M9 29H39M11 38V43M17 38V43M23 38V43M29 38V43M35 38V43"/>',
  KR: '<path d="M18 9H30V16C37 21 41 31 35 38Q24 43 13 38C7 31 11 21 18 16ZM12 25Q24 30 37 25M12 33Q24 38 36 33"/><ellipse cx="24" cy="9" rx="6" ry="2"/>',
  BR: '<rect x="6" y="6" width="36" height="36" rx="2"/><path d="M24 6V42M6 24H42M12 12V19M30 13H36M12 30H18M35 30V36"/>',
  ID: '<path d="M9 20L7 42M13 20L11 42M18 10L38 8L35 23L16 24Z"/><ellipse cx="11" cy="16" rx="7" ry="5"/><path d="M17 14Q25 12 25 19L21 22"/><circle cx="25" cy="15" r="1"/><circle cx="31" cy="18" r="1"/>',
  NZ: '<ellipse cx="24" cy="12" rx="14" ry="5"/><path d="M10 12L14 37Q24 43 34 37L38 12M13 26Q24 30 35 26"/><ellipse cx="24" cy="12" rx="9" ry="2"/>',
};

function document(craft, art) {
  const a = craft.accent;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400" role="img" aria-label="Original ${craft.title} material study">
<defs>
<linearGradient id="paper" x2="0" y2="1"><stop stop-color="#f7f4e9"/><stop offset="1" stop-color="#e9e7d9"/></linearGradient>
<linearGradient id="ceramic" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#fffff4"/><stop offset=".38" stop-color="#f4f1de"/><stop offset=".75" stop-color="#e5e3d3"/><stop offset="1" stop-color="#d0d1c0"/></linearGradient>
<linearGradient id="lacquer" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#7e2630"/><stop offset=".35" stop-color="#b64c49"/><stop offset=".6" stop-color="#8c2f37"/><stop offset="1" stop-color="#4e222b"/></linearGradient>
<radialGradient id="bowl"><stop stop-color="#5d2930"/><stop offset=".8" stop-color="#7d2d34"/><stop offset="1" stop-color="#a54342"/></radialGradient>
<linearGradient id="wood" x2=".8" y2="1"><stop stop-color="#b18b5d"/><stop offset=".45" stop-color="#9d764e"/><stop offset="1" stop-color="#715036"/></linearGradient>
<linearGradient id="copper" x2=".9" y2="1"><stop stop-color="#dec69a"/><stop offset=".4" stop-color="#bc955d"/><stop offset=".7" stop-color="#e3c790"/><stop offset="1" stop-color="#8f6539"/></linearGradient>
<linearGradient id="glass" x2="1" y2=".2"><stop stop-color="#a1c8c8" stop-opacity=".65"/><stop offset=".12" stop-color="#eff7ec" stop-opacity=".85"/><stop offset=".32" stop-color="#bed6d4" stop-opacity=".26"/><stop offset=".65" stop-color="#9dc4c6" stop-opacity=".3"/><stop offset=".88" stop-color="#edf7ed" stop-opacity=".86"/><stop offset="1" stop-color="#77aab3" stop-opacity=".6"/></linearGradient>
<linearGradient id="stoneware" x2="1" y2=".3"><stop stop-color="#9fa28c"/><stop offset=".3" stop-color="#bbc0a7"/><stop offset=".7" stop-color="#9ba58e"/><stop offset="1" stop-color="#7a8775"/></linearGradient>
<linearGradient id="clay" x2="1" y2=".15"><stop stop-color="#b47c57"/><stop offset=".27" stop-color="#d7a17a"/><stop offset=".65" stop-color="#cb926c"/><stop offset="1" stop-color="#ae7452"/></linearGradient>
<pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0H4M0 2H4" stroke="#fff7da" stroke-width=".6" opacity=".24"/><path d="M1 0V4M3 0V4" stroke="#554830" stroke-width=".5" opacity=".22"/></pattern>
<filter id="blur" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="17" result="noise"/><feColorMatrix in="noise" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".07"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
</defs>
${rect(0, 0, 640, 400, "url(#paper)")}
${circle(332, 183, 143, "#ffffff", 'opacity=".2"')}
${line(74, 335, 566, 335, "#d9dace", 1)}
${art}
${circle(45, 40, 3, a)}
<text x="57" y="43" font-family="Arial, sans-serif" font-size="9" letter-spacing="2.1" fill="#6b7663">MATERIAL STUDY</text>
<text x="594" y="43" text-anchor="end" font-family="Arial, sans-serif" font-size="10" letter-spacing="2" fill="#6b7663">${craft.code}</text>
<text x="44" y="375" font-family="Arial, sans-serif" font-size="8" letter-spacing="1.4" fill="#7f8775">ORIGINAL FORM / CRAFT REFERENCE</text>
</svg>\n`;
}

mkdirSync(join(root, "illustrations"), { recursive: true });
mkdirSync(join(root, "icons"), { recursive: true });
for (const craft of crafts) {
  if (
    !/^[A-Z]{2}$/.test(craft.code) ||
    !/^#[0-9a-f]{6}$/i.test(craft.accent) ||
    !scenes[craft.code] ||
    !icons[craft.code]
  )
    throw new Error(`Missing illustration for ${craft.code}`);
  const name = craft.code.toLowerCase();
  writeFileSync(
    join(root, "illustrations", `${name}.svg`),
    document(craft, scenes[craft.code](craft.accent)),
  );
  writeFileSync(
    join(root, "icons", `${name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="${craft.accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[craft.code]}</svg>\n`,
  );
}
process.stdout.write(
  `Built ${crafts.length} original illustrations and ${crafts.length} icons.\n`,
);
