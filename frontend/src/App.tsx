import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ConfigurePage } from './pages/ConfigurePage'
import { ProcessingPage } from './pages/ProcessingPage'
import { BrowsePage } from './pages/BrowsePage'
import { InsightsPage } from './pages/InsightsPage'
import { JobsPage } from './pages/JobsPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ConfigurePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/processing/:jobId" element={<ProcessingPage />} />
        <Route path="/browse/:jobId" element={<BrowsePage />} />
        <Route path="/insights/:jobId" element={<InsightsPage />} />
      </Routes>
    </Layout>
  )
}

export default App

