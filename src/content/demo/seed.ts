import type { DemoState } from '../../lib/demoClient';

/**
 * Sample data for portfolio mode.
 *
 * gift_item, fund_goal and aktiviti are copied from the live database
 * (2026-10-19): product names, shop links and public places, nothing
 * personal. Every guest, RSVP and wish below is invented; the only real names
 * are the couple's own, as on every page of the site. Guest phones come from
 * the UK's Ofcom drama range (447700900000 to 447700900999), which is
 * reserved for fiction, so no real person can own one.
 *
 * Bump `version` whenever the data changes, so open tabs drop their old copy.
 */
export const demoSeed: DemoState = {
  version: 2,

  gift_item: [
    { id: 23, nama: 'Xiaomi Smart Rice Cooker', pautan: 'https://shopee.com.my/Xiaomi-Smart-Rice-Cooker-i.340857652.3365690175', gambar_url: '/gifts/periuk-nasi.webp', nota: '', aktif: true, urutan: 1 },
    { id: 24, nama: 'Philips Steam Iron', pautan: 'https://shopee.com.my/Philips-Steam-Iron-i.175347531.12423715357', gambar_url: '/gifts/seterika.webp', nota: '', aktif: true, urutan: 2 },
    { id: 25, nama: 'Kerusi Healing', pautan: 'https://shopee.com.my/Kerusi-Healing-i.1308266243.56208854907', gambar_url: '/gifts/kerusi.webp', nota: '', aktif: true, urutan: 3 },
    { id: 16, nama: 'Swiss Thomas Blender & Food Processor 2-in-1 (2.5L)', pautan: 'https://shopee.com.my/Swiss-Thomas-Heavy-Duty-Blender-2IN1-Food-Processor-Pengisar-2.5L-Juicer-Food-Blender-4500W-High-Power-Mixer-i.366421965.29890089497', gambar_url: '/gifts/pengisar.webp', nota: '', aktif: true, urutan: 4 },
    { id: 17, nama: 'Tefal Cook & Eat 7pc Stainless Steel Cookware Set', pautan: 'https://shopee.com.my/Tefal-Cook-Eat-7pc-Set-Premium-Stainless-Steel-Cookware-i.23746946.51414977508', gambar_url: '/gifts/set-periuk.webp', nota: '', aktif: true, urutan: 5 },
    { id: 18, nama: 'Russell Taylors 2-Slot Bread Toaster 700W (T2)', pautan: 'https://shopee.com.my/Russell-Taylors-2-Slot-700-Watt-Bread-Toaster-7-Shades-Setting-i.49743442.26035651400', gambar_url: '/gifts/pembakar-roti.webp', nota: '', aktif: true, urutan: 6 },
    { id: 19, nama: 'Khind Mini Electric Oven 10L (OT10)', pautan: 'https://shopee.com.my/Khind-10L-Mini-Electric-Oven-White-Green-OT10-i.154039251.19256482374', gambar_url: '/gifts/ketuhar.webp', nota: '', aktif: true, urutan: 7 },
    { id: 20, nama: 'STARS Luxury Hotel Mattress Topper (Tilam)', pautan: 'https://shopee.com.my/STARS-Luxury-Hotel-Mattress-Topper-Tilam-Mattress-Pad-i.496951381.13325581372', gambar_url: '/gifts/tilam.webp', nota: '', aktif: true, urutan: 8 },
    { id: 21, nama: 'Siti Khadijah Telekung Modish Maya (White)', pautan: 'https://shopee.com.my/Siti-Khadijah-Telekung-Modish-Maya-in-White-i.46892648.51463040863', gambar_url: '/gifts/telekung.webp', nota: '', aktif: true, urutan: 9 },
    { id: 22, nama: 'Yankee Candle Large Jar (623g)', pautan: 'https://shopee.com.my/Yankee-Candle-Large-Jar-Candle-623g-i.1036437441.28015696394', gambar_url: '/gifts/lilin.webp', nota: '', aktif: true, urutan: 10 },
    { id: 26, nama: 'Sephora Gift Card', pautan: 'https://www.sephora.my/pages/giftcards-guide', gambar_url: '/gifts/kad-sephora.webp', nota: '', aktif: true, urutan: 11 },
    { id: 27, nama: 'Uniqlo Gift Card', pautan: '', gambar_url: '/gifts/kad-uniqlo.webp', nota: 'Dibeli terus di kedai Uniqlo, tiada pautan dalam talian', aktif: true, urutan: 12 },
  ],

  fund_goal: [
    { id: 1, nama: 'Xiaomi Mijia Front Load Washer & Dryer', sasaran: 850, emoji: '🧺', aktif: true, urutan: 1 },
    { id: 2, nama: 'Midea Instant Water Heater', sasaran: 350, emoji: '🚿', aktif: true, urutan: 2 },
    { id: 8, nama: 'Genting Skyworlds Trip', sasaran: 400, emoji: '🎯', aktif: true, urutan: 3 },
  ],

  aktiviti: [
    { id: 11, nama: 'Kopi Empat Petang', kategori: 'Kopi', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Kopi%20Empat%20Petang&query_place_id=ChIJK8EB2PG5zjERdXFMy3QxgPM', nota: 'Kopi & coklat ala kafe di lorong belakang Maybank', aktif: true, urutan: 1, imej: '/places/kopi-empat-petang.jpg', lencana: 'Kegemaran Pengantin' },
    { id: 3, nama: 'Pekan Sehari Temerloh (Pekan Sari)', kategori: 'Pasar', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Pekan%20Sehari%20Temerloh&query_place_id=ChIJKRzK8o64zjERUE17H3-o7Z4', nota: 'Pekan sehari terpanjang di Malaysia, ikan patin & tempoyak segar, Ahad pagi', aktif: true, urutan: 2, imej: '/places/pekan-sehari.jpg', lencana: '' },
    { id: 4, nama: 'Dataran Temerloh', kategori: 'Acara', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Dataran%20Temerloh&query_place_id=ChIJuat7Ggm5zjERYzirtEzwXFY', nota: 'Dataran utama bandar, selalu ada expo & acara hujung minggu', aktif: true, urutan: 3, imej: '/places/dataran-temerloh.jpg', lencana: '' },
    { id: 5, nama: 'Esplanade Temerloh', kategori: 'Santai', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Esplanade%20Temerloh&query_place_id=ChIJk23w-o64zjEROTkOjX178i0', nota: 'Santai di tepi Sungai Pahang & cuba jambatan gantung (RM3)', aktif: true, urutan: 4, imej: '/places/esplanade-temerloh.jpg', lencana: '' },
    { id: 6, nama: 'Temerloh River Cruise', kategori: 'Santai', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Esplanade%20Temerloh&query_place_id=ChIJk23w-o64zjEROTkOjX178i0', nota: 'Menyusuri Sungai Pahang dengan bot, bertolak dari Esplanade', aktif: true, urutan: 5, imej: '/places/river-cruise.jpg', lencana: '' },
    { id: 7, nama: 'Pasar Anak Muda Temerloh', kategori: 'Pasar', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Pasar%20Anak%20Muda%20Temerloh&query_place_id=ChIJqbD0TAC5zjERqv13__E_2BM', nota: 'Pasar malam Jumaat, makanan viral, harga berpatutan', aktif: true, urutan: 6, imej: '/places/pasar-anak-muda.jpg', lencana: '' },
    { id: 8, nama: 'Car Boot Sale Temerloh (CBS)', kategori: 'Pasar', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Car%20Boot%20Sale%20Temerloh&query_place_id=ChIJnTJkOm65zjERI7zIYHZ8pQo', nota: 'Buru barangan & baju bundle murah, Sabtu 8 malam hingga 1 pagi', aktif: true, urutan: 7, imej: '/places/car-boot-sale.jpg', lencana: '' },
    { id: 9, nama: 'Pasar Karat Temerloh', kategori: 'Pasar', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Pasar%20Karat%20Temerloh&query_place_id=ChIJWVSx7Pe5zjERK9iDb1fBTvk', nota: 'Cari barang antik & preloved, Sabtu malam', aktif: true, urutan: 8, imej: '/places/pasar-karat.jpg', lencana: '' },
    { id: 10, nama: 'Pasar Seni Temerloh', kategori: 'Pasar', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Pasar%20Seni%20Temerloh&query_place_id=ChIJ16cxLAC5zjERAwTFqVqKlnw', nota: 'Kraf tangan, batik & cenderahati tempatan, Jumaat hingga Ahad petang', aktif: true, urutan: 9, imej: '/places/pasar-seni.jpg', lencana: '' },
    { id: 12, nama: 'Kopi Yuen', kategori: 'Kopi', jarak: '5 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Kopi%20Yuen%20Temerloh&query_place_id=ChIJmcTNBd65zjERhGCJGJ66y3Y', nota: 'Kopi Vietnam premium dalam kedai kecil yang cozy, tutup Isnin', aktif: true, urutan: 10, imej: '/places/kopi-yuen.jpg', lencana: '' },
    { id: 13, nama: 'Titik Tengah Semenanjung Malaysia', kategori: 'Mercu Tanda', jarak: '30 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=Titik%20Tengah%20Semenanjung%20Malaysia&query_place_id=ChIJiUt8fRelzjERGR4tYFKtMkE', nota: 'Bergambar di titik tengah Semenanjung Malaysia (masuk RM5)', aktif: true, urutan: 11, imej: '/places/titik-tengah.jpg', lencana: '' },
    { id: 14, nama: 'Pusat Konservasi Gajah Kuala Gandah', kategori: 'Alam', jarak: '45 minit', pautan: 'https://www.google.com/maps/search/?api=1&query=National%20Elephant%20Conservation%20Centre%20Kuala%20Gandah&query_place_id=ChIJ3e9aw-irzjERXjM5oT8FdGs', nota: 'Jumpa gajah dari dekat, masuk percuma, terbaik waktu pagi', aktif: true, urutan: 12, imej: '/places/kuala-gandah.jpg', lencana: '' },
  ],

  doa: [
    { id: 1, nama: 'Mak Su', mesej: 'Selamat pengantin baru! Semoga kekal hingga ke syurga.', created_at: '2026-08-21T13:05:00.000Z' },
    { id: 2, nama: 'Faizal & Aina', mesej: 'Tahniah Zul dan Aqira. Semoga dipermudahkan segala urusan.', created_at: '2026-08-25T02:40:00.000Z' },
    { id: 3, nama: 'Kak Lina', mesej: 'Barakallahu lakuma wa baraka alaikuma. Semoga bahagia selalu.', created_at: '2026-08-30T11:15:00.000Z' },
    { id: 4, nama: 'Hafiz', mesej: 'Semoga menjadi keluarga yang sakinah, mawaddah wa rahmah.', created_at: '2026-09-02T14:20:00.000Z' },
    { id: 5, nama: 'Geng Universiti', mesej: 'Akhirnya! Tahniah, semoga bahagia hingga ke anak cucu.', created_at: '2026-09-06T15:55:00.000Z' },
    { id: 6, nama: 'Nurul', mesej: 'Cantiknya jemputan ni. Jumpa di Temerloh!', created_at: '2026-09-10T01:30:00.000Z' },
    { id: 7, nama: 'Pak Long Hamid', mesej: 'Doa Pak Long untuk kamu berdua, semoga dimurahkan rezeki.', created_at: '2026-09-14T12:00:00.000Z' },
    { id: 8, nama: 'Rakan Sepejabat', mesej: 'Tahniah! Jangan lupa bawa balik ikan patin Temerloh.', created_at: '2026-09-17T09:45:00.000Z' },
  ],

  rsvp: [
    { id: 'demo-rsvp-01', nama: 'Keluarga Puan Rohana', pax: 4, bermalam: true, created_at: '2026-08-04T12:10:00.000Z' },
    { id: 'demo-rsvp-02', nama: 'Encik Faizal & isteri', pax: 2, bermalam: true, created_at: '2026-08-06T03:25:00.000Z' },
    { id: 'demo-rsvp-03', nama: 'Kak Lina sekeluarga', pax: 5, bermalam: true, created_at: '2026-08-09T14:00:00.000Z' },
    { id: 'demo-rsvp-04', nama: 'Hafiz', pax: 1, bermalam: false, created_at: '2026-08-12T10:45:00.000Z' },
    { id: 'demo-rsvp-05', nama: 'Nurul & Adam', pax: 2, bermalam: null, created_at: '2026-08-15T16:30:00.000Z' },
    { id: 'demo-rsvp-06', nama: 'Pak Long Hamid', pax: 6, bermalam: true, created_at: '2026-08-19T01:15:00.000Z' },
    { id: 'demo-rsvp-07', nama: 'Geng Universiti', pax: 8, bermalam: false, created_at: '2026-08-23T13:50:00.000Z' },
    { id: 'demo-rsvp-08', nama: 'Aiman', pax: 1, bermalam: false, created_at: '2026-08-27T08:05:00.000Z' },
    { id: 'demo-rsvp-09', nama: 'Keluarga Cik Mah', pax: 3, bermalam: true, created_at: '2026-08-31T11:40:00.000Z' },
    { id: 'demo-rsvp-10', nama: 'Danial & Sofea', pax: 2, bermalam: true, created_at: '2026-09-03T15:20:00.000Z' },
    { id: 'demo-rsvp-11', nama: 'Rakan Sepejabat', pax: 4, bermalam: false, created_at: '2026-09-07T04:35:00.000Z' },
    { id: 'demo-rsvp-12', nama: 'Mak Ngah Salmah', pax: 3, bermalam: true, created_at: '2026-09-11T12:55:00.000Z' },
  ],

  guest: [
    { id: 1, telefon: '447700900001', nama: 'Puan Rohana', created_at: '2026-08-05T09:00:00.000Z' },
    { id: 2, telefon: '447700900002', nama: 'Encik Faizal', created_at: '2026-08-08T10:30:00.000Z' },
    { id: 3, telefon: '447700900003', nama: 'Kak Lina', created_at: '2026-08-10T14:15:00.000Z' },
    { id: 4, telefon: '447700900004', nama: 'Hafiz', created_at: '2026-08-13T11:00:00.000Z' },
    { id: 5, telefon: '447700900005', nama: 'Nurul', created_at: '2026-08-16T17:20:00.000Z' },
    { id: 6, telefon: '447700900006', nama: 'Pak Long Hamid', created_at: '2026-08-20T02:45:00.000Z' },
  ],

  reservation: [
    { id: 1, gift_item_id: 23, guest_id: 1, created_at: '2026-08-05T09:01:00.000Z' },
    { id: 2, gift_item_id: 19, guest_id: 2, created_at: '2026-08-08T10:31:00.000Z' },
  ],

  contribution: [
    { id: 1, goal_id: 1, guest_id: 3, amaun: 100, created_at: '2026-08-10T14:16:00.000Z' },
    { id: 2, goal_id: 2, guest_id: 4, amaun: 50, created_at: '2026-08-13T11:01:00.000Z' },
  ],
};
