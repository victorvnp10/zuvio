import { NavLink } from "react-router-dom";
import { Compass, PlusCircle, MessageCircle, User } from "lucide-react";

const ITEMS = [
  { to: "/", icon: Compass, label: "Descobrir", end: true },
  { to: "/meus-eventos", icon: MessageCircle, label: "Meus Eventos" },
  { to: "/criar", icon: PlusCircle, label: "Criar" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

export function BottomNav() {
  return (
    <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 h-16 bg-ink-900/90 backdrop-blur-md border-t border-ink-800 z-20">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                isActive ? "text-coral-500" : "text-ink-400 hover:text-ink-200"
              }`
            }
          >
            <Icon size={22} strokeWidth={2.2} />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
