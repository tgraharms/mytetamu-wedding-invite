/**
 * Tab "Kandungan" pada papan /urus — sunting senarai hadiah dan tabung.
 *
 * Fail berasingan daripada urus.astro dengan sengaja: halaman itu sudah diaudit
 * dan diluluskan, jadi ia patut menerima perubahan sekecil mungkin. Modul ini
 * menerima pembantu halaman (panggil/kunci/kunciDitolak) melalui satu antara
 * muka, jadi tiada logik sedia ada perlu dipindahkan.
 */
import { el } from './liveList';

export interface PanggilHasil {
  data: unknown;
  error: { message: string } | null;
}

export interface KandunganOpts {
  root: HTMLElement;
  panggil: (fn: string, params: Record<string, unknown>) => Promise<PanggilHasil>;
  /** Frasa laluan semasa — fungsi, bukan nilai, kerana ia boleh bertukar. */
  kunci: () => string;
  /** Dipanggil bila pelayan menolak frasa laluan; halaman akan minta semula. */
  kunciDitolak: () => void;
}

interface Hadiah {
  id: number; nama: string; pautan: string; gambar_url: string;
  nota: string; aktif: boolean; urutan: number; ada_tempahan: boolean;
}
interface Tabung {
  id: number; nama: string; sasaran: number | string; emoji: string;
  aktif: boolean; urutan: number; ada_sumbangan: boolean;
}
interface Kandungan { hadiah: Hadiah[]; tabung: Tabung[] }

/** NUMERIC tiba sebagai teks berskala ("2500.00") — Number() dahulu. */
const wang = (n: number | string): string =>
  Number(n).toLocaleString('ms-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function mesejRalat(m: string): string {
  if (m.includes('nama_diperlukan')) return 'Sila isi nama.';
  if (m.includes('pautan_tidak_sah')) return 'Pautan mesti bermula dengan http:// atau https://';
  // Had bawah pelayan ialah 0.01, bukan 1 — jadi ayat lama ("antara RM1 dan
  // RM1,000,000") sudah tidak betul. Perkataan di sini sengaja tidak menyebut
  // nombor had bawah supaya ia kekal benar walaupun had itu diubah semula.
  if (m.includes('sasaran_tidak_sah')) return 'Sasaran mesti lebih daripada RM0 dan tidak melebihi RM1,000,000.';
  if (m.includes('hadiah_tiada') || m.includes('tabung_tiada')) return 'Item ini sudah tiada. Sila muat semula.';
  return 'Maaf, ada masalah teknikal. Sila cuba sekali lagi.';
}

/**
 * Satu medan borang: label kecil + input dengan aria-label yang sama.
 *
 * `perlu` menanda medan wajib. Borang di sini semuanya noValidate — semakan
 * sebenar dibuat dalam pengendali submit supaya ayatnya Melayu dan bukan gelembung
 * pelayar dalam bahasa sistem — tetapi sifat ini tetap dipasang kerana ia yang
 * memberitahu pembaca skrin medan ini wajib diisi.
 */
function medan(label: string, nama: string, nilai: string, jenis = 'text', perlu = false): HTMLElement {
  const bungkus = el('label', 'block');
  bungkus.appendChild(el('span', 'block text-xs text-stone-500', label));
  const input = document.createElement('input');
  input.name = nama;
  input.type = jenis;
  input.value = nilai;
  input.required = perlu;
  input.className = 'input mt-1';
  input.setAttribute('aria-label', label);
  bungkus.appendChild(input);
  return bungkus;
}

function nilaiMedan(borang: HTMLFormElement, nama: string): string {
  return (borang.elements.namedItem(nama) as HTMLInputElement).value.trim();
}

/**
 * Membersihkan pautan yang ditampal sebelum ia dihantar ke pelayan.
 *
 * semak_pautan() di pelayan menuntut rentetan itu BERMULA dengan http, dan
 * btrim() di sana hanya membuang ruang ASCII biasa. Dua perkara yang datang
 * bersama tampalan dari aplikasi kongsi lalu melanggar syarat itu:
 *
 *   1. Aksara halimunan (ruang sifar-lebar, penanda arah, ruang tanpa-putus)
 *      di hadapan pautan. Mata langsung tidak nampak, tetapi pelayan menolak —
 *      itulah "Pautan mesti bermula dengan http://" pada pautan yang jelas
 *      sudah betul.
 *   2. Seluruh ayat kongsi, contohnya "Xiaomi Rice Cooker https://s.shopee...".
 *
 * Jadi buang aksara halimunan dahulu, kemudian petik URL pertama di dalamnya.
 * Petikan itu dibuat TANPA mengira sama ada rentetan itu sudah bermula dengan
 * http: "https://kedai/abc harga RM299" pun bermula dengan http, tetapi
 * menyimpannya bulat-bulat menghasilkan pautan yang rosak. URL yang sah tidak
 * pernah mengandungi ruang, jadi berhenti pada ruang pertama sentiasa betul.
 *
 * Dua perincian yang kelihatan remeh tetapi menghasilkan pautan SALAH yang
 * lulus semua semakan, jadi tuan rumah tidak pernah diberitahu:
 *
 *   - Aksara halimunan DI TENGAH URL. Menukarnya kepada ruang memenggal URL
 *     pada titik itu dan meninggalkan nama domain sahaja — pautan yang nampak
 *     munasabah tetapi menuju ke tempat yang salah. Jadi ruang tanpa-putus
 *     sahaja menjadi ruang; yang lain dibuang terus.
 *   - Tanda baca ekor. Menampal "(pautan)" atau "pautan." daripada ayat
 *     menghasilkan URL berakhir dengan kurungan atau noktah. Dahulu pelayan
 *     menolaknya dengan jelas; sekarang ia bermula dengan http jadi ia LULUS,
 *     dan hadiah itu memperoleh pautan yang rosak secara senyap. Kurungan
 *     hanya dibuang bila ia tidak berpasangan, supaya URL yang memang
 *     mengandungi kurungan berpasangan kekal utuh.
 *
 * Kalau tiada URL langsung, teks itu dipulangkan seadanya — biar pelayan yang
 * menolaknya supaya tuan rumah nampak ayat ralat yang sepatutnya.
 */
export function bersihkanPautan(mentah: string): string {
  const bersih = mentah
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200F\u2060\uFEFF\u202A-\u202E]/g, '')
    .trim();
  if (bersih === '') return '';
  const padan = bersih.match(/https?:\/\/\S+/i);
  if (!padan) return bersih;
  return potongTandaBacaEkor(padan[0]);
}

/** Membuang tanda baca ayat yang tidak mungkin menjadi sebahagian URL. */
function potongTandaBacaEkor(url: string): string {
  let hasil = url.replace(/[.,;:!?'\u00BB\u203A\"]+$/g, '');
  while (/[)\]}]$/.test(hasil)) {
    const buka = (hasil.match(/[([{]/g) ?? []).length;
    const tutup = (hasil.match(/[)\]}]/g) ?? []).length;
    if (tutup <= buka) break;
    hasil = hasil.slice(0, -1);
  }
  return hasil;
}

/**
 * Apa yang halaman dapat selepas memasang modul ini.
 *
 * `reset()` wujud kerana `kunciDitolak()` TIDAK meruntuhkan DOM modul ini —
 * dalam urus.astro ia cuma menambah kelas sembunyi pada pembalut papan, jadi
 * segala yang dirender di sini masih hidup di bawahnya. Tanpa reset(), tuan
 * rumah yang memasukkan semula frasa laluan akan melihat senarai sesi lama
 * (dan borang separuh siapnya) muncul semula bila tab Kandungan dibuka.
 * Halaman patut memanggilnya di dalam kunciDitolak.
 *
 * Selepas reset() panel KEKAL kosong sehingga muat() dipanggil semula — modul
 * ini tidak memuatkan dirinya sendiri dan tidak meninggalkan sebarang mesej.
 * Jadi halaman mesti mengambil data semula setiap kali ia memaparkan papan
 * urus semula; kalau tidak, tuan rumah tertinggal dengan panel kosong yang
 * tiada jalan keluar.
 */
export interface PanelKandungan {
  muat: () => Promise<void>;
  reset: () => void;
}

export function pasangKandungan(o: KandunganOpts): PanelKandungan {
  const { root, panggil, kunci, kunciDitolak } = o;

  /**
   * Nombor jujukan muat semasa.
   * Setiap muat mengambil nombornya sendiri; kalau nombor global sudah berubah
   * bila RPC selesai, hasil itu dibuang. Itu yang menghalang muat lama daripada
   * mengisi semula panel yang baru dikosongkan oleh reset().
   */
  let jujukan = 0;

  /**
   * Berapa kali panel ini DITANGGALKAN sepenuhnya — dinaikkan oleh reset()
   * sahaja, iaitu bila sesi berakhir (log keluar atau frasa laluan ditolak).
   * `jujukan` tidak dapat membezakan itu daripada muat semula biasa, sedangkan
   * kedua-duanya menuntut layanan berbeza: selepas muat semula papan masih
   * terbuka di depan tuan rumah, selepas reset() dia sudah pun keluar.
   */
  let sesi = 0;

  async function simpan(fn: string, params: Record<string, unknown>, ralatEl: HTMLElement, btn: HTMLButtonElement): Promise<boolean> {
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    ralatEl.classList.add('hidden');
    const saya = jujukan;
    const sesiSaya = sesi;
    const { error } = await panggil(fn, { ...params, p_kunci: kunci() });

    // Disiplin yang sama seperti muat(): kalau nombor jujukan sudah berubah
    // semasa RPC dalam perjalanan, panel ini bukan lagi panel yang sama —
    // borang yang memegang butang dan perenggan ralat di bawah sudah tercabut
    // daripada DOM, kerana setiap laluan yang menaikkan jujukan (reset() dan
    // muat()) mengosongkan root dalam detik segerak yang sama.
    //
    // reset() menaikkan KEDUA-DUA nombor, jadi `dibuang` sentiasa juga `lapuk`.
    // Pembezaan itu hanya penting pada satu tempat: mesej ralat di bawah.
    const lapuk = saya !== jujukan;
    const dibuang = sesiSaya !== sesi;

    // Ralat diperiksa DAHULU, sebelum panel lapuk ditolak keluar. Dua simpanan
    // boleh berada dalam perjalanan serentak (borang baris + borang Tambah);
    // yang selesai dahulu memanggil muat() dan menaikkan jujukan, jadi kalau
    // semakan lapuk berada di atas sini, ralat simpanan yang kedua dibuang
    // senyap — tuan rumah nampak senarai yang segar dengan kedua-dua borang
    // tertutup, sama persis seperti dua kejayaan.
    if (error) {
      if (error.message.includes('kunci_salah')) {
        // Pulihkan butang DAHULU. kunciDitolak() hanya menyembunyikan papan,
        // ia tidak membuang borang ini; kalau butang dibiar mati, borang yang
        // sama akan muncul semula selepas frasa laluan betul dimasukkan dan
        // tiada apa-apa dalamnya boleh ditekan lagi. (reset() di bawah pula
        // membuang borang itu terus — dua-dua lapisan ini saling menyokong.)
        btn.disabled = false;
        btn.textContent = 'Simpan';
        // Panel yang sudah digantikan tidak boleh menghalau sesiapa keluar:
        // selepas log keluar ini akan menulis ganti mesej yang bersih dengan
        // "Frasa laluan salah.", dan selepas muat semula, muat() itu sendiri
        // menghantar frasa laluan yang sama lalu melaporkan penolakan itu.
        if (lapuk) return false;
        kunciDitolak();
        return false;
      }
      const pesan = mesejRalat(error.message);
      ralatEl.textContent = pesan;
      ralatEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Simpan';
      // Borang yang sudah tercabut tidak dapat menunjukkan ayat di atas kepada
      // sesiapa, jadi dialog dipakai — satu-satunya tempat yang kekal bila DOM
      // borang hilang. Sesi yang sudah berakhir dikecualikan: di sana skrin
      // frasa laluan yang ada di depan mata dan tiada apa yang boleh dibetulkan.
      if (lapuk && !dibuang) window.alert(`Simpanan tidak berjaya. ${pesan}`);
      return false;
    }

    // Tulisan sudah mendarat, dan itu betul — ia diizinkan semasa dihantar.
    // Yang dibatalkan cuma lukisan selepasnya: `return true` mencetuskan muat()
    // di pemanggil, dan pada panel yang sudah digantikan itu bermakna panel
    // terisi semula di BELAKANG skrin frasa laluan — keadaan DOM yang reset()
    // memang wujud untuk elak.
    if (lapuk) return false;
    return true;
  }

  /** Borang hadiah — dipakai untuk cipta (h = null) dan sunting. */
  function borangHadiah(h: Hadiah | null, tutup: () => void): HTMLFormElement {
    const f = document.createElement('form');
    f.noValidate = true;
    f.className = 'mt-3 space-y-3 border-t border-stone-200 pt-3';
    f.appendChild(medan('Nama hadiah', 'nama', h?.nama ?? ''));
    f.appendChild(medan('Pautan (kedai)', 'pautan', h?.pautan ?? '', 'url', true));
    f.appendChild(medan('Pautan gambar (pilihan)', 'gambar', h?.gambar_url ?? '', 'url'));
    f.appendChild(medan('Nota (pilihan)', 'nota', h?.nota ?? ''));

    const sorokBungkus = el('label', 'flex items-center gap-2 text-sm');
    const sorok = document.createElement('input');
    sorok.type = 'checkbox';
    sorok.name = 'sorok';
    sorok.checked = h ? !h.aktif : false;
    // Tiada aria-label di sini: <label> pembalut sudah memberi nama kepada
    // kotak semak ini, dan aria-label akan MENGGANTIKAN teks yang nampak.
    // Bila nama boleh-akses tidak mengandungi teks yang dilihat, pengguna
    // kawalan suara menyebut apa yang tertulis dan tiada apa-apa berlaku
    // (WCAG 2.5.3 Label in Name).
    sorokBungkus.appendChild(sorok);
    sorokBungkus.appendChild(el('span', '', 'Sorok daripada tetamu'));
    f.appendChild(sorokBungkus);

    const ralat = el('p', 'hidden text-sm text-red-600');
    ralat.setAttribute('role', 'status');
    f.appendChild(ralat);

    const butang = el('div', 'flex gap-2');
    const simpanBtn = el('button', 'btn flex-1', 'Simpan') as HTMLButtonElement;
    simpanBtn.type = 'submit';
    const batal = el('button', 'flex-1 rounded-xl border border-stone-300 px-4 py-2 text-sm', 'Batal') as HTMLButtonElement;
    batal.type = 'button';
    batal.addEventListener('click', tutup);
    butang.appendChild(simpanBtn);
    butang.appendChild(batal);
    f.appendChild(butang);

    f.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Pautan kosong DIBENARKAN, tetapi disahkan dahulu.
      //
      // Dahulu ia dihalang terus, kerana halaman tetamu ketika itu membalut
      // setiap nama hadiah dengan <a> dan href kosong menuding kembali ke
      // halaman yang sedang dibaca. CadanganHadiah.astro kini memapar nama
      // sebagai teks biasa apabila tiada pautan, jadi sebab halangan itu sudah
      // tiada — dan halangan itu pula menghalang kes yang sah: kad hadiah
      // kedai yang memang tidak dijual dalam talian langsung.
      //
      // Pengesahan dikekalkan kerana medan kosong SECARA TIDAK SENGAJA masih
      // jauh lebih biasa daripada hadiah tanpa pautan yang disengajakan.
      //
      // Semakan dibuat di sini, bukan diserahkan kepada pelayar: borang ini
      // noValidate dengan sengaja (lihat medan()), jadi sifat wajib pada input
      // tidak menghalang penghantaran.
      const pautan = bersihkanPautan(nilaiMedan(f, 'pautan'));
      if (pautan === '') {
        const teruskan = window.confirm(
          'Hadiah ini tiada pautan kedai. Namanya akan dipapar sebagai teks biasa, ' +
            'bukan pautan — sesuai untuk hadiah yang hanya boleh dibeli di kedai. Teruskan?',
        );
        if (!teruskan) return;
      }

      // Menyorok hadiah yang SUDAH ditempah menjebak tetamu: tempahan tetap
      // mengira ke had 2 item mereka, tetapi hadiah itu halimunan jadi mereka
      // tidak boleh membatalkannya sendiri. Boleh diteruskan — cuma tidak
      // secara tidak sengaja.
      //
      // Had yang diketahui: `ada_tempahan` ialah cerminan keadaan pada masa
      // papan dimuatkan. Kalau tetamu menempah SELEPAS itu dan tuan rumah terus
      // menyorok hadiah tersebut, amaran ini tidak muncul dan tetamu itu tetap
      // terjebak. Ia tidak dapat dikesan semasa simpan kerana RPC hanya
      // memulangkan id baris, bukan kiraan tempahan. Tebusannya ada di tab
      // Tetamu: baris begitu ditanda dengan amaran "hadiah tidak aktif" dan
      // butang Bebaskan, jadi tuan rumah masih boleh melepaskan tempahan itu.
      // Sengaja tiada tinjauan berkala (polling) — papan ini dibuka sekejap
      // sahaja dan muat semula manual sudah memadai.
      if (h && h.ada_tempahan && sorok.checked && h.aktif) {
        const teruskan = window.confirm(
          `"${h.nama}" sudah ditempah oleh seseorang. Kalau disorok, tetamu itu tidak boleh batalkan sendiri — ` +
          'anda perlu tekan Bebaskan dalam tab Tetamu. Teruskan?',
        );
        if (!teruskan) return;
      }
      const ok = await simpan('urus_simpan_hadiah', {
        p_id: h ? h.id : null,
        p_nama: nilaiMedan(f, 'nama'),
        p_pautan: pautan,
        p_gambar_url: bersihkanPautan(nilaiMedan(f, 'gambar')),
        p_nota: nilaiMedan(f, 'nota'),
        p_aktif: !sorok.checked,
      }, ralat, simpanBtn);
      if (ok) muat();
    });

    return f;
  }

  /** Borang tabung — dipakai untuk cipta (t = null) dan sunting. */
  function borangTabung(t: Tabung | null, tutup: () => void): HTMLFormElement {
    const f = document.createElement('form');
    f.noValidate = true;
    f.className = 'mt-3 space-y-3 border-t border-stone-200 pt-3';
    f.appendChild(medan('Nama tabung', 'nama', t?.nama ?? ''));
    f.appendChild(medan('Sasaran (RM)', 'sasaran', t ? String(Number(t.sasaran)) : '', 'number'));
    f.appendChild(medan('Emoji (pilihan)', 'emoji', t?.emoji ?? ''));

    const sorokBungkus = el('label', 'flex items-center gap-2 text-sm');
    const sorok = document.createElement('input');
    sorok.type = 'checkbox';
    sorok.name = 'sorok';
    sorok.checked = t ? !t.aktif : false;
    // Lihat nota pada kotak semak yang sama dalam borangHadiah(): teks yang
    // nampak ialah namanya, jadi tiada aria-label yang menindihnya.
    sorokBungkus.appendChild(sorok);
    sorokBungkus.appendChild(el('span', '', 'Sorok daripada tetamu'));
    f.appendChild(sorokBungkus);

    const ralat = el('p', 'hidden text-sm text-red-600');
    ralat.setAttribute('role', 'status');
    f.appendChild(ralat);

    const butang = el('div', 'flex gap-2');
    const simpanBtn = el('button', 'btn flex-1', 'Simpan') as HTMLButtonElement;
    simpanBtn.type = 'submit';
    const batal = el('button', 'flex-1 rounded-xl border border-stone-300 px-4 py-2 text-sm', 'Batal') as HTMLButtonElement;
    batal.type = 'button';
    batal.addEventListener('click', tutup);
    butang.appendChild(simpanBtn);
    butang.appendChild(batal);
    f.appendChild(butang);

    f.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Medan nombor pelayar memulangkan teks KOSONG untuk apa-apa yang ia
      // tidak boleh hurai — termasuk "2,500" yang ditaip mengikut tabiat
      // tempatan. Number('') pula ialah 0, jadi tanpa semakan ini pelayan
      // membalas ralat julat: tuan rumah ternampak nombor yang sah pada skrin
      // tetapi diberitahu ia di luar julat. Semak di sini dan cakap tentang
      // format, bukan julat.
      const sasaranTeks = nilaiMedan(f, 'sasaran');
      const sasaran = Number(sasaranTeks);
      if (sasaranTeks === '' || !Number.isFinite(sasaran)) {
        ralat.textContent = 'Sila isi sasaran dengan angka sahaja, contohnya 2500 — tanpa koma, ruang atau "RM".';
        ralat.classList.remove('hidden');
        return;
      }

      // Pasangan kepada amaran dalam borangHadiah(). Tabung yang disorok hilang
      // terus daripada halaman tetamu (dasar anon ialah `using (aktif)`), dan
      // sumbang() membalas `tabung_tiada`. Kalau seseorang sedang mengimbas kod
      // QR DuitNow ketika itu, wangnya sudah keluar tetapi rekodnya tidak
      // pernah masuk — dan kad untuk mencuba semula pun sudah tiada. Tingkap
      // itu sempit, tetapi ia sebab yang cukup untuk bertanya dahulu.
      //
      // Had yang sama seperti di sana: `ada_sumbangan` ialah cerminan keadaan
      // pada masa papan dimuatkan, jadi sumbangan yang masuk selepas itu tidak
      // menaikkan amaran ini. Sumbangan sedia ada tidak hilang — jumlahnya
      // masih dikira dan masih tersenarai dalam tab Tetamu.
      if (t && t.ada_sumbangan && sorok.checked && t.aktif) {
        const teruskan = window.confirm(
          `"${t.nama}" sudah menerima sumbangan. Kalau disorok, kad tabung ini terus hilang daripada halaman tetamu — ` +
          'sesiapa yang sedang membuat pemindahan ketika ini tidak dapat merekodkannya. Teruskan?',
        );
        if (!teruskan) return;
      }

      const ok = await simpan('urus_simpan_tabung', {
        p_id: t ? t.id : null,
        p_nama: nilaiMedan(f, 'nama'),
        p_sasaran: sasaran,
        p_emoji: nilaiMedan(f, 'emoji'),
        p_aktif: !sorok.checked,
      }, ralat, simpanBtn);
      if (ok) muat();
    });

    return f;
  }

  /**
   * Penutup borang yang sedang terbuka, atau null bila tiada.
   *
   * Satu borang terbuka pada satu masa. Sebabnya: setiap simpanan yang berjaya
   * memanggil muat(), dan muat() mengosongkan seluruh panel — jadi borang KEDUA
   * yang masih terbuka lenyap bersama segala yang sudah ditaip di dalamnya,
   * tanpa amaran. Kerugiannya bukan kecil: cabang kemas kini RPC menulis ganti
   * pautan, gambar dan nota tanpa syarat, jadi tiada simpanan separuh — nota
   * yang hilang perlu ditaip semula dari kosong. Menutup borang lain semasa
   * borang baharu dibuka lebih murah dan lebih mudah diramal daripada menjejak
   * medan yang berubah.
   */
  let tutupTerbuka: (() => void) | null = null;

  /** Tutup borang yang sedang terbuka (kalau ada), kemudian ingat yang baharu. */
  function bukaBorang(tutupIni: () => void): void {
    if (tutupTerbuka && tutupTerbuka !== tutupIni) tutupTerbuka();
    tutupTerbuka = tutupIni;
  }

  /** Satu baris senarai yang mengembang jadi borang bila ditekan. */
  function baris(tajuk: string, subteks: string, disorok: boolean, buatBorang: (tutup: () => void) => HTMLFormElement): HTMLElement {
    const li = el('li', `rounded-xl border border-stone-200 bg-white p-3${disorok ? ' opacity-60' : ''}`);

    // Teks baris duduk dalam <div>, bukan di dalam <button>. Sebuah <button>
    // hanya boleh mengandungi teks mengalir (phrasing content), jadi <p> di
    // dalamnya bukan sahaja HTML tidak sah — ia juga dilipat masuk ke dalam
    // nama boleh-akses butang, jadi pembaca skrin melaungkan seluruh subteks
    // setiap kali fokus singgah. Susun atur ini sama seperti baris() dalam
    // urus.astro: teks di kiri, satu butang tindakan di kanan.
    const atas = el('div', 'flex items-center justify-between gap-3');
    const kiri = el('div', 'min-w-0');
    const t = el('div', 'flex items-baseline gap-2');
    t.appendChild(el('span', 'min-w-0 truncate text-sm font-medium', tajuk));
    if (disorok) t.appendChild(el('span', 'shrink-0 text-xs text-stone-500', 'Disorok'));
    kiri.appendChild(t);
    kiri.appendChild(el('p', 'break-words text-xs text-stone-500', subteks));
    atas.appendChild(kiri);

    const btn = el('button', 'shrink-0 rounded-xl border border-stone-300 px-3 py-1.5 text-xs', 'Sunting') as HTMLButtonElement;
    btn.type = 'button';
    // Nama hadiah/tabung masuk sebagai atribut (bukan HTML), supaya setiap
    // butang "Sunting" dalam senarai boleh dibezakan oleh pembaca skrin.
    btn.setAttribute('aria-label', `Sunting ${tajuk}`);
    // Butang ini membuka dan menutup borang di bawahnya — nyatakan keadaannya.
    btn.setAttribute('aria-expanded', 'false');
    atas.appendChild(btn);
    li.appendChild(atas);

    const tutup = (): void => {
      const f = li.querySelector('form');
      if (f) f.remove();
      btn.setAttribute('aria-expanded', 'false');
      if (tutupTerbuka === tutup) tutupTerbuka = null;
    };

    btn.addEventListener('click', () => {
      if (li.querySelector('form')) { tutup(); return; }
      bukaBorang(tutup);
      li.appendChild(buatBorang(tutup));
      btn.setAttribute('aria-expanded', 'true');
    });
    return li;
  }

  function seksyen(tajuk: string, tambahLabel: string, buatBorangBaharu: (tutup: () => void) => HTMLFormElement): { wrap: HTMLElement; ul: HTMLElement } {
    const wrap = el('section', '');
    const kepala = el('div', 'flex items-center justify-between gap-3');
    kepala.appendChild(el('h2', 'text-lg font-medium', tajuk));
    const tambah = el('button', 'shrink-0 rounded-xl border border-stone-300 px-3 py-1.5 text-xs', tambahLabel) as HTMLButtonElement;
    tambah.type = 'button';
    // Sama seperti butang setiap baris: ia membuka/menutup borang, jadi
    // keadaannya mesti dilaporkan kepada pembaca skrin.
    tambah.setAttribute('aria-expanded', 'false');
    kepala.appendChild(tambah);
    wrap.appendChild(kepala);
    const ul = el('ul', 'mt-3 space-y-2');
    wrap.appendChild(ul);

    const tutupBaharu = (): void => {
      const x = wrap.querySelector('form[data-baharu]');
      if (x) x.remove();
      tambah.setAttribute('aria-expanded', 'false');
      if (tutupTerbuka === tutupBaharu) tutupTerbuka = null;
    };

    tambah.addEventListener('click', () => {
      if (wrap.querySelector('form[data-baharu]')) { tutupBaharu(); return; }
      bukaBorang(tutupBaharu);
      const f = buatBorangBaharu(tutupBaharu);
      f.setAttribute('data-baharu', '');
      wrap.insertBefore(f, ul);
      tambah.setAttribute('aria-expanded', 'true');
    });

    return { wrap, ul };
  }

  /**
   * Kegagalan BUKAN-kunci: rangkaian putus, 5xx, AbortSignal.timeout, atau data
   * yang tidak berbentuk seperti yang dijangka. Tulisan tidak pernah dicuba
   * semula (postgrest.ts), jadi UI mesti yang menawarkan percubaan itu — sama
   * seperti showFailure() dalam urus.astro.
   */
  function paparGagal(): void {
    root.replaceChildren();
    const gagal = el('p', 'text-sm text-red-600', 'Maaf, kandungan tidak dapat dimuatkan.');
    gagal.setAttribute('role', 'status');
    root.appendChild(gagal);
    const lagi = el('button', 'btn-outline mt-3 w-full max-w-sm', 'Cuba lagi') as HTMLButtonElement;
    lagi.type = 'button';
    lagi.addEventListener('click', () => muat());
    root.appendChild(lagi);
  }

  async function muat(): Promise<void> {
    const saya = (jujukan += 1);
    root.replaceChildren();
    // Borang yang dijejaki baru sahaja tercabut bersama seluruh panel — jangan
    // simpan penutup yang menuding ke nod yang sudah tiada.
    tutupTerbuka = null;
    root.appendChild(el('p', 'text-sm text-stone-500', 'Memuatkan…'));

    // Seluruh badan dibalut: panel sudah dikosongkan pada baris di atas, jadi
    // apa-apa lontaran selepas ini (mis. data null atau tanpa medan hadiah)
    // akan meninggalkan panel kosong tanpa mesej dan tanpa jalan keluar —
    // kedua-dua pemanggil muat() pula tidak menyambut Promise ini.
    try {
      const { data, error } = await panggil('urus_senarai_kandungan', { p_kunci: kunci() });
      if (saya !== jujukan) return;
      if (error) {
        if (error.message.includes('kunci_salah')) {
          // Kosongkan sendiri: kunciDitolak() hanya menyembunyikan pembalut
          // papan dalam urus.astro, ia tidak meruntuhkan DOM modul ini. Tanpa
          // baris ini senarai sesi lama tinggal di bawah skrin frasa laluan.
          root.replaceChildren();
          kunciDitolak();
          return;
        }
        paparGagal();
        return;
      }

      const k = data as Kandungan;
      if (!k || !Array.isArray(k.hadiah) || !Array.isArray(k.tabung)) {
        paparGagal();
        return;
      }
      root.replaceChildren();

      const sHadiah = seksyen('Cadangan Hadiah', 'Tambah hadiah', (tutup) => borangHadiah(null, tutup));
      if (k.hadiah.length === 0) {
        sHadiah.ul.appendChild(el('li', 'text-sm text-stone-500', 'Tiada hadiah lagi.'));
      }
      for (const h of k.hadiah) {
        const nota = [h.pautan ? 'ada pautan' : 'tiada pautan', h.ada_tempahan ? 'sudah ditempah' : ''].filter(Boolean).join(' · ');
        sHadiah.ul.appendChild(baris(h.nama, nota, !h.aktif, (tutup) => borangHadiah(h, tutup)));
      }

      const sTabung = seksyen('Tabung Impian', 'Tambah tabung', (tutup) => borangTabung(null, tutup));
      if (k.tabung.length === 0) {
        sTabung.ul.appendChild(el('li', 'text-sm text-stone-500', 'Tiada tabung lagi.'));
      }
      for (const t of k.tabung) {
        const nota = `${t.emoji} · sasaran RM ${wang(t.sasaran)}${t.ada_sumbangan ? ' · ada sumbangan' : ''}`;
        sTabung.ul.appendChild(baris(t.nama, nota, !t.aktif, (tutup) => borangTabung(t, tutup)));
      }

      const bekas = el('div', 'space-y-10');
      bekas.appendChild(sHadiah.wrap);
      bekas.appendChild(sTabung.wrap);
      root.appendChild(bekas);
    } catch {
      // Muat yang sudah digantikan (atau dibatalkan reset()) tidak boleh
      // melukis apa-apa semula — termasuk skrin gagal.
      if (saya !== jujukan) return;
      paparGagal();
    }
  }

  /**
   * Kosongkan panel dan batalkan sebarang muat yang masih dalam perjalanan.
   * Halaman memanggilnya dari kunciDitolak(); lihat nota pada PanelKandungan
   * di atas untuk sebab ia perlu wujud.
   */
  function reset(): void {
    jujukan += 1;
    sesi += 1;
    root.replaceChildren();
    tutupTerbuka = null;
  }

  return { muat, reset };
}
