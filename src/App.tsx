import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./application/context/AuthContext";
import { AuthScreen } from "./presentation/screens/AuthScreen";
import { CompleteProfileScreen } from "./presentation/screens/CompleteProfileScreen";
import { DiscoveryFeedScreen } from "./presentation/screens/DiscoveryFeedScreen";
import { EventDetailScreen } from "./presentation/screens/EventDetailScreen";
import { EditEventScreen } from "./presentation/screens/EditEventScreen";
import { CreateEventScreen } from "./presentation/screens/CreateEventScreen";
import { ProfileScreen } from "./presentation/screens/ProfileScreen";
import { MyEventsScreen } from "./presentation/screens/MyEventsScreen";
import { FriendsScreen } from "./presentation/screens/FriendsScreen";
import { isProfileComplete } from "./domain/valueObjects/Eligibility";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/entrar" replace />;

  // Login com Google não fornece data de nascimento/localização — sem
  // isso, a pessoa é levada a completar o perfil antes de ver o resto
  // do app (a verificação de idade mínima continua obrigatória).
  if (
    profile &&
    !isProfileComplete(profile) &&
    location.pathname !== "/completar-perfil"
  ) {
    return <Navigate to="/completar-perfil" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<AuthScreen />} />
        <Route
          path="/completar-perfil"
          element={
            <RequireAuth>
              <CompleteProfileScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <DiscoveryFeedScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/eventos/:eventId"
          element={
            <RequireAuth>
              <EventDetailScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/eventos/:eventId/editar"
          element={
            <RequireAuth>
              <EditEventScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/criar"
          element={
            <RequireAuth>
              <CreateEventScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/meus-eventos"
          element={
            <RequireAuth>
              <MyEventsScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/amigos"
          element={
            <RequireAuth>
              <FriendsScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/perfil"
          element={
            <RequireAuth>
              <ProfileScreen />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
