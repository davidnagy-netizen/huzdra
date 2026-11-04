// Jogi oldalak TERVEZETE. Élesítés előtt jogásszal véglegesítendő (cégadatok, tárhely, NAIH stb.)!

export interface LegalDoc {
  slug: string;
  title: string;
  sections: { h: string; p: string[] }[];
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "aszf",
    title: "Általános Szerződési Feltételek",
    sections: [
      { h: "1. A szolgáltatás", p: ["A Húzdrá! (huzdra.hu) személyre szóló dalokat készít a megrendelő által megadott történet alapján. A dalok mesterséges intelligencia segítségével készülnek, az adott előadó hivatalos, írásos licencszerződéssel engedélyezett hangmodelljével."] },
      { h: "2. Megrendelés és fizetés", p: ["A megrendeléskor a bankkártya rögzítésre / zárolásra kerül. A tényleges terhelés a dal elkészültekor és kézbesítésekor történik. Ha a dal bármely okból nem készíthető el, a zárolást feloldjuk."] },
      { h: "3. Határidők", p: ["A teljesítési határidő a választott csomagtól függ („Még ma”: 1–3 óra, „Holnapra”: 24 óra, „Ráérős”: 5–7 nap). Az előadói jóváhagyás vagy tartalmi felülvizsgálat a határidőt indokolt esetben meghosszabbíthatja, erről értesítést küldünk."] },
      { h: "4. Javítás és garancia", p: ["Minden dalhoz 2 ingyenes javítási kör jár. Ha a megrendelő a javítások után sem elégedett, az elégedettségi garancia keretében a vételárat visszatérítjük."] },
      { h: "5. Felhasználási jog", p: ["A kész dal kizárólag személyes, nem kereskedelmi célra használható fel (pl. családi rendezvényen, magáncélú megosztásban). Tilos a dal értékesítése, reklámban, politikai kampányban vagy streaming-szolgáltatón való közzététele, illetve a hangfelvétel felhasználása más hangmodellek tanítására."] },
      { h: "6. Tiltott tartalom", p: ["Nem készítünk gyűlöletkeltő, rasszista, lejárató, szexuálisan explicit, valós harmadik személyeket kigúnyoló, politikai vagy reklám célú dalt. Az ilyen kéréseket elutasíthatjuk; ilyenkor a zárolást feloldjuk."] },
      { h: "7. Elállás", p: ["A személyre szabott, a megrendelő utasításai alapján előállított termékre vonatkozóan az elállási jog a 45/2014. (II. 26.) Korm. rendelet szerint korlátozott – részletek az Elállási tájékoztatóban."] },
    ],
  },
  {
    slug: "adatvedelem",
    title: "Adatkezelési tájékoztató",
    sections: [
      { h: "Kezelt adatok", p: ["Kapcsolattartási és számlázási adatok, a megadott történet, nevek, emlékek, valamint a kész dal."] },
      { h: "Az adatkezelés célja és jogalapja", p: ["A dal elkészítése és kézbesítése (szerződés teljesítése), számlázás (jogi kötelezettség), a történet feldolgozása (hozzájárulás)."] },
      { h: "Megőrzés", p: ["A személyes történetet és a dalszöveg-előzményeket a megrendeléstől számított 90 nap után töröljük vagy anonimizáljuk. A számlázási adatokat a számviteli törvény szerinti ideig őrizzük."] },
      { h: "Adatfeldolgozók", p: ["Tárhely és adatbázis (Supabase), fizetési szolgáltató (Stripe vagy Barion), e-mail-küldés (Resend), valamint a dalszöveg-, zene- és hanggeneráló szolgáltatók – mindegyikükkel adatfeldolgozói szerződés alapján."] },
      { h: "Jogaid", p: ["Hozzáférés, helyesbítés, törlés, korlátozás, adathordozhatóság, tiltakozás, a hozzájárulás visszavonása. Panaszt a NAIH-nál tehetsz."] },
    ],
  },
  {
    slug: "cookie",
    title: "Cookie-tájékoztató",
    sections: [
      { h: "Szükséges sütik", p: ["A rendelési piszkozat mentése, a téma (világos/sötét) és a cookie-hozzájárulás tárolása. Ezek nélkül az oldal nem működik megfelelően."] },
      { h: "Analitikai sütik", p: ["Google Analytics 4 – csak hozzájárulás esetén, IP-anonimizálással."] },
      { h: "Marketing sütik", p: ["Meta Pixel – csak hozzájárulás esetén."] },
      { h: "Beállítások módosítása", p: ["A hozzájárulásodat bármikor módosíthatod a lábléc „Cookie-beállítások” linkjén."] },
    ],
  },
  {
    slug: "elallas",
    title: "Elállási tájékoztató",
    sections: [
      { h: "Személyre szabott termék", p: ["A dal a megrendelő egyedi utasításai alapján készül, ezért a jogszabály szerint a teljesítés megkezdése után az elállási jog nem gyakorolható. A teljesítés megkezdése előtt a rendelést díjmentesen lemondhatod."] },
      { h: "Elégedettségi garancia", p: ["Ettől függetlenül, ha a 2 ingyenes javítás után sem vagy elégedett, visszatérítjük a vételárat."] },
    ],
  },
  {
    slug: "impresszum",
    title: "Impresszum",
    sections: [
      { h: "Üzemeltető", p: ["[Cégnév] · [Székhely] · Cégjegyzékszám: [ ] · Adószám: [ ] · E-mail: hello@huzdra.hu"] },
      { h: "Tárhelyszolgáltató", p: ["[Tárhelyszolgáltató neve, címe, elérhetősége]"] },
    ],
  },
  {
    slug: "eloadoi-licenc",
    title: "Előadói licenc-tájékoztató",
    sections: [
      { h: "Csak engedéllyel", p: ["A Húzdrá! kizárólag olyan előadók hangját használja, akikkel írásos licencszerződést kötött. Licencszerződés nélkül előadó nem jelenhet meg és hangmodell nem futtatható."] },
      { h: "Zárt rendszer", p: ["A hangmodellek kizárólag a Húzdrá! rendszerén belül futnak, külső fél számára nem hozzáférhetők, és nem használhatók más célra."] },
      { h: "Vízjel és átláthatóság", p: ["Minden elkészült dal hallhatatlan audio vízjelet és azonosító metaadatot kap, így bármikor visszakövethető. A dal-oldalon és a GYIK-ban egyértelműen jelezzük, hogy a dal mesterséges intelligenciával készült."] },
      { h: "Az előadó kontrollja", p: ["Az előadó vagy menedzsmentje előzetesen jóváhagyhatja vagy elutasíthatja a dalszövegeket, ha azok sértenék az imázsát. Az előadók minden dal után jogdíjat kapnak."] },
    ],
  },
];
