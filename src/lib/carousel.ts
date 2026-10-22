// Karusel leret-ke-kanan dengan penunjuk titik, dikongsi oleh beberapa seksyen.
import {
  binaGeometri,
  indeksKad,
  jumlahTrek,
  leretMula,
  rancangLompat,
  sasaranTrek,
  trekTerdekat,
  type Geometri,
} from './carouselGelung';

export interface PilihanKarusel {
  /**
   * Gelungkan senarai supaya sentiasa ada jiran mengintai di kedua-dua belah.
   *
   * Sengaja perlu diminta, bukan lalai. Gelung memasang kad CERMIN, dan kad
   * cermin dibuat dengan cloneNode — yang TIDAK menyalin pendengar peristiwa.
   * Untuk kad paparan semata-mata itu tidak menjadi hal (cermin dimatikan
   * sepenuhnya), tetapi untuk kad yang membawa keadaan dan borang seperti
   * senarai hadiah, cermin bermakna butang yang kelihatan hidup tetapi mati.
   * Jadi setiap pemanggil mesti memilihnya secara sedar.
   */
  gelung?: boolean;
  /**
   * Mulakan barisan pada kad ke-N (0 = kad pertama), bukan di hujung kiri.
   *
   * Untuk karusel yang TIDAK boleh digelungkan, inilah cara paling murah
   * menghapuskan ruang kosong yang mengganggu di sebelah kiri: bermula pada
   * kad kedua bermakna kad pertama mengintai di kiri, jadi pandangan pertama
   * tetamu ialah baris kad yang berjiran di kedua-dua belah — sama seperti
   * karusel bergelung, tanpa satu pun salinan kad dibuat.
   */
  mulaDi?: number;
}

/** Berapa lama menunggu skrol benar-benar berhenti sebelum melompat. */
const REHAT_MS = 140;

export function initCarousel(
  container: HTMLElement,
  dotsBox: HTMLElement,
  pilihan: PilihanKarusel = {},
): void {
  const kadAsal = Array.from(container.children) as HTMLElement[];

  /**
   * Kad pertama sepatutnya berhenti di TENGAH, bukan melekat di tepi kiri.
   *
   * Setiap kad menggunakan penjajaran petak ke tengah, tetapi kad pertama tidak
   * dapat memenuhinya: memusatkannya menuntut scrollLeft negatif, jadi ia
   * tersadai di tepi kiri sedangkan tajuk seksyen di atasnya berpusat — itulah
   * yang kelihatan "tak center". Ubatnya ialah pelapik kiri/kanan selebar ruang
   * lebih di sebelah satu kad.
   *
   * Pelapik yang sama inilah yang menjadikan matematik gelung kemas: dengannya,
   * trek ke-t berpusat tepat pada scrollLeft = t * langkah.
   */
  const laraskanPusat = (): void => {
    container.style.paddingLeft = '';
    container.style.paddingRight = '';
    const muat = container.scrollWidth <= container.clientWidth + 1;
    container.classList.toggle('justify-center', muat);
    if (muat || !kadAsal[0]) return;
    const lapik = Math.max(0, Math.round((container.clientWidth - kadAsal[0].offsetWidth) / 2));
    container.style.paddingLeft = `${lapik}px`;
    container.style.paddingRight = `${lapik}px`;
  };

  if (pilihan.gelung) {
    try {
      pasangGelung(container, dotsBox, kadAsal, laraskanPusat);
      return;
    } catch {
      // Gelung ialah peningkatan, bukan keperluan. Apa-apa yang tidak dijangka
      // di sini mesti meninggalkan tetamu dengan karusel biasa yang berfungsi,
      // bukan barisan yang rosak.
      bongkarCermin(container);
    }
  }

  pasangBiasa(container, dotsBox, kadAsal, laraskanPusat, pilihan.mulaDi ?? 0);
}

/** Karusel asal: pelapik pemusat, satu titik setiap kad. */
function pasangBiasa(
  container: HTMLElement,
  dotsBox: HTMLElement,
  cards: HTMLElement[],
  laraskanPusat: () => void,
  mulaDi: number,
): void {
  /**
   * Meletakkan barisan pada kad permulaan, SEKALI sahaja.
   *
   * Bendera sekali-sahaja itu penting: bekas ini turut diperhati untuk
   * perubahan saiz, dan borang tempahan yang dibuka menjadikan kad lebih
   * tinggi lalu mencetuskan pemerhati itu. Tanpa bendera ini, tetamu yang
   * sedang menaip pada kad kelima akan direntap balik ke kad kedua.
   */
  // Mod gelung mungkin sudah menambah titiknya sendiri sebelum gagal dan
  // berundur ke sini; tanpa pembersihan ini tetamu mendapat dua baris titik,
  // satu daripadanya lengai selama-lamanya.
  dotsBox.replaceChildren();

  let mulaSelesai = mulaDi <= 0 || cards.length < 3;
  const pasangMula = (): void => {
    if (mulaSelesai) return;
    // Lebar 0 bermakna susun atur belum sedia; pemerhati saiz akan memanggil
    // semula sebaik sahaja bekas ini mempunyai lebar sebenar.
    if (container.clientWidth <= 0) return;
    if (container.scrollWidth <= container.clientWidth + 1) {
      mulaSelesai = true;
      return;
    }
    const kad = cards[Math.min(mulaDi, cards.length - 1)];
    const x = kad.offsetLeft + kad.offsetWidth / 2 - container.clientWidth / 2;
    const asal = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';
    container.scrollLeft = Math.max(0, x);
    container.style.scrollBehavior = asal;
    mulaSelesai = true;
  };

  laraskanPusat();
  pasangMula();
  // ResizeObserver, bukan sekadar peristiwa resize tetingkap: bekas ini boleh
  // bermula dengan lebar 0 (gambar kad belum mendarat, seksyen baru sahaja
  // dinyahsorok), dan pengiraan pada saat itu memberi pelapik 0 yang tidak
  // akan pernah membetulkan dirinya tanpa tetingkap diubah saiz.
  new ResizeObserver(() => {
    laraskanPusat();
    pasangMula();
  }).observe(container);

  if (cards.length < 2) return;

  dotsBox.classList.remove('hidden');
  dotsBox.classList.add('flex');

  const dots = cards.map((_, i) => {
    const d = buatTitik();
    d.addEventListener('click', () => {
      // Hormati permintaan kurang gerakan, sama seperti laluan gelung. Tanpa
      // ini karusel hadiah menjadi satu-satunya karusel yang tetap meluncur
      // untuk tetamu yang sudah meminta supaya ia berhenti.
      const halus = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? ('auto' as const)
        : ('smooth' as const);
      cards[i].scrollIntoView({ behavior: halus, block: 'nearest', inline: 'center' });
    });
    dotsBox.appendChild(d);
    return d;
  });

  function setActive(): void {
    const mid = container.scrollLeft + container.clientWidth / 2;
    let best = 0;
    cards.forEach((c, i) => {
      const center = c.offsetLeft + c.offsetWidth / 2;
      const bestCenter = cards[best].offsetLeft + cards[best].offsetWidth / 2;
      if (Math.abs(center - mid) < Math.abs(bestCenter - mid)) best = i;
    });
    tandaTitik(dots, best);
  }
  setActive();
  container.addEventListener('scroll', setActive, { passive: true });
}

function buatTitik(): HTMLButtonElement {
  const d = document.createElement('button');
  d.type = 'button';
  // Bekas titik ditanda tersembunyi daripada pembaca skrin, kerana titik ini
  // hanyalah cerminan kedudukan — kandungannya sendiri sudah boleh dicapai
  // dengan meleret. Kawalan yang boleh difokus DI DALAM kawasan tersembunyi
  // itu ialah percanggahan: fokus papan kekunci mendarat pada butang yang
  // pembaca skrin enggan sebut. Menanggalkannya daripada susunan tab
  // menyelesaikan percanggahan itu tanpa menghilangkan apa-apa.
  d.tabIndex = -1;
  d.className = 'h-2 w-2 rounded-full bg-stone-300 transition-colors';
  return d;
}

function tandaTitik(dots: HTMLButtonElement[], aktif: number): void {
  dots.forEach((d, i) => {
    d.classList.toggle('bg-stone-600', i === aktif);
    d.classList.toggle('bg-stone-300', i !== aktif);
  });
}

const CERMIN = 'data-cermin';

function bongkarCermin(container: HTMLElement): void {
  for (const n of Array.from(container.querySelectorAll(`[${CERMIN}]`))) n.remove();
}

/**
 * Menjadikan satu salinan benar-benar mati: bukan pautan, bukan sasaran fokus,
 * tiada pengenalan yang boleh dikelirukan dengan kad sebenar, dan halimunan
 * kepada pembaca skrin. Cermin ialah gambar, bukan kawalan.
 *
 * Ini bukan hiasan keselamatan — cloneNode tidak menyalin pendengar peristiwa,
 * jadi salinan yang MASIH kelihatan boleh ditekan ialah butang yang mati
 * secara senyap. Lebih baik ia jelas-jelas bukan kawalan.
 */
function sterilkan(cermin: HTMLElement): void {
  cermin.setAttribute(CERMIN, '');
  cermin.setAttribute('aria-hidden', 'true');
  cermin.inert = true;
  cermin.style.pointerEvents = 'none';
  const semua = [cermin, ...Array.from(cermin.querySelectorAll<HTMLElement>('*'))];
  for (const n of semua) {
    if (n !== cermin) {
      for (const a of Array.from(n.attributes)) {
        if (a.name.startsWith('data-')) n.removeAttribute(a.name);
      }
    }
    n.removeAttribute('href');
    n.removeAttribute('id');
    if (n instanceof HTMLElement) n.tabIndex = -1;
  }
}

/**
 * Karusel bergelung: cincin cermin statik dengan lompatan modular.
 *
 * `klon` kad dari EKOR senarai diletakkan di hadapan, dan `klon` kad dari
 * KEPALA diletakkan di belakang — sekali sahaja, ketika pemasangan, dan tidak
 * pernah disentuh lagi. Bila tetamu berhenti di kawasan cermin, kedudukan
 * skrol dialihkan tepat satu pusingan penuh. Kerana alihan itu gandaan tepat
 * satu kitaran, kad yang berpusat sebelum dan selepasnya adalah kad yang sama
 * pada kedudukan skrin yang sama: tiada apa yang bergerak di mata tetamu, dan
 * landasan di hadapan terisi semula.
 */
function pasangGelung(
  container: HTMLElement,
  dotsBox: HTMLElement,
  kadAsal: HTMLElement[],
  laraskanPusat: () => void,
): void {
  const n = kadAsal.length;
  const lebarKad = kadAsal[0]?.offsetWidth ?? 0;

  // Semua kad mesti sama lebar; kalau tidak, "satu langkah" tidak bermakna.
  const seragam = kadAsal.every((k) => Math.abs(k.offsetWidth - lebarKad) <= 1);
  const jurang = n > 1 ? kadAsal[1].offsetLeft - kadAsal[0].offsetLeft - lebarKad : 0;
  const langkah = lebarKad + jurang;

  let geo: Geometri | null = null;
  let dots: HTMLButtonElement[] = [];
  let pemasa = 0;
  let dipasang = false;

  /**
   * Ukur semula dan pasang cincin.
   *
   * `sauh` ialah indeks kad sebenar yang patut kekal di tengah selepas
   * pembinaan semula — dipakai bila telefon diputar, supaya tetamu tidak
   * hilang tempatnya.
   */
  const bina = (sauh = 0): void => {
    const pandangan = container.clientWidth;
    if (!seragam || pandangan <= 0) return gagalKeBiasa();

    // Pelapik pemusat mesti dipasang SEBELUM apa-apa diukur. Seluruh matematik
    // gelung bersandar padanya: hanya dengan pelapik selebar separuh ruang
    // lebih inilah trek ke-t berpusat tepat pada t * langkah. Tanpanya bekas
    // masih membawa pelapik kelasnya sendiri yang lebih kecil, dan setiap
    // sasaran terpesong beberapa piksel — cukup untuk lompatan tersasar.
    const lapik = Math.max(0, Math.round((pandangan - lebarKad) / 2));
    container.style.paddingLeft = `${lapik}px`;
    container.style.paddingRight = `${lapik}px`;

    // Ukur seolah-olah cermin sudah ada, supaya `maks` yang dihantar ke
    // binaGeometri() adalah maks SEBENAR selepas pemasangan.
    const calon = binaGeometri({
      bilangan: n,
      pandangan,
      langkah,
      maks: ramalMaks(n, pandangan, langkah, lebarKad, jurang),
    });
    if (!calon) return gagalKeBiasa();

    geo = calon;
    // Bilangan cermin bergantung pada lebar pandangan, jadi pemutaran telefon
    // boleh menuntut cincin yang berlainan panjang. Bina semula dari awal;
    // kadAsal kekal senarai kad SEBENAR, jadi ini tidak pernah mencermin cermin.
    bongkarCermin(container);
    pasangCermin(container, kadAsal, calon.klon);
    container.dataset.gelung = 'on';
    // Penambat skrol pelayar akan cuba "membetulkan" kedudukan selepas kita
    // menulisnya sendiri; kedua-duanya tidak boleh menguruskan skrol yang sama.
    container.style.overflowAnchor = 'none';
    dipasang = true;
    const kad = Math.min(Math.max(sauh, 0), n - 1);
    lompatKe(sasaranTrek(calon.klon + kad, calon), false);
  };

  const gagalKeBiasa = (): void => {
    if (dipasang) {
      bongkarCermin(container);
      dipasang = false;
    }
    geo = null;
    container.dataset.gelung = 'off';
    laraskanPusat();
  };

  const lompatKe = (x: number, halus: boolean): void => {
    const asal = container.style.scrollBehavior;
    if (!halus) container.style.scrollBehavior = 'auto';
    container.scrollLeft = x;
    if (!halus) container.style.scrollBehavior = asal;
  };

  const nilaiSekarang = (): void => {
    if (!geo) return;
    const r = rancangLompat(container.scrollLeft, geo);
    if (r.delta !== 0) lompatKe(container.scrollLeft + r.delta, false);
    tandaTitik(dots, indeksKad(container.scrollLeft, geo));
  };

  const jadualRehat = (): void => {
    window.clearTimeout(pemasa);
    pemasa = window.setTimeout(nilaiSekarang, REHAT_MS);
  };

  container.addEventListener(
    'scroll',
    () => {
      if (!geo) return;
      tandaTitik(dots, indeksKad(container.scrollLeft, geo));
      // Lompatan segera hanya bila landasan hampir habis. Selain itu tunggu
      // tetamu berhenti — menulis scrollLeft di tengah luncuran membatalkan
      // luncuran itu pada iOS.
      const r = rancangLompat(container.scrollLeft, geo);
      if (r.segera && r.delta !== 0) {
        lompatKe(container.scrollLeft + r.delta, false);
        return;
      }
      jadualRehat();
    },
    { passive: true },
  );

  // Titik penunjuk: satu bagi setiap kad SEBENAR, dan setiap klik mengambil
  // jalan terdekat mengelilingi cincin.
  dotsBox.classList.remove('hidden');
  dotsBox.classList.add('flex');
  dots = kadAsal.map((_, i) => {
    const d = buatTitik();
    d.addEventListener('click', () => {
      if (!geo) return;
      const t = trekTerdekat(container.scrollLeft, i, geo);
      const halus = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (halus) {
        container.scrollTo({ left: sasaranTrek(t, geo), behavior: 'smooth' });
        jadualRehat();
      } else {
        lompatKe(sasaranTrek(t, geo), false);
        nilaiSekarang();
      }
    });
    dotsBox.appendChild(d);
    return d;
  });

  bina();
  if (!dipasang) throw new Error('gelung tidak layak');

  // Bina semula bila LEBAR bekas benar-benar berubah — pemutaran telefon,
  // atau tetingkap desktop yang diseret. Kedua-dua pelapik pemusat dan
  // bilangan cermin dikira daripada lebar itu, jadi tanpa pembinaan semula
  // setiap sasaran lompatan terpesong selepas putaran. Kad yang sedang
  // berpusat dijadikan sauh supaya tetamu kekal di tempatnya.
  //
  // Hanya lebar diperiksa, bukan tinggi: kad boleh menjadi lebih tinggi atas
  // sebab biasa (teks berbalut) dan membina semula pada setiap perubahan
  // tinggi akan merentap tetamu tanpa sebab.
  let lebarAkhir = container.clientWidth;
  new ResizeObserver(() => {
    const lebarBaru = container.clientWidth;
    if (!geo) {
      laraskanPusat();
      return;
    }
    if (lebarBaru === lebarAkhir || lebarBaru <= 0) return;
    lebarAkhir = lebarBaru;
    bina(indeksKad(container.scrollLeft, geo));
  }).observe(container);
}

/** Lebar skrol maksimum selepas cermin dipasang, tanpa perlu memasangnya dulu. */
function ramalMaks(
  n: number,
  pandangan: number,
  langkah: number,
  lebarKad: number,
  jurang: number,
): number {
  const klon = Math.min(n, Math.ceil(pandangan / langkah) + 2);
  const M = n + 2 * klon;
  const lapik = Math.max(0, Math.round((pandangan - lebarKad) / 2));
  return 2 * lapik + M * lebarKad + (M - 1) * jurang - pandangan;
}

function pasangCermin(container: HTMLElement, kadAsal: HTMLElement[], klon: number): void {
  const n = kadAsal.length;
  const depan = document.createDocumentFragment();
  for (let i = n - klon; i < n; i++) {
    const c = kadAsal[i].cloneNode(true) as HTMLElement;
    sterilkan(c);
    depan.appendChild(c);
  }
  const belakang = document.createDocumentFragment();
  for (let i = 0; i < klon; i++) {
    const c = kadAsal[i].cloneNode(true) as HTMLElement;
    sterilkan(c);
    belakang.appendChild(c);
  }
  container.insertBefore(depan, kadAsal[0]);
  container.appendChild(belakang);
}
