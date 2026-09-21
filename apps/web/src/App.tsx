import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Markets from './pages/Markets'
import MarketDetail from './pages/MarketDetail'
import Portfolio from './pages/Portfolio'
import Advisor from './pages/Advisor'
import Activity from './pages/Activity'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="markets" element={<Markets />} />
        <Route path="markets/:symbol" element={<MarketDetail />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="advisor" element={<Advisor />} />
        <Route path="activity" element={<Activity />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
