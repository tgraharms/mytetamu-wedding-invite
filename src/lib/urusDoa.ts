/**
 * Panel Doa (ucapan tetamu) untuk papan /urus.
 *
 * Bentuknya sengaja sama dengan urusRsvp.ts: modul ini tidak tahu apa-apa
 * tentang halaman, menerima pembantu (panggil/kunci/kunciDitolak) melalui satu
 * antara muka, dan mengawal muat/reset dengan nombor jujukan + nombor sesi.
 * Dinding "Ucapan & Doa" di halaman utama hanya menunjukkan 50 ucapan terkini
 * dan tiada cara memadam; panel ini menunjukkan SEMUA dan boleh membuang yang
 * tidak sesuai.
 */
import { el } from './liveList';
import type { PanggilHasil } from './urusKandungan';

export interface DoaOpts {
  root: HTMLElement;
  panggil: (fn: string, params: Record<string, unknown>) => Promise<PanggilHasil>;
  /** Frasa laluan semasa; hanya diketahui selepas papan berjaya dimuatkan. */
  kunci: () => string;
  /** Dipanggil bila pelayan menolak frasa laluan; halaman akan minta semula. */
  kunciDitolak: () => void;
}

interface BarisDoa {
  id: number;
  nama: string;
  mesej: string;
  pada: string;
}

interface DataDoa {
  senarai: BarisDoa[];
  jumlah: number;
}

/** Sama seperti PanelRsvp — reset() wujud kerana kunciDitolak() tidak meruntuhkan DOM modul ini. */
export interface PanelDoa {
  muat: () => Promise<void>;
  reset: () => void;
}

const masa = (iso: string): string => new Date(iso).toLocaleString('ms-MY');

/** Mesej ralat generik bila panggilan padam gagal atas sebab teknikal. */
const RALAT_TEKNIKAL = 'Maaf, ada masalah teknikal. Sila cuba sekali lagi.';

/** Petikan pendek untuk dialog sahkan — mesej penuh boleh sampai 500 aksara. */
function petikan(mesej: string): string {
  const satuBaris = mesej.replace(/\s+/g, ' ').trim();
  return satuBaris.length > 60 ? `${satuBaris.slice(0, 57)}…` : satuBaris;
}

export function pasangDoa(o: DoaOpts): PanelDoa {
  const { root, panggil, kunci, kunciDitolak } = o;

  /** Nombor jujukan muat semasa — muat lama tidak boleh mengisi panel yang baru dikosongkan. */
  let jujukan = 0;

  /** Dinaikkan oleh reset() sahaja (sesi tamat) — selepas itu tiada dialog dilontar. */
  let sesi = 0;

  function paparGagal(): void {
    root.replaceChildren();
    const gagal = el('p', 'text-sm text-red-600', 'Maaf, senarai doa tidak dapat dimuatkan.');
    gagal.setAttribute('role', 'status');
    root.appendChild(gagal);
    const lagi = el('button', 'btn-outline mt-3 w-full max-w-sm', 'Cuba lagi') as HTMLButtonElement;
    lagi.type = 'button';
    lagi.addEventListener('click', () => { void muat(); });
    root.appendChild(lagi);
  }

  function baris(d: BarisDoa): HTMLElement {
    const li = el('li', 'flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3');
    const kiri = el('div', 'min-w-0');

    // Nama dan masa pada satu baris; nama dipotong elipsis kalau terlalu
    // panjang, masa duduk dalam span yang tidak dibenarkan mengecut.
    const tajuk = el('div', 'flex items-baseline gap-2');
    tajuk.appendChild(el('span', 'min-w-0 truncate text-sm font-medium', d.nama));
    tajuk.appendChild(el('span', 'shrink-0 text-xs text-stone-500', masa(d.pada)));
    kiri.appendChild(tajuk);

    // Mesej dipaparkan PENUH — inilah kandungan yang tuan rumah mahu baca.
    // Baris baharu tetamu dikekalkan (whitespace pre-line) dan perkataan
    // panjang tanpa ruang dipecah supaya tidak melimpah keluar kad.
    kiri.appendChild(el('p', 'mt-1 whitespace-pre-line break-words text-sm text-stone-700', d.mesej));

    li.appendChild(kiri);

    const btn = el('button', 'shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600', 'Padam') as HTMLButtonElement;
    btn.type = 'button';
    btn.setAttribute('aria-label', `Padam doa daripada ${d.nama}`);
    btn.addEventListener('click', () => { void padam(d, btn); });
    li.appendChild(btn);
    return li;
  }

  async function padam(d: BarisDoa, btn: HTMLButtonElement): Promise<void> {
    if (!window.confirm(`Padam doa daripada "${d.nama}"?\n\n“${petikan(d.mesej)}”`)) return;

    // Suapan segera supaya butang tidak ditekan dua kali pada talian perlahan.
    btn.disabled = true;
    btn.textContent = 'Memadam…';
    btn.setAttribute('aria-label', `Memadam doa daripada ${d.nama}`);

    const pulihBtn = (): void => {
      btn.disabled = false;
      btn.textContent = 'Padam';
      btn.setAttribute('aria-label', `Padam doa daripada ${d.nama}`);
    };

    const saya = jujukan;
    const sesiSaya = sesi;

    let hasil: PanggilHasil;
    try {
      hasil = await panggil('urus_padam_doa', { p_kunci: kunci(), p_doa_id: d.id });
    } catch {
      // Shim postgrest.ts tidak pernah menolak promis; cawangan ini pertahanan
      // berlapis sahaja (lihat nota panjang dalam urusRsvp.ts).
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
        if (lapuk) return;
        kunciDitolak();
        return;
      }
      if (!dibuang) window.alert(RALAT_TEKNIKAL);
      return;
    }

    // Semakan pada `dibuang`, bukan `lapuk` — sebab yang sama seperti dalam
    // urusRsvp.ts: padam yang cuma digantikan oleh muat() lain masih mesti
    // mencetuskan muat() semula sendiri.
    if (dibuang) return;

    // false bermakna baris itu memang sudah tiada — paparan ini lapuk sahaja.
    if (data !== true) window.alert('Doa ini sudah tiada. Senarai akan dimuat semula.');
    await muat();
  }

  async function muat(): Promise<void> {
    const saya = (jujukan += 1);
    root.replaceChildren();
    root.appendChild(el('p', 'text-sm text-stone-500', 'Memuatkan…'));

    try {
      const { data, error } = await panggil('urus_doa', { p_kunci: kunci() });
      if (saya !== jujukan) return;

      if (error) {
        if (error.message.includes('kunci_salah')) {
          root.replaceChildren();
          kunciDitolak();
          return;
        }
        paparGagal();
        return;
      }

      const d = data as DataDoa;
      if (!d || !Array.isArray(d.senarai) || typeof d.jumlah !== 'number') {
        paparGagal();
        return;
      }
      root.replaceChildren();

      root.appendChild(el('p', 'text-sm text-stone-600', `${d.jumlah} ucapan & doa diterima`));

      const ul = el('ul', 'mt-4 space-y-2');
      if (d.senarai.length === 0) {
        ul.appendChild(el('li', 'text-sm text-stone-500', 'Tiada doa lagi.'));
      }
      for (const r of d.senarai) ul.appendChild(baris(r));
      root.appendChild(ul);
    } catch {
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
