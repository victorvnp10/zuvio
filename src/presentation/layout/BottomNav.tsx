import { NavLink } from "react-router-dom";
import { Home, Users, Plus, Ticket } from "lucide-react";
import { useAuth } from "../../application/context/AuthContext";
import { Avatar } from "../components/Avatar";

/**
 * Padrão visual do Instagram: 5 posições fixas, sem rótulo de texto
 * embaixo (só os ícones falam por si, é o padrão que o público já
 * conhece de cor) — "+" central numa caixa com contorno, e o último
 * ícone é a própria foto de perfil da pessoa, não um ícone genérico.
 */
export function BottomNav() {
  const { profile } = useAuth();

  return (
    <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 h-14 bg-ink-900/95 backdrop-blur-md border-t border-ink-800 z-20">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto px-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center justify-center w-full h-full transition-colors ${
              isActive ? "text-ink-100" : "text-ink-500 hover:text-ink-200"
            }`
          }
        >
          {({ isActive }) => <Home size={26} strokeWidth={isActive ? 2.4 : 1.8} />}
        </NavLink>

        <NavLink
          to="/amigos"
          className={({ isActive }) =>
            `flex items-center justify-center w-full h-full transition-colors ${
              isActive ? "text-ink-100" : "text-ink-500 hover:text-ink-200"
            }`
          }
        >
          {({ isActive }) => <Users size={24} strokeWidth={isActive ? 2.4 : 1.8} />}
        </NavLink>

        <NavLink
          to="/criar"
          className="flex items-center justify-center w-full h-full text-ink-100"
        >
          <span className="border-2 border-ink-200 rounded-lg p-1">
            <Plus size={20} strokeWidth={2.4} />
          </span>
        </NavLink>

        <NavLink
          to="/meus-eventos"
          className={({ isActive }) =>
            `flex items-center justify-center w-full h-full transition-colors ${
              isActive ? "text-ink-100" : "text-ink-500 hover:text-ink-200"
            }`
          }
        >
          {({ isActive }) => <Ticket size={24} strokeWidth={isActive ? 2.4 : 1.8} />}
        </NavLink>

        <NavLink
          to="/perfil"
          className="flex items-center justify-center w-full h-full"
        >
          {({ isActive }) => (
            <Avatar
              fotoUrl={profile?.fotoUrl}
              nome={profile?.nome}
              size={26}
              ring={isActive}
            />
          )}
        </NavLink>
      </div>
    </nav>
  );
}
