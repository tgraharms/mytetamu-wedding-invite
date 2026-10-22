#!/usr/bin/env node
/**
 * Ujian tangan untuk matematik karusel gelung. Jalankan:
 *
 *     node scripts/carousel-gelung.test.mjs
 *
 * SENGAJA tidak disambung ke `npm run build` — projek ini tiada pelari ujian
 * dan tidak sepatutnya menambah satu. Ia dijalankan dengan tangan bila
 * src/lib/carouselGelung.ts disentuh.
 *
 * Kenapa ujian ini wujud, dan kenapa ia menyapu SETIAP piksel: kelakuan skrol
 * tidak dapat diperhatikan langsung dalam persekitaran pembangunan projek ini.
 * Penegasan di bawah menggantikan ujian pelayar yang tidak boleh dijalankan.
 * Yang paling penting ialah INVARIAN HALIMUNAN: selepas setiap lompatan, kad
 * yang berpusat mestilah kad yang sama seperti sebelumnya. Melanggarnya
 * bermakna barisan itu tersentak di depan mata tetamu.
 */
import {
  bolehGelung,
  kiraKlon,
  binaGeometri,
  kitaran,
  jumlahTrek,
  sasaranTrek,
  indeksTrek,
  indeksKad,
  leretMula,
  rancangLompat,
  trekTerdekat,
} from '../src/lib/carouselGelung.ts';

let lulus = 0;
const gagal = [];
const ok = (syarat, label) => {
  if (syarat) lulus++;
  else if (gagal.length < 20) gagal.push(label);
};

/** Bina geometri sama seperti yang dibuat pemasang DOM sebenar. */
function bina(n, pandangan, lebarKad = 288, jurang = 12) {
  const langkah = lebarKad + jurang;
  const klon = kiraKlon(n, pandangan, langkah);
  if (klon === 0) return null;
  const M = n + 2 * klon;
  // maks dikira daripada susun atur sebenar: pelapik tepi + semua kad + jurang.
  const lapik = Math.max(0, Math.round((pandangan - lebarKad) / 2));
  const lebarKandungan = 2 * lapik + M * lebarKad + (M - 1) * jurang;
  const maks = lebarKandungan - pandangan;
  return binaGeometri({ bilangan: n, pandangan, langkah, maks });
}

const PANDANGAN = [320, 360, 375, 390, 412, 430, 448];
const BILANGAN = [3, 4, 5, 6, 8, 10, 12, 16, 24];

let bentuk = 0;
for (const pandangan of PANDANGAN) {
  for (const n of BILANGAN) {
    const g = bina(n, pandangan);
    ok(g !== null, `geometri sah n=${n} v=${pandangan}`);
    if (!g) continue;
    bentuk++;
    const c = kitaran(g);
    const M = jumlahTrek(g);

    // 1. Pelapik tepi betul: trek pertama dan terakhir berpusat tepat pada
    //    kedua-dua hujung julat skrol.
    ok(Math.abs(sasaranTrek(0, g)) <= 1, `mula tepat n=${n} v=${pandangan}`);
    ok(Math.abs(sasaranTrek(M - 1, g) - g.maks) <= 2, `hujung tepat n=${n} v=${pandangan}`);

    // 2. ADUAN PEMILIK, dijadikan penegasan: pada kedudukan permulaan, jiran di
    //    KIRI kad pertama ialah kad TERAKHIR senarai — bukan ruang kosong.
    const mula = leretMula(g);
    ok(indeksKad(mula, g) === 0, `kad 0 berpusat pada permulaan n=${n}`);
    ok(indeksKad(mula - g.langkah, g) === n - 1, `kad terakhir di kiri n=${n} v=${pandangan}`);
    ok(indeksKad(mula + g.langkah, g) === 1 % n, `kad kedua di kanan n=${n}`);
    ok(mula > 0 && mula < g.maks, `permulaan jauh dari dinding n=${n} v=${pandangan}`);

    // 3. Sapuan setiap piksel merentas seluruh julat skrol.
    for (let x = 0; x <= g.maks; x += 1) {
      const r = rancangLompat(x, g);
      ok(r.delta === 0 || Math.abs(r.delta) === c, `delta gandaan kitaran x=${x} n=${n}`);
      if (r.delta === 0) continue;
      const y = x + r.delta;
      ok(y > 0 && y < g.maks, `destinasi dalam julat x=${x} n=${n} v=${pandangan}`);
      // INVARIAN HALIMUNAN.
      ok(indeksKad(y, g) === indeksKad(x, g), `indeks kekal x=${x} n=${n} v=${pandangan}`);
      // Sekali lompat sudah memadai — tiada gelung lompat-melompat.
      ok(rancangLompat(y, g).delta === 0, `sekali lompat cukup x=${x} n=${n} v=${pandangan}`);
      // Pulang ke jalur rumah.
      const t = indeksTrek(y, g);
      ok(t >= g.klon && t <= g.klon + n - 1, `pulang ke jalur rumah x=${x} n=${n}`);
    }

    // 4. Berehat di atas mana-mana kad sebenar tidak mencetuskan apa-apa.
    for (let i = 0; i < n; i++) {
      const x = sasaranTrek(g.klon + i, g);
      ok(rancangLompat(x, g).delta === 0, `tiada lompat pada kad sebenar ${i} n=${n}`);
      ok(indeksKad(x, g) === i, `indeksKad betul pada kad ${i} n=${n}`);
    }

    // 5. Lilitan pada KEDUA-DUA hujung jalur rumah.
    const cerminKiri = sasaranTrek(g.klon - 1, g);
    const cerminKanan = sasaranTrek(g.klon + n, g);
    ok(rancangLompat(cerminKiri, g).delta === c, `lilit ke kanan n=${n} v=${pandangan}`);
    ok(rancangLompat(cerminKanan, g).delta === -c, `lilit ke kiri n=${n} v=${pandangan}`);
    ok(indeksKad(cerminKiri, g) === n - 1, `cermin kiri = kad terakhir n=${n}`);
    ok(indeksKad(cerminKanan, g) === 0, `cermin kanan = kad pertama n=${n}`);

    // 6. Dinding: tidak pernah menulis TEPAT pada hujung (pelayar melantun di
    //    situ), tetapi jaring keselamatan sebelum itu mesti berfungsi.
    ok(rancangLompat(0, g).delta === 0, `tiada tulisan pada 0 n=${n}`);
    ok(rancangLompat(g.maks, g).delta === 0, `tiada tulisan pada maks n=${n}`);
    ok(rancangLompat(1, g).segera === true, `gesaan hampir 0 n=${n} v=${pandangan}`);
    ok(rancangLompat(g.maks - 1, g).segera === true, `gesaan hampir maks n=${n} v=${pandangan}`);

    // 7. Titik penunjuk: sasaran sentiasa sah dan sentiasa kad yang betul.
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = sasaranTrek(g.klon + j, g);
        const t = trekTerdekat(x, i, g);
        ok(t >= 0 && t < M, `trekTerdekat dalam julat trek i=${i} j=${j} n=${n}`);
        const sasaran = sasaranTrek(t, g);
        ok(sasaran >= 0 && sasaran <= g.maks, `sasaran titik dalam julat i=${i} j=${j} n=${n}`);
        ok(indeksKad(sasaran, g) === i, `titik menuju kad betul i=${i} j=${j} n=${n}`);
        // REGRESI SEBENAR: titik pernah menghantar tetamu betul-betul ke hujung
        // skrol, iaitu ke atas kad cermin yang lengai — dan rancangLompat()
        // memang enggan menulis di situ, jadi tiada apa yang memulangkan
        // mereka. Setiap pendaratan mesti berada dalam kawasan yang lompatan
        // masih boleh selamatkan.
        ok(
          sasaran >= g.langkah && sasaran <= g.maks - g.langkah,
          `titik tidak mendarat di dinding i=${i} j=${j} n=${n} v=${pandangan}`,
        );
        ok(
          rancangLompat(sasaran, g).delta !== 0 || (indeksTrek(sasaran, g) >= g.klon && indeksTrek(sasaran, g) <= g.klon + n - 1),
          `pendaratan titik boleh diselamatkan i=${i} j=${j} n=${n}`,
        );
      }
    }
    // Jalan pintas: dari kad 0, kad terakhir ialah SATU langkah ke kiri.
    const dariKad0 = sasaranTrek(g.klon, g);
    ok(
      Math.abs(sasaranTrek(trekTerdekat(dariKad0, n - 1, g), g) - (dariKad0 - g.langkah)) <= 1,
      `jalan pintas ke kad terakhir n=${n} v=${pandangan}`,
    );
  }
}

// 8. Gagal-terbuka: bila gelung MESTI menolak dan tetamu kekal dengan karusel
//    hari ini. Menolak dengan senyap ialah kelakuan yang betul di sini.
ok(bolehGelung(0, 360, 300) === false, 'tolak senarai kosong');
ok(bolehGelung(1, 360, 300) === false, 'tolak senarai satu kad');
ok(bolehGelung(2, 360, 300) === false, 'tolak senarai dua kad');
ok(bolehGelung(3, 0, 300) === false, 'tolak bekas lebar sifar');
ok(bolehGelung(3, 360, 0) === false, 'tolak langkah sifar');
ok(bolehGelung(3, 360, NaN) === false, 'tolak NaN');
ok(bolehGelung(3.5, 360, 300) === false, 'tolak bilangan pecahan');
ok(bolehGelung(3, 1200, 300) === false, 'tolak bekas lebih lebar daripada satu pusingan');
ok(bolehGelung(3, 360, 300) === true, 'terima 3 kad pada telefon');
ok(bina(1, 360) === null, 'bina() tolak satu kad');
ok(bina(2, 360) === null, 'bina() tolak dua kad');
ok(kiraKlon(1, 360, 300) === 0, 'kiraKlon sifar bila tidak layak');
ok(kiraKlon(3, 360, 300) === 3, 'kiraKlon dihad oleh bilangan kad sebenar');
ok(binaGeometri({ bilangan: 10, pandangan: 360, langkah: 300, maks: 0 }) === null, 'tolak maks sifar');
ok(binaGeometri({ bilangan: 10, pandangan: 360, langkah: 300, maks: 99 }) === null, 'tolak maks tersasar');

// 9. Input bermusuhan tidak boleh menggerakkan apa-apa.
{
  const g = bina(10, 375);
  for (const x of [NaN, Infinity, -Infinity, -5000, 1e9, undefined, null, '120', {}]) {
    ok(rancangLompat(x, g).delta === 0, `input bermusuhan diam: ${String(x)}`);
  }
}

// 10. Geometri SEBENAR tapak ini: 10 penginapan, kad 288px, jurang 12px,
//     bekas 375px (iPhone biasa).
{
  const g = bina(10, 375);
  ok(g.langkah === 300, 'langkah sebenar 300px');
  ok(kitaran(g) === 3000, 'kitaran sebenar 3000px');
  ok(g.klon === 4, 'klon sebenar 4 setiap belah');
  ok(jumlahTrek(g) === 18, 'jumlah trek 18');
  ok(leretMula(g) === 1200, 'leretMula 1200px');
  console.log(
    `geometri sebenar: n=10 langkah=${g.langkah} kitaran=${kitaran(g)} klon=${g.klon} ` +
      `trek=${jumlahTrek(g)} mula=${leretMula(g)} maks=${g.maks}`,
  );
}

console.log(`bentuk geometri diuji: ${bentuk}`);
console.log(
  gagal.length === 0
    ? `SEMUA ${lulus} PENEGASAN LULUS`
    : `${gagal.length} GAGAL daripada ${lulus + gagal.length}:\n  ` + gagal.join('\n  '),
);
process.exit(gagal.length === 0 ? 0 : 1);
