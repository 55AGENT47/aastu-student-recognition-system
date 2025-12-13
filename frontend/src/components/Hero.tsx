import React from 'react';
import { Shield, ArrowRight } from 'lucide-react';

const handleLearnMore = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  const element = document.querySelector('#about');
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const Hero = () => {
  return (
    <section id="home" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold">Secure & Reliable</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Student Facial Recognition System
            </h1>
            
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Advanced biometric authentication system for Addis Ababa Science and Technology University. 
              Secure, fast, and reliable student identification powered by cutting-edge AI technology.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href="/login?type=student" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors">
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#about" onClick={handleLearnMore} className="border border-white/50 hover:border-white text-white px-8 py-4 rounded-lg font-semibold transition-colors text-center">
                Learn More
              </a>
            </div>
            
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">99.9%</div>
                <div className="text-sm text-white/80">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">&lt;2s</div>
                <div className="text-sm text-white/80">Recognition Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">24/7</div>
                <div className="text-sm text-white/80">Availability</div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
              <img
                src="/src/assets/images/graduated_3135755.png"
                alt="Student using facial recognition system"
                className="w-full h-64 object-contain rounded-xl mb-6"
                loading="lazy"
              />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">AASTU STUDENT</h3>
                  <p className="text-gray-500 dark:text-gray-400">Student ID: AASTU2024001</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500 rounded-full opacity-20"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-400 rounded-full opacity-30"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;