import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserIdentityProvider } from './providers/UserIdentityProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import UserApp from './pages/UserApp';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import StatsPage from './pages/StatsPage';
import SimulatorPage from './pages/SimulatorPage';

export default function App() {
  return (
    <BrowserRouter>
      <UserIdentityProvider>
        <WebSocketProvider>
          <Routes>
            <Route path="/"         element={<UserApp />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/admin/*"  element={<AdminDashboard />} />
            <Route path="/profile"  element={<ProfilePage />} />
            <Route path="/stats"     element={<StatsPage />} />
            <Route path="/simulate" element={<SimulatorPage />} />
          </Routes>
        </WebSocketProvider>
      </UserIdentityProvider>
    </BrowserRouter>
  );
}
