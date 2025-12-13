import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import About from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D4AF37] via-[#1E3A8A] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 animate-gradient">
      <Header />
      <Hero />
      <Features />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}