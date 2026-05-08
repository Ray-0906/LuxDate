import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import GirlsPage from './pages/GirlsPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import GiftsPage from './pages/GiftsPage.jsx';
import VipPage from './pages/VipPage.jsx';
import CallsPage from './pages/CallsPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A24',
            color: '#F1F1F4',
            border: '1px solid #2D2D3A',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="girls" element={<GirlsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="gifts" element={<GiftsPage />} />
          <Route path="vip" element={<VipPage />} />
          <Route path="calls" element={<CallsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
