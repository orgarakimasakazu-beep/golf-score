import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import RoundForm from './pages/RoundForm'
import RoundDetail from './pages/RoundDetail'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Settings from './pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rounds/new" element={<RoundForm key={"new"} />} />
          <Route path="/rounds/:id" element={<RoundDetail />} />
          <Route path="/rounds/:id/edit" element={<RoundForm key={"edit"} />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end><span>🏠</span>ホーム</NavLink>
        <NavLink to="/rounds/new"><span>✏️</span>記録</NavLink>
        <NavLink to="/courses"><span>⛳</span>ゴルフ場</NavLink>
        <NavLink to="/settings"><span>⚙️</span>設定</NavLink>
      </nav>
    </HashRouter>
  )
}
