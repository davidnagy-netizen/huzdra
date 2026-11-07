import { SettingsForm } from "@/components/admin/SettingsForm";
import { Card, PageTitle, Tone, fmtDate } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";
import { isSupabase } from "@/lib/supabase";

export const metadata = { title: "Beállítások" };

export default async function SettingsPage() {
  const repo = getRepo();
  const [settings, emails] = await Promise.all([repo.getSettings(), repo.listEmails(15)]);
  const env = (k: string) => !!process.env[k];
  const svc: [string, boolean, string][] = [
    ["Supabase (adatbázis + tárhely)", isSupabase(), "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"],
    ["Claude AI (dalszöveg + szupport)", env("ANTHROPIC_API_KEY"), "ANTHROPIC_API_KEY"],
    ["Zene-API (tanítás + generálás)", env("MUSIC_API_URL"), "MUSIC_API_URL, MUSIC_API_KEY"],
    ["Bejövő szupport e-mail", env("SUPPORT_INBOUND_SECRET"), "SUPPORT_INBOUND_SECRET → /api/support/inbound"],
    ["Háttérfeldolgozó (cron)", env("CRON_SECRET"), "CRON_SECRET (Vercel Cron)"],
    ["Admin munkamenet-kulcs", env("ADMIN_SESSION_SECRET"), "ADMIN_SESSION_SECRET (min. 32 karakter)"],
  ];
  return (
    <>
      <PageTitle title="Beállítások" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SettingsForm initial={settings} /></div>
        <div className="space-y-4">
          <Card title="Szolgáltatások">
            <ul className="space-y-2 text-sm">{svc.map(([n, ok, how]) => <li key={n}><div className="flex justify-between gap-2"><span>{n}</span>{ok ? <Tone tone="good">bekötve</Tone> : <Tone tone="muted">nincs</Tone>}</div>{!ok && <p className="text-xs text-muted">{how}</p>}</li>)}</ul>
          </Card>
          <Card title="Kimenő e-mailek (napló)">
            <ul className="space-y-2 text-sm">{emails.map((m) => <li key={m.id} className="border-t border-line pt-2 first:border-0 first:pt-0"><p className="truncate font-semibold">{m.subject}</p><p className="text-xs text-muted">{m.to} · {fmtDate(m.createdAt)}</p></li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
