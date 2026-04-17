import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { PickSlugPage } from './pages/PickSlugPage';
import { ShopPage } from './pages/shop/ShopPage';
import { ShopCancelPage, ShopSuccessPage } from './pages/shop/ShopMessagePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminDays } from './pages/admin/AdminDays';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminProduction } from './pages/admin/AdminProduction';
import { SuperLoginPage } from './pages/super/SuperLoginPage';
import { SuperLayout } from './pages/super/SuperLayout';
import { SuperDashboard } from './pages/super/SuperDashboard';
import { SuperBakeries } from './pages/super/SuperBakeries';
import { SuperUsers } from './pages/super/SuperUsers';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/loja" element={<PickSlugPage mode="loja" />} />
          <Route path="/loja/:slug" element={<ShopPage />} />
          <Route path="/loja/:slug/sucesso" element={<ShopSuccessPage />} />
          <Route path="/loja/:slug/cancelar" element={<ShopCancelPage />} />
          <Route path="/admin" element={<PickSlugPage mode="admin" />} />
          <Route path="/admin/:slug/entrar" element={<AdminLoginPage />} />
          <Route path="/admin/:slug" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="produtos" element={<AdminProducts />} />
            <Route path="dias" element={<AdminDays />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="producao" element={<AdminProduction />} />
          </Route>
          <Route path="/super/entrar" element={<SuperLoginPage />} />
          <Route path="/super" element={<SuperLayout />}>
            <Route index element={<SuperDashboard />} />
            <Route path="padarias" element={<SuperBakeries />} />
            <Route path="utilizadores" element={<SuperUsers />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
