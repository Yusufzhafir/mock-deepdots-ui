import { Suspense } from 'react';
import DashboardApp from '../../components/DashboardApp';

export default function Page() {
  return <Suspense fallback={<div className="route-loading">Loading dashboard…</div>}><DashboardApp section="journey"/></Suspense>;
}
