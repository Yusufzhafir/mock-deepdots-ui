import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import DashboardApp from '../components/DashboardApp';
import { messages } from '../lib/data';
import { getMessageById } from '../lib/metrics';

function MessageDetailRoute() {
  const { id } = useParams();

  if (!id || !getMessageById(messages, id)) {
    return <Navigate to="/messages" replace />;
  }

  return <DashboardApp section="message-detail" messageId={id} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardApp section="overview" />} />
      <Route path="/messages" element={<DashboardApp section="messages" />} />
      <Route path="/messages/:id" element={<MessageDetailRoute />} />
      <Route path="/behaviour" element={<DashboardApp section="behaviour" />} />
      <Route path="/journey" element={<DashboardApp section="journey" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
