import { supabase } from './supabase';

export function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Ikon "buka pautan" — hiasan semata-mata; teks pautan sudah memadai untuk
 *  pembaca skrin, jadi ia disembunyikan daripada mereka. */
const IKON_PAUTAN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M7 17 17 7M9 7h8v8"/></svg>';

export function linkEl(href: string, text: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'pautan-luar';
  a.textContent = text;
  // Teks dipasang melalui textContent di atas, jadi hanya rentetan tetap ini
  // yang pernah dihuraikan sebagai HTML.
  a.insertAdjacentHTML('beforeend', IKON_PAUTAN);
  return a;
}

interface LoadListOpts {
  table: string;
  container: HTMLElement;
  loading: HTMLElement;
  failure: HTMLElement;
  render: (row: Record<string, any>) => HTMLElement;
}

export async function loadList(opts: LoadListOpts): Promise<Record<string, any>[]> {
  try {
    const { data, error } = await supabase
      .from(opts.table)
      .select('*')
      .order('urutan')
      .abortSignal(AbortSignal.timeout(15_000));
    if (error || !data) throw error;
    opts.loading.classList.add('hidden');
    // Unhide BEFORE appending: an image inserted into a display:none subtree
    // has no box, so `loading="lazy"` cannot compute an intersection and the
    // browser fetches every one of them as soon as the container appears.
    opts.container.classList.remove('hidden');
    for (const row of data) opts.container.appendChild(opts.render(row));
    return data;
  } catch {
    opts.loading.classList.add('hidden');
    opts.failure.classList.remove('hidden');
    return [];
  }
}
