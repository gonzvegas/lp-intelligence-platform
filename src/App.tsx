import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import {
  ComplianceIndexRedirect,
  ComplianceLayout,
} from './components/ComplianceLayout'
import { Dashboard } from './pages/Dashboard'
import { DealList } from './pages/deals/DealList'
import { DealScreening } from './pages/deals/DealScreening'
import { LpDetail } from './pages/lps/LpDetail'
import { LpList } from './pages/lps/LpList'
import { CapacityOverview } from './pages/capacity/CapacityOverview'
import { LpCapacityDetail } from './pages/capacity/LpCapacityDetail'
import { AuditLog } from './pages/compliance/AuditLog'
import { Reports } from './pages/compliance/Reports'
import { SignOffs } from './pages/compliance/SignOffs'
import { Integrations } from './pages/settings/Integrations'
import { Roles } from './pages/settings/Roles'
import { Users } from './pages/settings/Users'
import { SideLetterDetail } from './pages/sideLetters/SideLetterDetail'
import { SideLetterList } from './pages/sideLetters/SideLetterList'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="lps" element={<LpList />} />
        <Route path="lps/:lpId" element={<LpDetail />} />
        <Route path="side-letters" element={<SideLetterList />} />
        <Route path="side-letters/:id" element={<SideLetterDetail />} />
        <Route path="deals" element={<DealList />} />
        <Route path="deals/:dealId/screening" element={<DealScreening />} />
        <Route path="capacity" element={<CapacityOverview />} />
        <Route path="capacity/lps/:lpId" element={<LpCapacityDetail />} />
        <Route path="compliance" element={<ComplianceLayout />}>
          <Route index element={<ComplianceIndexRedirect />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="sign-offs" element={<SignOffs />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="settings/integrations" element={<Integrations />} />
        <Route path="settings/users" element={<Users />} />
        <Route path="settings/roles" element={<Roles />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
