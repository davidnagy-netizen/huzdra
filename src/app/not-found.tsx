import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-display text-7xl font-black text-gradient-gold">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold">Ez a nóta nincs a repertoárban.</h1>
      <p className="mt-2 text-muted">Lehet, hogy elírtad a címet, vagy a link már lejárt.</p>
      <Link href="/" className="btn-primary mt-6">Vissza a főoldalra</Link>
    </div>
  );
}
