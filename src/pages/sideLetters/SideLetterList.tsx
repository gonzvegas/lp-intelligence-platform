import { Navigate } from 'react-router-dom'

/** Legacy route — catalog now includes LPA, ERISA, MFN, IMA, co-invest. */
export function SideLetterList() {
  return <Navigate to="/instruments" replace />
}
