import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
