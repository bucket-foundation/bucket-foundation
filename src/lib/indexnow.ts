// IndexNow key — ownership verified via public/<KEY>.txt
// Single source of truth for the IndexNow ping route + CLI script.
export const INDEXNOW_KEY =
  "b254d06bf09a600cccd29a489b7a0bb90097fd22c976105b9edcbb77b6fc56f2";

export const INDEXNOW_HOST = "www.bucket.foundation";
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

// IndexNow endpoints — one POST fans out to Bing, Yandex, Seznam, Naver.
export const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/IndexNow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];
