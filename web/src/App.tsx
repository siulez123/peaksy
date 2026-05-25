import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useHostTenantSlug } from './lib/tenantHost';
import { ApexHomePage } from './pages/ApexHomePage';
import { ShopPage } from './pages/shop/ShopPage';
import { ShopCancelPage, ShopSuccessRedirect } from './pages/shop/ShopMessagePage';
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
import { SuperLojas } from './pages/super/SuperLojas';
import { SuperUsers } from './pages/super/SuperUsers';
import { NotFoundPage } from './pages/NotFoundPage';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { AdminIntegracao } from './pages/admin/AdminIntegracao';
import { AdminPayment } from './pages/admin/AdminPayment';

/** Raiz: loja no subdomínio ou página do domínio principal (sem loja no host). */
function TenantOrApexHome() {
  const host = useHostTenantSlug();
  if (host) return <ShopPage />;
  return <ApexHomePage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <Routes>
          <Route path="/super/entrar" element={<SuperLoginPage />} />
          <Route path="/super" element={<SuperLayout />}>
            <Route index element={<SuperDashboard />} />
            <Route path="lojas" element={<SuperLojas />} />
            <Route path="padarias" element={<Navigate to="/super/lojas" replace />} />
            <Route path="utilizadores" element={<SuperUsers />} />
          </Route>

          <Route path="/loja/:slug/sucesso" element={<ShopSuccessRedirect />} />
          <Route path="/loja/:slug/cancelar" element={<ShopCancelPage />} />
          <Route path="/loja/:slug" element={<ShopPage />} />
          <Route path="/loja" element={<Navigate to="/" replace />} />

          <Route path="/sucesso" element={<ShopSuccessRedirect />} />
          <Route path="/cancelar" element={<ShopCancelPage />} />

          <Route path="/admin/entrar" element={<AdminLoginPage />} />
          <Route path="/admin/:slug/entrar" element={<AdminLoginPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="produtos" element={<AdminProducts />} />
            <Route path="dias" element={<AdminDays />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="producao" element={<AdminProduction />} />
            <Route path="integracao" element={<AdminIntegracao />} />
            <Route path="pagamento" element={<AdminPayment />} />
          </Route>
          <Route path="/admin/:slug" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="produtos" element={<AdminProducts />} />
            <Route path="dias" element={<AdminDays />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="producao" element={<AdminProduction />} />
            <Route path="integracao" element={<AdminIntegracao />} />
            <Route path="pagamento" element={<AdminPayment />} />
          </Route>

          <Route path="/" element={<TenantOrApexHome />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
