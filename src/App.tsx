import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./application/context/AuthContext";
import { AuthScreen } from "./presentation/screens/AuthScreen";
import { DiscoveryFeedScreen } from "./presentation/screens/DiscoveryFeedScreen";
import { EventDetailScreen } from "./presentation/screens/EventDetailScreen";
import { EditEventScreen } from "./presentation/screens/EditEventScreen";
import { CreateEventScreen } from "./presentation/screens/CreateEventScreen";
import { ProfileScreen } from "./presentation/screens/ProfileScreen";
import { MyEventsScreen } from "./presentation/screens/MyEventsScreen";
import { FriendsScreen } from "./presentation/screens/FriendsScreen";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center text-ink-400">
        Carregando...
      </div>
    );
  }

  if (!user) return <Navigate to="/entrar" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<AuthScreen />} />
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
