import { useEffect, useState } from "react";
import { Mail, X, FlaskConical } from "lucide-react";
import { devOutbox } from "../server/api";

/**
 * Boîte de réception SIMULÉE (sandbox uniquement).
 * Représente le fournisseur d'e-mails transactionnels : elle ne fait pas
 * partie de l'interface ALWENAS et n'existe pas en production.
 */
export function DevMailbox({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const [mails, setMails] = useState(() => devOutbox(email));
  const [seen, setSeen] = useState(0);
  useEffect(() => { const i = setInterval(() => setMails(devOutbox(email)), 1000); return () => clearInterval(i); }, [email]);
  const fresh = mails.length && mails[0].id !== seen;
  return (
    <>
      <button onClick={() => { setOpen(true); setSeen(mails[0]?.id ?? 0); }} className="fixed bottom-5 left-5 z-[80] flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl ring-1 ring-white/10 transition hover:scale-105" aria-label="Ouvrir la boîte mail de démonstration">
        <Mail className="h-4 w-4" /> Boîte mail (démo)
        {fresh ? <span className="h-2.5 w-2.5 animate-pulse-ring rounded-full bg-emerald-400" /> : null}
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)} role="dialog" aria-label="Boîte mail de démonstration">
          <div className="page-in max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <p className="flex items-center gap-2 font-display font-bold"><FlaskConical className="h-4 w-4 text-amber-500" />Boîte mail simulée</p>
                <p className="text-xs text-slate-500">Sandbox — remplace le service d'e-mail transactionnel</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="divide-y">
              {mails.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Aucun e-mail pour le moment.</p>}
              {mails.map((m) => (
                <article key={m.id} className="p-5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400"><span>À : {m.to}</span><time>{new Date(m.at).toLocaleTimeString("fr-FR")}</time></div>
                  <p className="mt-1 text-sm font-bold">{m.subject}</p>
                  <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 font-display text-xs font-extrabold tracking-wide text-emerald-700">ALWENAS SHOP</p>
                    <p className="whitespace-pre-line text-sm text-slate-700">{m.body.split(/(\b\d{6}\b)/).map((part, i) => /^\d{6}$/.test(part) ? <strong key={i} className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-base tracking-[0.25em] text-emerald-800">{part}</strong> : part)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
