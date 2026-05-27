import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import {
  ComplianceIndexRedirect,
  ComplianceLayout,
} from './components/ComplianceLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RequireRole } from './components/RequireRole'
import { Landing } from './pages/Landing'
import { Login } from './pages/auth/Login'
import { Dashboard } from './pages/Dashboard'
import { DealList } from './pages/deals/DealList'
import { DealScreening } from './pages/deals/DealScreening'
import { FundList } from './pages/funds/FundList'
import { LpDetail } from './pages/lps/LpDetail'
import { LpList } from './pages/lps/LpList'
import { CapacityOverview } from './pages/capacity/CapacityOverview'
import { LpCapacityDetail } from './pages/capacity/LpCapacityDetail'
import { AuditLog } from './pages/compliance/AuditLog'
import { Reports } from './pages/compliance/Reports'
import { SignOffs } from './pages/compliance/SignOffs'
import { InstrumentPrecedence } from './pages/settings/InstrumentPrecedence'
import { Integrations } from './pages/settings/Integrations'
import { Roles } from './pages/settings/Roles'
import { Users } from './pages/settings/Users'
import { InstrumentDetail } from './pages/instruments/InstrumentDetail'
import { InstrumentList } from './pages/instruments/InstrumentList'
import { ObligationRegistry } from './pages/ObligationRegistry'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="funds" element={<FundList />} />
          <Route path="lps" element={<LpList />} />
          <Route path="lps/:lpId" element={<LpDetail />} />
          <Route path="instruments" element={<InstrumentList />} />
          <Route path="instruments/:id" element={<InstrumentDetail />} />
          <Route path="side-letters" element={<Navigate to="/instruments" replace />} />
          <Route path="side-letters/:id" element={<InstrumentDetail />} />
          <Route path="obligations" element={<ObligationRegistry />} />
          <Route
            path="deals"
            element={
              <RequireRole permission="nav:deals">
                <DealList />
              </RequireRole>
            }
          />
          <Route
            path="deals/:dealId/screening"
            element={
              <RequireRole permission="nav:deals">
                <DealScreening />
              </RequireRole>
            }
          />
          <Route path="capacity" element={<CapacityOverview />} />
          <Route path="capacity/lps/:lpId" element={<LpCapacityDetail />} />
          <Route path="compliance" element={<ComplianceLayout />}>
            <Route index element={<ComplianceIndexRedirect />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="sign-offs" element={<SignOffs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="obligations" element={<ObligationRegistry />} />
          </Route>
          <Route
            path="settings/instrument-precedence"
            element={
              <RequireRole permission="nav:instrument_precedence">
                <InstrumentPrecedence />
              </RequireRole>
            }
          />
          <Route
            path="settings/integrations"
            element={
              <RequireRole permission="nav:integrations">
                <Integrations />
              </RequireRole>
            }
          />
          <Route
            path="settings/users"
            element={
              <RequireRole permission="nav:admin">
                <Users />
              </RequireRole>
            }
          />
          <Route
            path="settings/roles"
            element={
              <RequireRole permission="nav:admin">
                <Roles />
              </RequireRole>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
