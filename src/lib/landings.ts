import type { OccasionId } from "./types";

export interface OccasionLanding {
  slug: string;
  occasionId: OccasionId;
  title: string;
  h1: string;
  sub: string;
  description: string;
}

/** Alkalmankénti SEO landing oldalak. Az előadói landingek (/<slug>-egyedi-dal) adatbázisból jönnek. */
export const OCCASION_LANDINGS: OccasionLanding[] = [
  {
    slug: "lakodalmas-dal",
    occasionId: "lakodalom",
    title: "Egyedi lakodalmas dal az ifjú párnak",
    h1: "Lakodalmas dal, ami csak rólatok szól",
    sub: "Az ifjú pár neve, a megismerkedés története, a násznép kedvenc poénjai – kedvenc előadód hangján, a nyitótánc után.",
    description: "Személyre szóló lakodalmas mulatós dal az ifjú párnak, Dögös Robi vagy a Bitto Duó hivatalos hangján. Akár pár órán belül, fizetés csak ha kész.",
  },
  {
    slug: "szulinapi-mulatos-dal",
    occasionId: "szuletesnap",
    title: "Szülinapi mulatós dal egyedi szöveggel",
    h1: "Szülinapi nóta, amire az ünnepelt is táncra perdül",
    sub: "Kerek évforduló vagy csak egy újabb szép év – a neve, a sztorijai és a kedvenc mondása egy igazi mulatós slágerben.",
    description: "Egyedi szülinapi mulatós dal ajándékba, az ismert előadók hivatalos hangján. Személyre szabott dalszöveg, gyors elkészítés.",
  },
  {
    slug: "keresztelo-dal",
    occasionId: "keresztelo",
    title: "Keresztelői dal a legkisebb családtagnak",
    h1: "Dal a keresztelőre – a család legkisebb kincsének",
    sub: "Megható vagy vidám köszöntő a keresztszülőktől, nagyszülőktől, az egész családtól.",
    description: "Személyre szóló keresztelői dal, a család nevével és történetével, kedvenc mulatós előadód hivatalos hangján.",
  },
  {
    slug: "nevnapi-dal",
    occasionId: "nevnap",
    title: "Névnapi köszöntő dal egyedi szöveggel",
    h1: "Névnapi nóta, amit az egész utca hallani fog",
    sub: "Egy szál virág helyett egy egész dal – a nevével a refrénben.",
    description: "Egyedi névnapi köszöntő dal mulatós stílusban, az előadó hivatalos hangján. Gyors, személyes, emlékezetes.",
  },
  {
    slug: "evfordulos-dal",
    occasionId: "hazassagi-evfordulo",
    title: "Házassági évfordulós dal egyedi szöveggel",
    h1: "Évfordulós dal a nagy szerelemnek",
    sub: "Ezüst-, arany- vagy épp az első évforduló: a közös évek legszebb pillanatai egy dalban.",
    description: "Személyre szóló házassági évfordulós dal, megható roma balladától a pörgős csárdásig, hivatalos előadói hangon.",
  },
];

export const ARTIST_LANDING_SUFFIX = "-egyedi-dal";
