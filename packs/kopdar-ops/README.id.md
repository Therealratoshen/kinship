# `packs/kopdar-ops/` — paket benih

> **Terjemahan.** Sumbernya `README.md` (bahasa Inggris). Diterjemahkan 2026-10-22. Kalau berkas
> Inggris berubah, terjemahan ini bisa tertinggal — dan itu sebabnya berkas Inggris tetap jadi
> rujukan. Nama berkas, kunci, id aturan, dan perintah terminal **tidak** diterjemahkan: itu
> identifier, bukan kalimat.

Sebuah **contoh yang bisa di-fork**, bukan produk. Ini adalah bentuk acuan untuk `kinship/v1`: 3 agent di atas satu siklus hidup acara, satu antrean persetujuan, dan sekumpulan invarian yang tidak
boleh dihapus oleh fork. Baca [`PACK.md`](PACK.md) untuk apa yang dikerjakan skuad ini dan mengapa
setiap penolakan ada; berkas ini hanya on-ramp-nya.

Semua di bawah ini dijalankan terhadap direktori ini pada 2026-10-19.

## Coba tanpa menulis apa pun

Dari **root repo**:

```bash
node scripts/validate-pack.mjs packs/kopdar-ops   # gerbang bentuk: semua aturan PKG-* (hitung ulang: grep -o "'PKG-[0-9N]*'" scripts/validate-pack.mjs | sort -u | wc -l)
node runtime/tour.ts                              # menjalankan PAKET INI: menyusun draf, kamu menyetujui, lalu menolak mengirim
node runtime/tour.ts --json                       # sama, sebagai peta kontribusi yang bisa dibaca mesin
cd runtime && node --test test/*.test.ts          # rangkaian uji semantik, termasuk lima kasus tampering terhadap paket ini (hitung: `node runtime/tour.ts --json`)
```

Tur adalah cara tercepat untuk melihat apa itu *paket* ini: ia mem-boot direktori ini, menghasilkan
kartu persetujuan yang sungguhan, lalu menolak commit dengan `no_transport` — karena tidak ada
transport kanal yang ikut rilis di sini, dan itu memang disengaja (`DECISIONS.md` **D21**). Penolakan
itu adalah produknya, bukan fitur yang kurang.

## Mulai cepat sampai ke berkas

Paket ini butuh dua hal:|delapan jawaban (delapan `needs:` di bawah) dan satu host. Host acuan
ada di `adapters/reference/` — ia memiliki jam, penyimpanan, dan pencetakan, dan **tidak mengirim
apa pun**:

```bash
cd adapters/reference && npm install --no-audit --no-fund && cd ../..   # hanya symlink lokal, tidak unduh apa pun
cp packs/kopdar-ops/pack.local.example.yaml packs/kopdar-ops/pack.local.yaml
$EDITOR packs/kopdar-ops/pack.local.yaml            # isi delapan jawabannya

node adapters/reference/src/host.ts run    --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
node adapters/reference/src/host.ts draft  --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs \
  --class draft.reminder --agent event-ops --text-id "Pengingat: besok 19:00" --text-en "Reminder: tomorrow 19:00"
node adapters/reference/src/host.ts verify --pack packs/kopdar-ops --config packs/kopdar-ops/pack.local.yaml --log logs
```

Dua berkas muncul di `logs/<pack-key>/`: `events.jsonl` (satu `LoggedEvent` per baris) dan
`manifest.json` (cover — yang perlu diketahui pembaca lebih dulu). Berkas log **tidak pernah** ikut
ke repo: `.gitignore` menutup `logs/`, karena isinya memuat identifier anggota.

## Isi direktori

```
PACK.md              frontmatter (key, bundled, agents[], requiredSkills) + prosa yang dibutuhkan pem-fork
.kinship.yaml        schema kinship/v1 — autonomy_by_class, tools, guardrails, budgets, needs,
                     `sanction_ladder:` (opsional; lihat "Konsekuensi Anda, sebagai data" di bawah)
agents/<role>/AGENTS.md   instruksi per-agent — event-ops · engagement · moderator
skills/<name>/SKILL.md    19 prosedur, masing-masing dengan satu assertion yang membuat paket gagal
pack.example.yaml    bentuk satu berkas yang sudah digantikan; disimpan sebagai penunjuk (D17), tidak dibaca apa pun
```

Direktori *adalah* satuan yang bisa di-fork. YAML satu berkas tidak bisa memuat instruksi per-agent,
assertion per-skill, atau kunci bernama-nama, dan itulah sebabnya contoh datar itu digantikan pada
hari yang sama (**D17**).

## Sebelum kamu mengubah: lima hal yang bukan milikmu untuk diubah

1. **`bundled: true` milik kami.** Itu adalah klaim bahwa invarian di direktori ini dipegang oleh
   kami. Paket komunitas tidak boleh mengklaimnya, dan fork yang tetap memilikinya sambil menghapus
   apa yang dijanjikannya adalah pemalsuan persis yang diminta `SECURITY.md` untuk dilaporkan secara
   privat (**D15**).
2. **Blok `guardrails:` adalah lantai, bukan menu.** Validator gagal pada *menghapus* kunci atau
   *membalik* nilai, dan gagal pada nilai berbatas yang bergerak keluar dari rentangnya. Diuji
   terhadap direktori ini: menghapus `member_opt_out_persists_across_lanes`, menetapkan
   `member_message_cap_per_24h: 50`, atau menambahkan `whatsapp | send` masing-masing menghasilkan
   paket yang menolak boot (`runtime/test/pack.test.ts`).
3. **`whatsapp | send` tidak ada, bukan dilarang.** Tidak adanya itu justru inti soal: pembaca
   bisa grep daftar tool dan menemukan nol. Alasannya diturunkan ulang — Groups API Meta sudah hidup
   tapi dibatasi OBA dan maksimal 8 peserta, jadi jalur resmi tidak bisa melayani kopdar 100–500
   orang, sementara jalur tidak resmi berisiko pada nomor organiser itu sendiri (**D11** → dasar
   yang dikoreksi **D13**).
4. **`needs:` adalah gerbang anti-spam, bukan daftar periksa.** Boot mensyaratkan kedelapan
   jawaban terisi; satu yang kosong membuat runtime menaikkan `need_unanswered` alih-alih
   mengarang isi. Rekayasa itulah yang membuat alat komunitas AI terasa seperti spam, jadi
   ia ditolak saat boot, bukan dicatat sebagai peringatan.
5. **Paket ini menunjuk sebuah org, dan org-nya ada di atasnya** (`organisation: kinshipai` →
   `orgs/kinshipai.yaml`, spec §1.10 / PRD **FR-1.18**, **D35**). Dua konsekuensi untuk fork,
   dalam urutan yang menggigit: **kamu tidak boleh turun di bawah lantai-lantainya** —
   `member_message_cap_per_24h: 5` di bawah lantai `4` gagal boot dengan menyebut kuncinya, kedua
   angkanya, dan org-nya, dan itu *ditolak, bukan dijepit*, karena sistem yang diam-diam mengirim 4
   setelah kamu menulis 5 membuat berkasmu berbeda dengan dunia (**PKG-60** di CI, `settings.ts`
   saat boot); dan **berkas org harus ada** — menunjuk `organisation:` ke manifest yang tidak ada
   juga menolak, karena boot tanpa lantai akan membuang setiap lantai yang dipercayakan operator
   (**PKG-58**). Kalau kamu fork keluar dari bawah `kinshipai`, kamu **tidak mewarisi lantai dan
   sekaligus kehilangan lantainya**: tulis `orgs/<key>.yaml` sendiri (org adalah namespace terpisah
   dari pack; kunci org yang telanjang tidak pernah menjadi kunci pack) atau jangan deklarasikan
   `organisation:` sama sekali dan jadilah tier teratasmu sendiri. Separuh lagi dari berkas itu
   adalah himpunan seat: `decideCard`, `issueGrant`, `revokeGrant` dan `releaseShatter` hanya
   menerima seat manusia yang dideklarasikan, org dengan seat kedua ditolak dengan menyebut
   **PRD §12-Q12** (delegasi belum dibangun, dan fork tidak boleh membangunnya lewat jalan
   samping), dan *agent* bernama `organiser` ditolak sebagai benturan seat — begitulah caranya
   agent akan memegang veto manusia atas keluarannya sendiri (**FR-1.19**, **D36**).

   Satu jebakan kontributor saat menguji semua ini: salinan sementara direktori ini harus tetap
   berada di dalam folder bernama `kopdar-ops`, karena **PKG-06** membandingkan nama direktori dengan
   slug. Salin ke path `mkdtempSync()` yang telanjang dan setiap kasus tampering gagal karena
   penamaan ulang, bukan karena aturannya — begitulah tiga tes yang sudah rilis lulus karena alasan
   yang salah sampai 2026-10-19; sekarang mereka mengecek id `PKG-*`.

## Cara me-fork-nya

1. Salin direktorinya, lalu ubah `key:` di `.kinship.yaml` menjadi kunci bernama-namamu sendiri
   (`<kamu>/<lane>/<slug>`) dan setel `bundled: false`. Kunci itulah yang membuat jejak atribusi
   (`attribution.fork_chain`) bisa ditunjuk — reputasi, bukan pendapatan (**D5**).
2. Pertahankan kunci guardrail dan baris `defaults: deny`. Ubah *nilai* saja, di dalam rentangnya
   **dan** di atas atau sama dengan lantai orgmu — rentang itu milik validator, lantai itu milik
   org, dan melanggar salah satunya berarti paket yang menolak boot, bukan peringatan. Kalau kamu
   merasa sebuah rentang salah, buka issue yang berargumen soal itu — jangan mengedit lantainya.
3. Jawab delapan `needs` dengan nama, kanal, dan kontak eskalasi komunitasmu yang sebenarnya.
   `escalation_contact` itu vital: `escalate.to_human` tidak punya tujuan tanpa itu, dan
   `member_notice_text` adalah baris pengungkapan yang dilihat anggota, dalam dua bahasa.
4. Setel `needs.partner_policy` **hanya** kalau memang niat melakukan promosi konten mitra. Kelas
   `promote.cross-community` tidak bisa dicapai sebelum jawaban itu menyebut mitra yang diizinkan
   dan baris pengungkapan yang wajib — konten mitra adalah salinan *keluar*, bukan data anggota
   *keluar* (**D20**, spec §2.11).
5. Hapus skill yang tidak kamu jalankan. Skill yang tidak terpakai adalah klaim yang tidak bisa
   dipenuhi paket.
6. Jalankan gerbang bentuk, lalu tambahkan satu kasus gagal di `scripts/validate-pack.test.mjs` untuk
   apa pun yang longgarkan forkmu — aturan validator butuh kasus lulus **dan** kasus gagal
   (`CONTRIBUTING.md`).

Nama asli, kanal, dan data anggota apa pun letakkan di `packs/kopdar-ops/pack.local.yaml`, yang
di-gitignore (`.gitignore`). Paket yang membawa state adalah paket yang membocorkan daftar
peserta seseorang ke deploy berikutnya (**PACK.md** catatan 3).

**Kunci provider tidak masuk ke folder mana pun di sini — bahkan tidak ke `pack.local.yaml`.**
Kunci model milikmu, dipegang oleh host yang menjalankan model (`spec/HOST-CONTRACT.md` seam 1,
**D33**); Kinship menghitung biaya lewat `recordSpend` dan tidak pernah melihat kredensialnya.
`PKG-57` menjadikan itu kegagalan build, bukan saran: `sk-…`, `ghp_…`, `xox…-…`, `AKIA…`, `AIza…`,
`glpat-…`, `npm_…`, atau baris private key PEM di berkas pack mana pun — di komentar atau di
petunjuk markdown juga — gagal di gerbang bentuk, dan pesannya menyebut berkas, baris, dan
*bentuknya*, tidak pernah nilainya, karena pemindai yang mencetak apa yang ia temukan adalah cara
sebuah kunci masuk ke log build publik (**D34**).

## Konsekuensi Anda, sebagai data: `sanction_ladder:`

Paket ini menyatakan, dalam empat anak tangga, apa yang dilakukan komunitasnya ketika seseorang
melanggar aturan — `nudge → private-word → public-correction → removal` — dan setiap anak tangga
menyebut **siapa yang bertindak** (`by: organiser`, seat dari `human_seats` di
`orgs/kinshipai.yaml`) dan **apa yang diberi tahu kepada anggota**. Anak tangga terakhir menyebut jalan
kembali (`appeal:`). Semantiknya: spec **§2.12**; kebutuhannya: PRD **FR-5.11**; keputusannya:
`DECISIONS.md` **D37**.

Ini adalah *deskripsi*, bukan kemampuan. Tidak ada kelas aksi `moderation.sanction`, tidak ada tool
ban/mute/remove di daftar `tools:` mana pun, dan tidak ada apa pun di `runtime/` yang bisa memanjai
seorang anak tangga — ia hanya membaca tangga itu untuk memeriksa janjinya masih berlaku.
`PKG-62` menolak tangga yang merusak bentuknya sendiri (seorang anak tangga diserahkan ke agent
bukan ke seat, anak tangga tanpa `member_told`, anak tangga terakhir tanpa banding, tangga yang
hanya satu anak, blok `sanction_ladder:` kedua di berkas yang sama). `PKG-63` menolak anak tangga
yang `via:`-nya cocok dengan tool yang benar-benar dideklarasikan agent di sini — ini gerbang
*jangkauan*, bukan larangan kosakata: `via: discord | ban` lolos untuk fork yang organisernya
memakai kontrol Discord sendiri, karena melarang *kata*-nya hanya akan mencegah sebuah komunitas
untuk mendeskripsikan apa yang dilakukan manusia-manusia mereka.

**Menghapus seluruh kunci itu sah** (D37): komunitas yang tidak melakukan moderasi tidak punya anak
tangga untuk disebut, dan runtime tidak akan menyediakan tangga default yang tidak pernah ia tulis.
Yang bukan milikmu untuk diubah adalah batas tempat kunci itu duduk — fleet menandai, manusia
menghukum (invariant #1). Jangan buka PR yang menambahkan tool sanksi.

## Apa yang *tidak* dibuktikan paket ini

- **Paket ini tidak mengirim apa pun.** Tidak ada transport yang rilis di fase 1; setiap commit
  yang menghadap anggota menolak `no_transport` dan meninggalkan otorisasi kirim-satu-nya utuh
  untuk serah-terima manual oleh organiser (**D21**).
- **Paket ini tidak membuktikan bahwa organiser mendapat kelonggaran.** Klaim bahwa ini mengurangi
  beban masih menunggu pengukuran shadow mode, dan shadow mode baru mulai ketika pemilik menulis acara
  bertanggal sebagai **D9**. Baris itu masih kosong.
- **Paket ini tidak divalidasi oleh anggota mana pun.** Skill yang menghadap anggota
  (`member-rights`, `flag-notice`, `publishable-sourcing`) mengodekan apa yang kata *lens anggota
  yang disimulasikan* (**community/MEMBER-LENS-2026-10-17.md**). Lens yang disimulasikan adalah
  batasan yang bisa dipenuhi atau dilanggar oleh build; itu bukan bukti permintaan, dan tidak
  boleh dikutip sebagai bukti.
- **Paket ini memodelkan alur kerja satu organiser** — yang menulisnya. Tidak ada riset primer
  yang menopang satu pun lane.

## Di mana aturan yang bertahan tinggal

| Berkas | Baca sebelum kamu |
|---|---|
| `rules/pack-format.mdc` | menyentuh direktori ini atau `scripts/` |
| `rules/governance-invariants.mdc` | mengubah nilai `autonomy_by_class` mana pun |
| `spec/GOVERNANCE-SPEC-OUTLINE.md` | mengimplementasikan semantik (Bagian 6 memetakan tiap aturan ke berkas runtime + tesnya) |
| `DECISIONS.md` | berdebat dengan sebuah batas — hanya baris bertanggal, append-only |
| `AGENTS.md` | apa pun saja; itu versi pendek dari tabel ini |
