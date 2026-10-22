// SEMUA kandungan boleh-edit untuk laman ini ada dalam fail ini.
// Cari "TODO" dan gantikan dengan maklumat sebenar.
export const site = {
  meta: {
    title: 'Walimatul Urus — Zulhairul & Shahidatul',
    description: 'Dengan penuh kesyukuran, kami menjemput anda ke majlis perkahwinan kami di Temerloh, Pahang.',
  },
  hero: {
    bismillah: 'Bismillahirrahmanirrahim',
    salam: 'Assalamualaikum dan salam sejahtera. Dengan penuh kesyukuran, kami menjemput Dato’ / Datin / Tuan / Puan / Encik / Cik ke majlis perkahwinan', // TODO semak nada
  },
  couple: {
    nama1: 'Zulhairul Ikram',
    nama2: 'Shahidatul Aqira',
    ibuBapa: 'TODO Nama ibu bapa penganjur (seperti dalam kad jemputan)',
  },
  event: {
    dateISO: '2026-09-19',
    dayName: 'Sabtu',
    displayDate: '19 September 2026',
    timeStart: '19:00',
    timeEnd: '23:30',
    displayTime: '7:00 malam – 11:30 malam',
  },
  venue: {
    name: 'Elegant Glam Hall',
    town: 'Temerloh, Pahang',
    address: 'Jalan Temerloh – Mentakab, 28000 Temerloh, Pahang',
    lat: 3.456226,
    lng: 102.4074496,
    driveNote: 'Lebih kurang 2 jam dari KL melalui Lebuhraya KL–Karak dan LPT (keluar di susur Temerloh).',
    // Pautan navigasi rasmi (buka aplikasi terus). Ganti jika lokasi berubah.
    maps: {
      waze: 'https://waze.com/ul/hw28gdm4sk',
      googleMaps: 'https://maps.app.goo.gl/nWt2f9SRFE6ZLwLLA',
      appleMaps: 'https://maps.apple/p/1X~_d445UUMtmG',
    },
  },
  rsvpDeadline: '12 September 2026',
  penginapan: {
    // Senarai pendek penginapan di Temerloh: 5 hotel dahulu, kemudian 5
    // homestay. Susunannya ikut skor ulasan yang ditimbang dengan jumlah
    // ulasan — 9.7 daripada 11 orang kurang boleh dipegang berbanding 8.1
    // daripada 738 orang, jadi yang mempunyai asas ulasan sebenar naik ke atas.
    //
    // `harga` ialah anggaran purata semalam dalam RM dan bergerak ikut musim;
    // kad tetamu memaparkannya dengan tanda lebih kurang, dan pautan tempahan
    // itulah yang muktamad. Sumber: Booking.com / Trip.com, Ogos 2026.
    stays: [
      { nama: 'Merrinton Hotel', jenis: 'Hotel', rating: '8.1', harga: 137, imej: '/stays/merrinton_hotel.jpg', pautan: 'https://www.booking.com/hotel/my/merrinton.html' },
      { nama: 'Palz Empire Hotel', jenis: 'Hotel', rating: '8.3', harga: 98, imej: '/stays/palz_empire_hotel.jpg', pautan: 'https://www.booking.com/hotel/my/palz-empire-temerloh.html' },
      { nama: 'Hotel Jelai', jenis: 'Hotel', rating: '8.1', harga: 134, imej: '/stays/hotel_jelai.jpg', pautan: 'https://www.booking.com/searchresults.html?ss=Hotel+Jelai+Temerloh' },
      { nama: 'Hotel Seri Malaysia', jenis: 'Hotel', rating: '7.8', harga: 159, imej: '/stays/hotel_seri_malaysia.jpg', pautan: 'https://www.booking.com/searchresults.html?ss=Hotel+Seri+Malaysia+Temerloh' },
      { nama: 'Hotel Green Park', jenis: 'Hotel', rating: '7.6', harga: 114, imej: '/stays/hotel_green_park.jpg', pautan: 'https://www.booking.com/searchresults.html?ss=Hotel+Green+Park+Temerloh' },
      { nama: 'Perry Barr La Ganta', jenis: 'Homestay', rating: '8.8', harga: 238, imej: '/stays/perry_barr_la_ganta.jpg', pautan: 'https://www.booking.com/hotel/my/perry-barr-la-ganta-residence.html' },
      { nama: 'Lakeview Resort', jenis: 'Homestay', rating: '8.6', harga: 189, imej: '/stays/lakeview_resort.jpg', pautan: 'https://www.booking.com/hotel/my/lakeview-resort.html' },
      { nama: 'Homestay Seri Pagi', jenis: 'Homestay', rating: '9.7', harga: 206, imej: '/stays/homestay_seri_pagi.jpg', pautan: 'https://www.booking.com/searchresults.html?ss=Homestay+Seri+Pagi+Temerloh' },
      { nama: 'Homestay Mardiyah', jenis: 'Homestay', rating: '9.2', harga: 320, imej: '/stays/homestay_mardiyah.jpg', pautan: 'https://www.booking.com/searchresults.html?ss=Homestay+Mardiyah+Temerloh' },
      { nama: 'Mayton Residence', jenis: 'Homestay', rating: '9.3', harga: 137, imej: '/stays/mayton_residence.jpg', pautan: 'https://my.trip.com/hotels/homestays/city/my/temerloh.html' },
    ],
  },
  salamKaut: {
    framing: 'Sekiranya ingin menyumbang secara tunai, imbas kod QR ini.',
  },
  penutup: {
    // Nombor tanpa "+" atau ruang, untuk pautan wa.me / tel.
    contacts: [
      { name: 'Zulhairul', role: 'Pengantin lelaki', phone: '' },
      { name: 'Aqira', role: 'Pengantin perempuan', phone: '' },
    ],
  },
} as const;
