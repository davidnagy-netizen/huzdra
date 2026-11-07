// Kezdeti (seed) adatok a mock adatbázishoz. Élesben ezek a Supabase táblákban élnek,
// és az admin felületről szerkeszthetők. A vélemények és a statisztika DEMÓ adatok:
// élesítés előtt valódi, ellenőrzött vásárlói véleményekre kell cserélni!

import type {
  Artist,
  Coupon,
  Extra,
  Faq,
  Occasion,
  Package,
  Review,
  SampleSong,
  Style,
} from "../types";

export const occasions: Occasion[] = [
  { id: "lakodalom", label: "Lakodalom", emoji: "💍", sortOrder: 1 },
  { id: "eljegyzes", label: "Eljegyzés", emoji: "💐", sortOrder: 2 },
  { id: "keresztelo", label: "Keresztelő", emoji: "👶", sortOrder: 3 },
  { id: "szuletesnap", label: "Születésnap", emoji: "🎂", sortOrder: 4 },
  { id: "nevnap", label: "Névnap", emoji: "🌹", sortOrder: 5 },
  { id: "ballagas", label: "Ballagás", emoji: "🎓", sortOrder: 6 },
  { id: "evfordulo", label: "Évforduló", emoji: "🥂", sortOrder: 7 },
  { id: "hazassagi-evfordulo", label: "Házassági évforduló", emoji: "💞", sortOrder: 8 },
  { id: "anyak-napja", label: "Anyák napja", emoji: "🌷", sortOrder: 9 },
  { id: "hazateres", label: "Hazatérés külföldről", emoji: "✈️", sortOrder: 10 },
  { id: "karacsony", label: "Karácsony", emoji: "🎄", sortOrder: 11 },
  { id: "szilveszter", label: "Szilveszter", emoji: "🎆", sortOrder: 12 },
  { id: "haveroknak", label: "Csak úgy, a haveroknak", emoji: "🍻", sortOrder: 13 },
];

export const styles: Style[] = [
  { id: "lakodalmas-mulatos", label: "Lakodalmas mulatós", description: "Klasszikus lagzis lendület, amire az egész násznép táncol.", sortOrder: 1 },
  { id: "porgos-csardas", label: "Pörgős csárdás", description: "Gyorsuló tempó, hegedűvel – a végén már mindenki kiabál.", sortOrder: 2 },
  { id: "roma-ballada", label: "Roma ballada", description: "Lassú, érzelmes, könnyet csaló dallam a szív legmélyéről.", sortOrder: 3 },
  { id: "discos-mulatos", label: "Discós mulatós", description: "Szintis alap, négynegyedes dob, csillogó gömb a plafonon.", sortOrder: 4 },
  { id: "duett", label: "Duett", description: "Két hang, egy történet – felelgetős, közös refrénnel.", sortOrder: 5 },
  { id: "nota-mix", label: "Nóta-mix", description: "Több tempó egy dalban: lassan indul, a végén elszabadul.", sortOrder: 6 },
];

// Előadók. A "house" hangok a Húzdrá! saját hangjai (eredeti színpadi nevek, saját stílussal);
// a "celebrity" előadók licencszerződés aláírásáig "coming_soon" állapotban vannak – nem rendelhetők.
// Az előadói felár (surchargeHuf) előadónként állítható; élesben az admin felületről.
export const artists: Artist[] = [
  {
    id: "art_barsony_dani",
    kind: "house",
    availability: "available",
    slug: "barsony-dani",
    name: "Bársony Dani",
    tagline: "Lakodalmas lendület, amire a vőfély is beáll a sorba.",
    bio:
      "Bársony Dani hangja a hajnalig tartó lagzik hangja: vidám, pörgős, táncolós " +
      "mulatós, amit a nagymama és az unokák egyszerre ropnak. Ha az a cél, hogy " +
      "mindenki a parketten legyen, Dani a jó választás.",
    photos: [],
    styles: ["lakodalmas-mulatos", "porgos-csardas", "nota-mix"],
    voiceModelId: "voice_mock_barsony_dani_v1",
    surchargeHuf: 0,
    royaltyPercent: 0,
    requiresApproval: false,
    licenseSignedAt: "2026-11-01",
    accentHue: 18,
    active: true,
    sortOrder: 1,
  },
  {
    id: "art_rubin_szilvi",
    kind: "house",
    availability: "available",
    slug: "rubin-szilvi",
    name: "Rubin Szilvi",
    tagline: "Lassú, érzelmes balladák – a szív legmélyéről.",
    bio:
      "Rubin Szilvi meleg, mély hangja a megható pillanatoké: anyák napja, " +
      "évforduló, keresztelő. Roma balladák hegedűvel, amelyeknél garantáltan " +
      "előkerülnek a zsebkendők.",
    photos: [],
    styles: ["roma-ballada", "lakodalmas-mulatos"],
    voiceModelId: "voice_mock_rubin_szilvi_v1",
    surchargeHuf: 1000,
    royaltyPercent: 0,
    requiresApproval: false,
    licenseSignedAt: "2026-11-01",
    accentHue: 345,
    active: true,
    sortOrder: 2,
  },
  {
    id: "art_tuzrozsa_duo",
    kind: "house",
    availability: "available",
    slug: "tuzrozsa-duo",
    name: "Tűzrózsa Duó",
    tagline: "Két hang, egy szív – felelgetős duettek a nagy napra.",
    bio:
      "A Tűzrózsa Duó női és férfi hangja együtt meséli el a történetet: " +
      "felelgetős versszakok, közös refrén. Lánykérésre, lagzira, évfordulóra – " +
      "mindenhová, ahol két ember története a lényeg.",
    photos: [],
    styles: ["duett", "roma-ballada", "lakodalmas-mulatos"],
    voiceModelId: "voice_mock_tuzrozsa_duo_v1",
    surchargeHuf: 2000,
    royaltyPercent: 0,
    requiresApproval: false,
    licenseSignedAt: "2026-11-01",
    accentHue: 0,
    active: true,
    sortOrder: 3,
  },
  {
    id: "art_ezustvono",
    kind: "house",
    availability: "available",
    slug: "ezustvono-zenekar",
    name: "Ezüstvonó Zenekar",
    tagline: "Hegedű, cimbalom, gyorsuló csárdás – húzzák, ahogy kell.",
    bio:
      "Az Ezüstvonó Zenekar a hangszeres hagyományt hozza: szárnyaló hegedű, " +
      "pergő cimbalom és egyre gyorsuló csárdás, a végén vastaps. Ha a dalban " +
      "a zene a főszereplő, ők a te embereid.",
    photos: [],
    styles: ["porgos-csardas", "nota-mix", "roma-ballada"],
    voiceModelId: "voice_mock_ezustvono_v1",
    surchargeHuf: 1500,
    royaltyPercent: 0,
    requiresApproval: false,
    licenseSignedAt: "2026-11-01",
    accentHue: 210,
    active: true,
    sortOrder: 4,
  },
  {
    id: "art_neon_gabi",
    kind: "house",
    availability: "available",
    slug: "neon-gabi",
    name: "Neon Gabi",
    tagline: "Discós mulatós – szinti, gömb a plafonon, kezek a magasban.",
    bio:
      "Neon Gabi a modern mulatós hangja: lüktető szintetizátor, négynegyedes " +
      "dob és refrén, amit a második kör után már mindenki kiabál. Szülinapra, " +
      "szilveszterre, haveri bulira.",
    photos: [],
    styles: ["discos-mulatos", "lakodalmas-mulatos", "nota-mix"],
    voiceModelId: "voice_mock_neon_gabi_v1",
    surchargeHuf: 0,
    royaltyPercent: 0,
    requiresApproval: false,
    licenseSignedAt: "2026-11-01",
    accentHue: 285,
    active: true,
    sortOrder: 5,
  },
  // Ismert előadók: EGYEZTETÉS ALATT. A valódi nevük a szerződés aláírásáig nem kerülhet
  // sem az oldalra, sem a (nyilvános) kódba – aláírás után az admin felületen kell megadni.
  {
    id: "art_celeb_1",
    kind: "celebrity",
    availability: "coming_soon",
    slug: "hiresseg-1",
    name: "Ismert előadó",
    tagline: "Egyeztetés alatt",
    bio: "",
    photos: [],
    styles: ["lakodalmas-mulatos", "discos-mulatos"],
    voiceModelId: "",
    surchargeHuf: 3000,
    royaltyPercent: 20,
    requiresApproval: true,
    licenseSignedAt: null,
    accentHue: 12,
    active: true,
    sortOrder: 10,
  },
  {
    id: "art_celeb_2",
    kind: "celebrity",
    availability: "coming_soon",
    slug: "hiresseg-2",
    name: "Ismert előadó",
    tagline: "Egyeztetés alatt",
    bio: "",
    photos: [],
    styles: ["duett", "roma-ballada"],
    voiceModelId: "",
    surchargeHuf: 3000,
    royaltyPercent: 22,
    requiresApproval: true,
    licenseSignedAt: null,
    accentHue: 340,
    active: true,
    sortOrder: 11,
  },
];

// Mintadalok: a címek és leírások saját, kitalált tartalmak. A hang mock módban
// generált helykitöltő (/api/audio/sample/[id]), élesben a licencelt mintadal fájlja.
export const sampleSongs: SampleSong[] = [
  { id: "s1", artistId: "art_barsony_dani", title: "Zsuzsi és Bence, ma minden a tiétek", occasionId: "lakodalom", styleId: "lakodalmas-mulatos", tempo: "porgos", durationSec: 24, audioUrl: "/api/audio/sample/s1", blurb: "Nyitótánc után, amikor beindul a buli.", featured: true },
  { id: "s2", artistId: "art_rubin_szilvi", title: "Anyukám keze", occasionId: "anyak-napja", styleId: "roma-ballada", tempo: "lassu", durationSec: 24, audioUrl: "/api/audio/sample/s2", blurb: "Lassú ballada, garantált könnyekkel.", featured: true },
  { id: "s3", artistId: "art_neon_gabi", title: "Ötven éve fiatal a Laci", occasionId: "szuletesnap", styleId: "discos-mulatos", tempo: "porgos", durationSec: 24, audioUrl: "/api/audio/sample/s3", blurb: "Kerek szülinap, csillogó discós alap.", featured: true },
  { id: "s4", artistId: "art_tuzrozsa_duo", title: "Kicsi Lilla, Isten hozott", occasionId: "keresztelo", styleId: "duett", tempo: "kozepes", durationSec: 24, audioUrl: "/api/audio/sample/s4", blurb: "Felelgetős duett a legkisebb családtagnak.", featured: true },
  { id: "s5", artistId: "art_ezustvono", title: "Hazajött a Gergő Londonból", occasionId: "hazateres", styleId: "porgos-csardas", tempo: "porgos", durationSec: 24, audioUrl: "/api/audio/sample/s5", blurb: "Repülőtérről egyenesen a mulatságba.", featured: true },
  { id: "s6", artistId: "art_rubin_szilvi", title: "Huszonöt év, ugyanaz a tánc", occasionId: "hazassagi-evfordulo", styleId: "roma-ballada", tempo: "lassu", durationSec: 24, audioUrl: "/api/audio/sample/s6", blurb: "Ezüstlakodalomra, a szülők kedvenc dallamával.", featured: false },
  { id: "s7", artistId: "art_barsony_dani", title: "Komák, ma nincs hazamenés", occasionId: "haveroknak", styleId: "nota-mix", tempo: "kozepes", durationSec: 24, audioUrl: "/api/audio/sample/s7", blurb: "A baráti társaság himnusza – lassan indul, aztán elszabadul.", featured: false },
  { id: "s8", artistId: "art_ezustvono", title: "Évi napja, piros rózsa", occasionId: "nevnap", styleId: "porgos-csardas", tempo: "porgos", durationSec: 24, audioUrl: "/api/audio/sample/s8", blurb: "Névnapi köszöntő, amire az egész utca kijön.", featured: false },
  { id: "s9", artistId: "art_neon_gabi", title: "Éjfélkor koccintunk", occasionId: "szilveszter", styleId: "discos-mulatos", tempo: "porgos", durationSec: 24, audioUrl: "/api/audio/sample/s9", blurb: "Visszaszámlálás után ez szóljon.", featured: false },
  { id: "s10", artistId: "art_tuzrozsa_duo", title: "Igen, százszor is igen", occasionId: "eljegyzes", styleId: "duett", tempo: "kozepes", durationSec: 24, audioUrl: "/api/audio/sample/s10", blurb: "Lánykérésre – két hangon, egy szívvel.", featured: false },
  { id: "s11", artistId: "art_barsony_dani", title: "Kalap repül, vége a sulinak", occasionId: "ballagas", styleId: "lakodalmas-mulatos", tempo: "porgos", durationSec: 24, audioUrl: "/api/audio/sample/s11", blurb: "Ballagási buli a ballagó tiszteletére.", featured: false },
  { id: "s12", artistId: "art_rubin_szilvi", title: "Karácsonyi csillag a nagyiéknál", occasionId: "karacsony", styleId: "roma-ballada", tempo: "lassu", durationSec: 24, audioUrl: "/api/audio/sample/s12", blurb: "Szenteste, amikor összegyűlik a család.", featured: false },
];

export const reviews: Review[] = [
  { id: "r1", authorName: "Kitti", location: "Miskolc", occasionId: "lakodalom", artistId: "art_barsony_dani", rating: 5, text: "Az apósom sírva fakadt, amikor meghallotta a nevét a refrénben. Hajnalig háromszor kellett lejátszania a DJ-nek!", createdAt: "2026-10-12", verified: true, published: true },
  { id: "r2", authorName: "Sanyi", location: "Nyíregyháza", occasionId: "szuletesnap", artistId: "art_tuzrozsa_duo", rating: 5, text: "A feleségem 40. szülinapjára rendeltem. Benne volt a balatoni nyaralásunk és a kutyánk neve is. Ennél jobb ajándékot nem adhattam volna.", createdAt: "2026-10-03", verified: true, published: true },
  { id: "r3", authorName: "Erika", location: "Kecskemét", occasionId: "keresztelo", artistId: "art_rubin_szilvi", rating: 5, text: "A keresztlányomnak készült, a nagymama azóta is ezt hallgatja a konyhában. Gyorsan elkészült, és a kiejtés is tökéletes lett.", createdAt: "2026-09-21", verified: true, published: true },
  { id: "r4", authorName: "Tomi és a komák", location: "Debrecen", occasionId: "haveroknak", artistId: "art_neon_gabi", rating: 5, text: "A haverom legénybúcsújára leptük meg vele. Kétszer kértünk javítást egy poén miatt, mindkettő ingyen volt és pár óra alatt kész lett.", createdAt: "2026-09-14", verified: true, published: true },
  { id: "r5", authorName: "Marika", location: "Szeged", occasionId: "hazassagi-evfordulo", artistId: "art_rubin_szilvi", rating: 5, text: "Harminc év házasság után azt hittem, engem már semmi nem lep meg. Tévedtem.", createdAt: "2026-08-30", verified: true, published: true },
  { id: "r6", authorName: "Dávid", location: "Győr", occasionId: "hazateres", artistId: "art_ezustvono", rating: 4, text: "Az öcsém hazajött Németországból, a reptéren a kocsiban szólt a dala. Kicsit lassabb tempót kértem volna, de a javítás után pont jó lett.", createdAt: "2026-08-18", verified: true, published: true },
];

export const packages: Package[] = [
  { id: "raeros", name: "Ráérős", deliveryLabel: "5–7 nap", deliveryHours: 168, priceHuf: 12900, description: "Ha van még idő a nagy napig. Ugyanaz a minőség, kedvezőbb áron.", highlight: false, sortOrder: 1, active: true },
  { id: "holnapra", name: "Holnapra", deliveryLabel: "24 órán belül", deliveryHours: 24, priceHuf: 16900, description: "A legnépszerűbb: holnapra a postaládádban a saját nótád.", highlight: true, sortOrder: 2, active: true },
  { id: "meg-ma", name: "Még ma", deliveryLabel: "1–3 órán belül", deliveryHours: 3, priceHuf: 22900, description: "Ma este lagzi? Elsőbbséggel készítjük, akár pár órán belül.", highlight: false, sortOrder: 3, active: true },
];

export const extras: Extra[] = [
  { id: "videoklip", name: "Videoklip a fotóidból", description: "A feltöltött képekből zenés klip, dalszöveg-feliratozással – kivetítőre is.", priceHuf: 7900, kind: "addon", sortOrder: 1, active: true },
  { id: "pdf", name: "Dalszöveg díszkeretben (PDF)", description: "Nyomtatható, ünnepi kivitelű dalszöveg – bekeretezve örök emlék.", priceHuf: 2490, kind: "addon", sortOrder: 2, active: true },
  { id: "plusz-versszak", name: "Plusz versszak", description: "Még több történet, még több név, még hosszabb mulatás.", priceHuf: 3900, kind: "addon", sortOrder: 3, active: true },
  { id: "karaoke", name: "Instrumentális (karaoke) verzió", description: "Ének nélküli változat, hogy a násznép is elénekelhesse.", priceHuf: 2990, kind: "addon", sortOrder: 4, active: true },
  { id: "elo-eloadas", name: "Élő előadás a lagziban – érdeklődés", description: "Továbbítjuk az érdeklődésedet az előadó menedzsmentjének. Ingyenes, nem kötelez semmire.", priceHuf: 0, kind: "lead", sortOrder: 5, active: true },
];

export const coupons: Coupon[] = [
  { code: "LAGZI10", percentOff: 10, active: true },
  { code: "KOMA2000", amountOffHuf: 2000, active: true },
];

export const faqs: Faq[] = [
  { id: "f1", question: "Hogyan működik a „fizetés csak ha kész”?", answer: "Rendeléskor a bankkártyádat csak rögzítjük (zárolás / setup intent) – ekkor még nem vonunk le semmit. A terhelés akkor történik meg, amikor a dalod elkészült és elküldtük neked. Ha bármiért nem tudjuk elkészíteni, a zárolást feloldjuk.", sortOrder: 1 },
  { id: "f2", question: "Kik énekelnek a dalokban? Lesznek hírességek is?", answer: "A dalokat a Húzdrá! saját hangjai éneklik – mindegyik saját stílussal, a lakodalmas mulatóstól a roma balladáig. A dalok mesterséges intelligencia segítségével készülnek. Hamarosan ismert előadók hivatalos, licencelt hangja is választható lesz – iratkozz fel az előadó kártyáján, és szólunk, amint elérhető.", sortOrder: 2 },
  { id: "f3", question: "Mennyi idő alatt készül el a dal?", answer: "A választott csomagtól függ: „Még ma” – 1–3 órán belül, „Holnapra” – 24 órán belül, „Ráérős” – 5–7 napon belül. Ha egy dalt munkatársunknak át kell néznie, azt is ezen belül intézzük.", sortOrder: 3 },
  { id: "f4", question: "Hányszor kérhetek javítást?", answer: "Minden dalhoz 2 ingyenes javítási kör jár: a dal-oldalon egy gombbal kérheted, és leírhatod, mit szeretnél másképp (pl. egy név, egy poén, a tempó). Ha így sem vagy elégedett, az elégedettségi garancia keretében visszaadjuk az árát.", sortOrder: 4 },
  { id: "f5", question: "Lejátszható a lagziban, a DJ-nél vagy az autóban?", answer: "Persze! MP3-ban töltheted le, ami minden telefonon, laptopon, DJ-pulton és autórádión megy. A dal-oldal linkjét pedig egyszerűen elküldheted a DJ-nek vagy a családi csoportba.", sortOrder: 5 },
  { id: "f6", question: "Mi van, ha a név kiejtése nem jó?", answer: "A rendelésnél megadhatod, hogyan kell kimondani a nevet (pl. „Zsófi – ZSÓ-fi, hosszú ó”). Ha mégsem lenne tökéletes, ez az első, amit ingyen javítunk.", sortOrder: 6 },
  { id: "f7", question: "Megrendelhetem élőben is az előadót?", answer: "A rendelés utolsó lépésénél bejelölheted az „Élő előadás a lagziban” érdeklődést. Ezt közvetlenül továbbítjuk az előadó menedzsmentjének, akik felveszik veled a kapcsolatot. Ez ingyenes és nem kötelez semmire.", sortOrder: 7 },
  { id: "f8", question: "Mit nem tartalmazhat a dal?", answer: "Gyűlöletkeltő, rasszista vagy lejárató tartalmat, szexuálisan explicit szöveget, valós harmadik személyek kigúnyolását, politikai üzenetet vagy reklámot. A történeteket és a kész szövegeket szűrjük, és kétes esetben munkatársunk nézi át. A dal személyes, nem kereskedelmi felhasználásra készül.", sortOrder: 8 },
];

/** DEMÓ érték – élesben a kézbesített rendelések számából jön. */
export const demoHappyFamilies = 1240;

/** Alapértelmezett automatizálási beállítások (adminból módosíthatók). */
export const defaultSettings: import("../types").Settings = {
  autoQc: true,
  autoSupport: true,
  supportConfidence: 0.8,
  autoArtistApproval: true,
  freeNameFixes: true,
  previewEnabled: true,
  previewSeconds: 15,
  previewHourlyLimit: 5,
  happyFamiliesBaseline: demoHappyFamilies,
};
