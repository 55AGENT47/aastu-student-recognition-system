import { Shield, Zap, Users, Clock, Database, Lock } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Shield,
      title: 'Advanced Security',
      description: 'Military-grade encryption and biometric authentication ensure maximum security for student data and access control.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Recognition and authentication completed in under 2 seconds with 99.9% accuracy using Deepface Face Recognition algorithms.'
    },
    {
      icon: Users,
      title: 'Multi-User Support',
      description: 'Seamlessly handle thousands of students simultaneously with our scalable cloud infrastructure.'
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Round-the-clock system availability with 99.9% uptime guarantee and real-time monitoring.'
    },
    {
      icon: Database,
      title: 'Smart Analytics',
      description: 'Comprehensive  analytics with detailed reports and insights for administrators, Main Securities and Cafeteria Securities.'
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'GDPR compliant with advanced privacy controls and encrypted biometric data storage.'
    }
  ];

  return (
    <section id="features" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Our facial recognition system combines cutting-edge technology with user-friendly design 
            to deliver the most advanced student identification solution.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl p-8 hover:shadow-lg transition-shadow border border-white/50">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;