// localStorage boleh gagal (mod privasi) — semua akses dibalut try/catch.
const NAME_KEY = 'rsvp-nama';
const PROFILE_KEY = 'profil-tetamu';

// Kunci v1: peta token tempahan per peranti. Identiti kini berasaskan nombor
// telefon, jadi kunci lama dibuang terus bila modul ini dimuatkan.
try {
  localStorage.removeItem('tempahan-hadiah');
} catch {
  /* abaikan */
}

export interface ProfilTetamu {
  nama: string;
  telefon: string;
}

/**
 * Nama acara siaran identiti. Bahagian lain pada halaman yang sama mendengarnya
 * supaya nombor telefon yang baru dipelajari di satu borang terus membuka
 * bahagian yang lain — tetamu tidak perlu menaipnya dua kali.
 */
export const ACARA_PROFIL = 'profil-tetamu-berubah';

export function getSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(nama: string): void {
  try {
    localStorage.setItem(NAME_KEY, nama);
  } catch {
    /* abaikan */
  }
}

export function getProfil(): ProfilTetamu | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    if (typeof parsed.nama !== 'string' || typeof parsed.telefon !== 'string') return null;
    if (parsed.nama === '' || parsed.telefon === '') return null;
    return { nama: parsed.nama, telefon: parsed.telefon };
  } catch {
    return null;
  }
}

/**
 * Siarkan identiti kepada seluruh halaman. `detail` membawa nombor telefon itu
 * sendiri kerana localStorage boleh disekat (mod privasi) — dalam keadaan itu
 * siaran inilah SATU-SATUNYA pembawa nombor tersebut kepada bahagian lain.
 *
 * Modul ini diimport oleh komponen pada tiga halaman, jadi siaran tidak boleh
 * sekali-kali membangkitkan ralat dalam persekitaran tanpa `window` atau
 * `CustomEvent` (contohnya semasa binaan/SSR).
 */
function siarkanProfil(nama: string, telefon: string): void {
  try {
    if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
    window.dispatchEvent(
      new CustomEvent<ProfilTetamu>(ACARA_PROFIL, { detail: { nama, telefon } }),
    );
  } catch {
    /* abaikan */
  }
}

export function saveProfil(nama: string, telefon: string): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ nama, telefon }));
  } catch {
    /* abaikan */
  }
  // Prefill RSVP kekal selari dengan profil.
  saveName(nama);
  // Selepas cache ditulis (atau cuba ditulis): satu-satunya tempat identiti
  // disimpan ialah di sini, jadi di sinilah jugalah ia disiarkan.
  siarkanProfil(nama, telefon);
}

/** Nama untuk prefill borang: profil dahulu, jatuh balik ke nama RSVP. */
export function getPrefillNama(): string {
  return getProfil()?.nama ?? getSavedName();
}

export function getPrefillTelefon(): string {
  return getProfil()?.telefon ?? '';
}
