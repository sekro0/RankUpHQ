import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-16 pb-14 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
