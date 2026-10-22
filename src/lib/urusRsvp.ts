/**
 * Panel RSVP untuk papan /urus.
 *
 * Modul ini tidak tahu apa-apa tentang halaman: ia menerima pembantu halaman
 * (panggil/kunci/kunciDitolak) melalui satu antara muka, sama seperti
 * urusKandungan.ts. Jenis PanggilHasil diimport dari modul itu supaya bentuk
 * hasil RPC tidak boleh terpesong antara dua panel.
 */
import { el } from './liveList';
import type { PanggilHasil } from './urusKandungan';

export interface RsvpOpts {
  root: HTMLElement;
  panggil: (fn: string, params: Record<string, unknown>) => Promise<PanggilHasil>;
  /** Frasa laluan semasa; hanya diketahui selepas papan berjaya dimuatkan. */
  kunci: () => string;
  /** Dipanggil bila pelayan menolak frasa laluan; halaman akan minta semula. */
  kunciDitolak: () => void;
}

interface BarisRsvp {
  id: string;
  nama: string;
  pax: number;
  bermalam: boolean | null;
  pada: string;
}

interface JumlahRsvp {
  rsvp: number;
  pax: number;
  bermalam_orang: number;
  bermalam_bilangan: number;
}

interface DataRsvp {
  senarai: BarisRsvp[];
  jumlah: JumlahRsvp;
}

/**
 * Sama seperti PanelKandungan: reset() wujud kerana kunciDitolak() TIDAK
 * meruntuhkan DOM modul ini — urus.astro cuma menyembunyikan pembalut papan,
 * jadi baris sesi lama masih hidup di bawah skrin frasa laluan. Selepas reset()
 * panel kekal kosong sehingga muat() dipanggil semula.
 */
export interface PanelRsvp {
  muat: () => Promise<void>;
  reset: () => void;
}

const masa = (iso: string): string => new Date(iso).toLocaleString('ms-MY');

/**
 * Tiga keadaan, bukan dua. Medan bermalam ialah pilihan pada borang RSVP, jadi
 * NULL bermakna tetamu melangkaunya — bukan "tidak bermalam".
 */
function teksBermalam(b: boolean | null): string {
  if (b === true) return 'Bermalam: Ya';
  if (b === false) return 'Bermalam: Tidak';
  return 'Bermalam: belum jawab';
}

/** Mesej ralat generik bila panggilan padam RSVP gagal atas sebab teknikal. */
const RALAT_TEKNIKAL = 'Maaf, ada masalah teknikal. Sila cuba sekali lagi.';

/** Satu kad ringkasan: nombor besar, label kecil, nota kecil pilihan. */
function kad(label: string, nilai: string, nota?: string): HTMLElement {
  const d = el('div', 'rounded-xl border border-stone-200 bg-white p-3');
  d.appendChild(el('div', 'text-2xl font-medium tabular-nums', nilai));
  d.appendChild(el('div', 'mt-0.5 text-xs text-stone-500', label));
  if (nota !== undefined) d.appendChild(el('div', 'text-xs text-stone-400', nota));
  return d;
}

export function pasangRsvp(o: RsvpOpts): PanelRsvp {
  const { root, panggil, kunci, kunciDitolak } = o;

  /**
   * Nombor jujukan muat semasa. Setiap muat mengambil nombornya sendiri; kalau
   * nombor global sudah berubah bila RPC selesai, hasil itu dibuang. Itu yang
   * menghalang muat lama daripada mengisi semula panel yang baru dikosongkan.
   */
  let jujukan = 0;

  /**
   * Berapa kali panel ini ditanggalkan sepenuhnya — dinaikkan oleh reset()
   * sahaja, iaitu bila sesi berakhir. Selepas itu tuan rumah sudah pun berada
   * di skrin frasa laluan, jadi tiada gunanya melontar dialog kepadanya.
   */
  let sesi = 0;

  /**
   * Kegagalan BUKAN-kunci: rangkaian putus, 5xx, AbortSignal.timeout, atau data
   * yang tidak berbentuk seperti yang dijangka. Tulisan tidak pernah dicuba
   * semula, jadi UI mesti yang menawarkan percubaan itu.
   */
  function paparGagal(): void {
    root.replaceChildren();
    const gagal = el('p', 'text-sm text-red-600', 'Maaf, senarai RSVP tidak dapat dimuatkan.');
    gagal.setAttribute('role', 'status');
    root.appendChild(gagal);
    const lagi = el('button', 'btn-outline mt-3 w-full max-w-sm', 'Cuba lagi') as HTMLButtonElement;
    lagi.type = 'button';
    lagi.addEventListener('click', () => { void muat(); });
    root.appendChild(lagi);
  }

  function baris(r: BarisRsvp): HTMLElement {
    const li = el('li', 'flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3');
    const kiri = el('div', 'min-w-0');

    // Bilangan pax duduk dalam span sendiri yang tidak dibenarkan mengecut, di
    // luar garis yang dipotong elipsis: ia nilai paling penting dalam baris,
    // dan pada telefon 375px elipsis akan memakannya kalau digabung dengan nama.
    // (Nama kelas sengaja tidak dieja di sini — pengimbas Tailwind mengutipnya
    // dari komen dan mengekalkan utiliti mati dalam CSS yang dimuatkan setiap
    // halaman tetamu.)
    const tajuk = el('div', 'flex items-baseline gap-2');
    tajuk.appendChild(el('span', 'min-w-0 truncate text-sm font-medium', r.nama));
    tajuk.appendChild(el('span', 'shrink-0 text-sm font-medium', `${r.pax} orang`));
    kiri.appendChild(tajuk);

    // Nama tetamu boleh panjang tanpa ruang; teks yang tidak boleh pecah di
    // dalam anak susun atur lentur akan melimpah keluar kad, jadi pembalut
    // perkataan dipakai pada baris metadata ini.
    kiri.appendChild(el('p', 'break-words text-xs text-stone-500', `${teksBermalam(r.bermalam)} · ${masa(r.pada)}`));

    li.appendChild(kiri);

    const btn = el('button', 'shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600', 'Padam') as HTMLButtonElement;
    btn.type = 'button';
    // Nama tetamu masuk sebagai atribut (bukan HTML), supaya setiap butang
    // Padam dalam senarai boleh dibezakan oleh pembaca skrin.
    btn.setAttribute('aria-label', `Padam RSVP ${r.nama}`);
    btn.addEventListener('click', () => { void padam(r, btn); });
    li.appendChild(btn);
    return li;
  }

  async function padam(r: BarisRsvp, btn: HTMLButtonElement): Promise<void> {
    if (!window.confirm(`Padam RSVP "${r.nama}" (${r.pax} orang)?`)) return;

    // Suapan segera: papan ini sering dibuka atas telefon pada sambungan
    // perlahan. Tanpa ini, tuan rumah menekan Padam sekali lagi semasa RPC
    // pertama masih dalam perjalanan — panggilan kedua itu pulang `false` dan
    // melaporkan baris ini "sudah tiada" tentang baris yang baru sahaja dia
    // sendiri padam.
    btn.disabled = true;
    btn.textContent = 'Memadam…';
    // aria-label menang berbanding teks dalaman butang bila nama boleh capai
    // dikira — kalau label dibiarkan tetap sebagai "Padam RSVP …", pembaca
    // skrin tidak sekali-kali tahu butang ini sedang sibuk.
    btn.setAttribute('aria-label', `Memadam RSVP ${r.nama}`);

    /** Pulihkan butang ke keadaan sedia — teks dan aria-label serentak. */
    const pulihBtn = (): void => {
      btn.disabled = false;
      btn.textContent = 'Padam';
      btn.setAttribute('aria-label', `Padam RSVP ${r.nama}`);
    };

    const saya = jujukan;
    const sesiSaya = sesi;

    let hasil: PanggilHasil;
    try {
      hasil = await panggil('urus_padam_rsvp', { p_kunci: kunci(), p_rsvp_id: r.id });
    } catch {
      // panggil() guna AbortSignal.timeout (lihat urus.astro), tetapi shim
      // postgrest.ts (send()) menangkap SETIAP kegagalan — rangkaian putus,
      // 5xx, AbortSignal.timeout tercetus — dan menukarnya kepada { error };
      // ia tidak pernah menolak (reject) promisnya. Jadi cawangan catch ini
      // sepatutnya tidak boleh dicapai pada hari ini. Ia dikekalkan sebagai
      // pertahanan berlapis (defence in depth): kalau lapisan pengangkutan
      // berubah pada masa depan, penolakan tidak akan lolos keluar dari
      // pengendali klik sebagai ralat tanpa pemungut yang menyebabkan padam
      // ditelan secara senyap.
      const dibuang = sesiSaya !== sesi;
      pulihBtn();
      if (!dibuang) window.alert(RALAT_TEKNIKAL);
      return;
    }
    const { data, error } = hasil;

    const lapuk = saya !== jujukan;
    const dibuang = sesiSaya !== sesi;

    if (error) {
      pulihBtn();
      if (error.message.includes('kunci_salah')) {
        // Panel yang sudah digantikan tidak boleh menghalau sesiapa keluar —
        // muat() yang seterusnya akan melaporkan penolakan itu sendiri.
        if (lapuk) return;
        kunciDitolak();
        return;
      }
      // Sesi yang sudah berakhir dikecualikan: skrin frasa laluan sudah ada di
      // depan mata dan tiada apa yang boleh dibetulkan di sana.
      if (!dibuang) window.alert(RALAT_TEKNIKAL);
      return;
    }

    // `lapuk` menjadi benar apabila MANA-MANA muat() yang bersaing menaikkan
    // jujukan — bukan hanya bila sesi berakhir. Kalau semakan di sini guna
    // `lapuk`, satu padam yang mendarat SELEPAS padam lain (yang sudah
    // memanggil muat() sendiri) reput senyap: ia tidak memuat semula, dan
    // panel terus menunjukkan baris yang sebenarnya sudah dipadam.
    //
    // reset() menaikkan KEDUA-DUA nombor, jadi `dibuang` sentiasa juga `lapuk`.
    // Semakan pada `dibuang` masih menutup kes sesi sudah berakhir (panel
    // mesti kekal kosong di belakang skrin frasa laluan), tetapi padam yang
    // cuma digantikan oleh muat() lain dibenarkan mencetuskan muat() semula
    // sendiri — ia cuma menggantikan paparan dengan data yang lebih segar.
    if (dibuang) return;

    // Butang tidak dipulihkan di sini: muat() di bawah menggantikan seluruh
    // senarai, jadi baris (dan butang ini) akan tercabut sebentar lagi —
    // memulihkannya dahulu cuma menawarkan kawalan hidup sekejap pada baris
    // yang sudah pun hilang.
    //
    // false bermakna baris itu memang sudah tiada — orang lain, atau tab lain,
    // sudah memadamnya. Itu bukan ralat; ia cuma bermakna paparan ini lapuk,
    // dan muat() di bawah akan menunjukkan keadaan sebenar.
    if (data !== true) window.alert('RSVP ini sudah tiada. Senarai akan dimuat semula.');
    await muat();
  }

  async function muat(): Promise<void> {
    const saya = (jujukan += 1);
    root.replaceChildren();
    root.appendChild(el('p', 'text-sm text-stone-500', 'Memuatkan…'));

    // Seluruh badan dibalut: panel sudah dikosongkan di atas, jadi apa-apa
    // lontaran selepas ini akan meninggalkan panel kosong tanpa jalan keluar.
    try {
      const { data, error } = await panggil('urus_rsvp', { p_kunci: kunci() });
      if (saya !== jujukan) return;

      if (error) {
        if (error.message.includes('kunci_salah')) {
          // Kosongkan sendiri: kunciDitolak() hanya menyembunyikan pembalut
          // papan, ia tidak meruntuhkan DOM modul ini.
          root.replaceChildren();
          kunciDitolak();
          return;
        }
        paparGagal();
        return;
      }

      const d = data as DataRsvp;
      if (
        !d ||
        !Array.isArray(d.senarai) ||
        typeof d.jumlah?.rsvp !== 'number' ||
        typeof d.jumlah?.pax !== 'number' ||
        typeof d.jumlah?.bermalam_orang !== 'number' ||
        typeof d.jumlah?.bermalam_bilangan !== 'number'
      ) {
        paparGagal();
        return;
      }
      root.replaceChildren();

      // Dua lajur pada telefon, tiga pada skrin lebih besar. Kad ketiga turun
      // ke baris kedua pada 375px dan itu memang yang dikehendaki.
      const kadBekas = el('div', 'grid grid-cols-2 gap-2 sm:grid-cols-3');
      kadBekas.appendChild(kad('Jumlah RSVP', String(d.jumlah.rsvp)));
      kadBekas.appendChild(kad('Jumlah orang', String(d.jumlah.pax)));
      kadBekas.appendChild(
        kad('Bermalam', `${d.jumlah.bermalam_orang} orang`, `${d.jumlah.bermalam_bilangan} tempahan`),
      );
      root.appendChild(kadBekas);

      const ul = el('ul', 'mt-6 space-y-2');
      if (d.senarai.length === 0) {
        ul.appendChild(el('li', 'text-sm text-stone-500', 'Tiada RSVP lagi.'));
      }
      for (const r of d.senarai) ul.appendChild(baris(r));
      root.appendChild(ul);
    } catch {
      // Muat yang sudah digantikan tidak boleh melukis apa-apa semula —
      // termasuk skrin gagal.
      if (saya !== jujukan) return;
      paparGagal();
    }
  }

  function reset(): void {
    jujukan += 1;
    sesi += 1;
    root.replaceChildren();
  }

  return { muat, reset };
}
