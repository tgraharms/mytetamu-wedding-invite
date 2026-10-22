/**
 * Matematik tulen untuk karusel gelung. TIADA DOM di sini, dengan sengaja.
 *
 * Sebabnya praktikal: kelakuan skrol tidak boleh diperhatikan langsung dalam
 * persekitaran pembangunan projek ini (anak tetingkap pratonton melaporkan
 * dokumen sebagai tidak kelihatan, jadi tiada peristiwa skrol, tiada
 * peralihan CSS). Kalau logik gelung bercampur dengan DOM, tiada satu pun
 * daripadanya boleh dibuktikan sebelum ia sampai ke telefon tetamu. Dipisahkan
 * begini, setiap keputusan yang boleh menyebabkan barisan TERSENTAK di depan
 * mata tetamu ialah fungsi tulen ke atas nombor — dan itu boleh diuji habis-habisan
 * dalam node. Lihat scripts/carousel-gelung.test.mjs.
 *
 * MODEL. Barisan sebenar mempunyai `bilangan` kad. Kita menambah `klon` salinan
 * cermin di HADAPAN (ekor senarai) dan `klon` lagi di BELAKANG (kepala senarai),
 * sekali sahaja semasa pemasangan. Kedudukan dinomborkan sebagai "trek":
 *
 *     trek:  0 .. klon-1        cermin ekor
 *            klon .. klon+n-1   kad SEBENAR (jalur rumah)
 *            klon+n .. M-1      cermin kepala
 *
 * Dengan pelapik tepi selebar (pandangan - lebarKad) / 2 — pelapik yang sama
 * yang sudah digunakan hari ini untuk memusatkan kad hujung — trek t berpusat
 * tepat pada scrollLeft = t * langkah. Itu menjadikan semua aritmetik di bawah
 * pendaraban, bukan anggaran.
 */

export interface Geometri {
  /** Bilangan kad SEBENAR. */
  bilangan: number;
  /** Bilangan cermin pada setiap belah. */
  klon: number;
  /** Lebar satu kad campur jurang antara kad. */
  langkah: number;
  /** Lebar bahagian dalam bekas yang kelihatan. */
  pandangan: number;
  /** scrollLeft maksimum yang dibenarkan pelayar. */
  maks: number;
}

/** Satu pusingan penuh senarai sebenar, dalam piksel. */
export const kitaran = (g: Geometri): number => g.bilangan * g.langkah;

/** Jumlah trek termasuk cermin. */
export const jumlahTrek = (g: Geometri): number => g.bilangan + 2 * g.klon;

/** scrollLeft yang memusatkan trek ke-t. */
export const sasaranTrek = (t: number, g: Geometri): number => t * g.langkah;

/** scrollLeft permulaan: kad sebenar pertama, dengan cermin mengintai di kiri. */
export const leretMula = (g: Geometri): number => sasaranTrek(g.klon, g);

const nomborElok = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x);

/**
 * Berapa banyak cermin diperlukan setiap belah.
 *
 * Cukup untuk menutup satu pandangan penuh (supaya tiada ruang kosong pernah
 * terdedah) campur dua kad landasan tambahan, supaya leretan laju masih ada
 * tempat untuk meluncur sebelum lompatan sempat berlaku. Tidak pernah melebihi
 * bilangan kad sebenar — mencerminkan lebih daripada satu pusingan penuh
 * bermakna kad yang sama muncul dua kali dalam satu pandangan.
 */
export function kiraKlon(bilangan: number, pandangan: number, langkah: number): number {
  if (!bolehGelung(bilangan, pandangan, langkah)) return 0;
  return Math.min(bilangan, Math.ceil(pandangan / langkah) + 2);
}

/**
 * Layakkah senarai ini digelungkan langsung?
 *
 * Syarat terakhir ialah yang paling penting: satu pusingan mesti lebih panjang
 * daripada pandangan campur satu langkah. Itulah yang menjamin sesuatu kad dan
 * cerminnya sendiri TIDAK PERNAH kelihatan serentak — kalau boleh, tetamu akan
 * nampak item yang sama dua kali bersebelahan dan gelung itu terbongkar.
 */
export function bolehGelung(bilangan: number, pandangan: number, langkah: number): boolean {
  if (!nomborElok(bilangan) || !nomborElok(pandangan) || !nomborElok(langkah)) return false;
  if (!Number.isInteger(bilangan) || bilangan < 3) return false;
  if (langkah <= 0 || pandangan <= 0) return false;
  return bilangan * langkah >= pandangan + langkah;
}

/** Bina geometri daripada ukuran mentah; null bermakna jangan gelung. */
export function binaGeometri(ukuran: {
  bilangan: number;
  pandangan: number;
  langkah: number;
  maks: number;
}): Geometri | null {
  const { bilangan, pandangan, langkah, maks } = ukuran;
  if (!bolehGelung(bilangan, pandangan, langkah)) return null;
  if (!nomborElok(maks) || maks <= 0) return null;
  const klon = kiraKlon(bilangan, pandangan, langkah);
  const g: Geometri = { bilangan, klon, langkah, pandangan, maks };
  // Pemeriksaan penutup: hujung skrol mesti benar-benar memusatkan trek
  // terakhir. Kalau tidak, pelapik tepi tidak seperti yang diandaikan dan
  // setiap pengiraan lain di sini sudah tersasar — lebih baik menolak.
  return Math.abs(sasaranTrek(jumlahTrek(g) - 1, g) - maks) <= 2 ? g : null;
}

/** Trek yang paling hampir dengan sesuatu kedudukan skrol. */
export const indeksTrek = (x: number, g: Geometri): number => Math.round(x / g.langkah);

/** Kad SEBENAR (0..n-1) yang sedang berpusat, walaupun yang dipandang itu cermin. */
export function indeksKad(x: number, g: Geometri): number {
  const t = indeksTrek(x, g) - g.klon;
  const n = g.bilangan;
  return ((t % n) + n) % n;
}

export interface Lompatan {
  /** Piksel untuk ditambah pada scrollLeft. 0 bermakna jangan sentuh. */
  delta: number;
  /** Benar bila lompatan ini tidak boleh menunggu tetamu berhenti dahulu. */
  segera: boolean;
}

const DIAM: Lompatan = { delta: 0, segera: false };

/**
 * Adakah kedudukan ini perlu dipulangkan ke jalur rumah, dan seberapa segera?
 *
 * Peraturannya:
 *   - Dalam jalur rumah: jangan sentuh apa-apa.
 *   - Dalam kawasan cermin: pulangkan satu kitaran penuh. Kerana ia GANDAAN
 *     tepat satu pusingan, kad yang berpusat sebelum dan selepas lompatan
 *     adalah kad yang SAMA pada kedudukan skrin yang SAMA — jadi tiada apa
 *     yang bergerak di mata tetamu.
 *   - Rapat dengan hujung DOM sebenar: sama, tetapi segera, kerana menunggu
 *     bermakna tetamu melanggar dinding.
 *   - TEPAT pada hujung DOM: jangan tulis langsung. Di situ pelayar sedang
 *     melantun (rubber-band) dan tulisan kita akan ditimbus atau tersentak.
 */
export function rancangLompat(x: unknown, g: Geometri): Lompatan {
  if (!nomborElok(x)) return DIAM;
  if (x <= 0 || x >= g.maks) return DIAM;

  const t = indeksTrek(x, g);
  const dalamRumah = t >= g.klon && t <= g.klon + g.bilangan - 1;
  const c = kitaran(g);

  // Landasan yang tinggal sebelum tetamu melanggar dinding DOM.
  const hampirHujung = x < g.langkah || x > g.maks - g.langkah;

  if (dalamRumah && !hampirHujung) return DIAM;

  const delta = t < g.klon ? c : t > g.klon + g.bilangan - 1 ? -c : x < g.langkah ? c : -c;
  const tujuan = x + delta;
  // Tidak sesekali melompat keluar julat yang sah.
  if (tujuan <= 0 || tujuan >= g.maks) return DIAM;
  return { delta, segera: hampirHujung };
}

/**
 * Untuk klik titik penunjuk: trek TERDEKAT yang memaparkan kad `indeks`.
 *
 * Inilah yang menjadikan titik terasa bergelung — dari kad pertama, menekan
 * titik terakhir bergerak SATU kad ke kiri, bukan meleret melintasi seluruh
 * senarai.
 *
 * Trek yang mendarat pada satu langkah daripada mana-mana dinding DIBUANG,
 * dan itu bukan sekadar berhati-hati. rancangLompat() enggan menulis pada
 * hujung sebenar — di situ pelayar sedang melantun — jadi titik yang menghantar
 * tetamu betul-betul ke hujung akan mendaratkan mereka di atas kad cermin yang
 * lengai, tanpa apa-apa yang boleh memulangkan mereka. Jalur rumah sentiasa
 * berada jauh daripada kedua-dua dinding, jadi setiap kad tetap mempunyai
 * sekurang-kurangnya satu calon yang sah.
 */
export function trekTerdekat(x: number, indeks: number, g: Geometri): number {
  const semasa = indeksTrek(x, g);
  const M = jumlahTrek(g);
  let terbaik = g.klon + indeks;
  let jarakTerbaik = Infinity;
  for (let t = 0; t < M; t++) {
    if (((t - g.klon) % g.bilangan + g.bilangan) % g.bilangan !== indeks) continue;
    const sasaran = sasaranTrek(t, g);
    if (sasaran < g.langkah || sasaran > g.maks - g.langkah) continue;
    const jarak = Math.abs(t - semasa);
    if (jarak < jarakTerbaik) {
      jarakTerbaik = jarak;
      terbaik = t;
    }
  }
  return terbaik;
}
