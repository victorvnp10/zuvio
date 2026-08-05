import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";

/**
 * Compartilhamento de um link de convite (evento ou grupo) por
 * WhatsApp, e-mail ou copiar — os 3 canais pedidos no briefing. O
 * ícone do WhatsApp é desenhado à mão (SVG inline) porque não faz
 * parte do lucide-react.
 */
export function ShareLinkSection({
  link,
  title,
  message,
}: {
  link: string;
  title: string;
  message: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${message}\n${link}`)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message}\n\n${link}`)}`;

  return (
    <div className="bg-ink-800/60 border border-ink-700 rounded-2xl p-5 space-y-3">
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="text-sm text-ink-400">{message}</p>

      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-xs text-ink-300 min-w-0"
        />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-ink-700 text-ink-100 px-3 rounded-lg shrink-0"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      <div className="flex gap-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-quorum-500 text-ink-950 py-2 rounded-lg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.2 1.8 2.8 4.4 3.8.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3z"/>
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/>
          </svg>
          WhatsApp
        </a>
        <a
          href={emailHref}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-ink-700 text-ink-100 py-2 rounded-lg"
        >
          <Mail size={14} />
          E-mail
        </a>
      </div>
    </div>
  );
}
