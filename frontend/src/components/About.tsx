import { Award, Target, Users } from 'lucide-react';

const About = () => {
  return (
    <section id="about" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <img
              src="https://www.aastu.edu.et/wp-content/uploads/2024/11/cropped-small.png"
              alt="AASTU Logo"
              className="h-20 mb-6"
            />
            <p className="text-lg text-white/90 mb-8 leading-relaxed">
              AASTU is a leading institution in Ethiopia, committed to excellence in science, technology, 
              and innovation. Our Student Facial Recognition System represents our dedication to 
              implementing cutting-edge technology for enhanced campus security and student services.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Our Mission</h3>
                  <p className="text-white/80">
                    To provide world-class education and research opportunities while ensuring 
                    the highest standards of campus security and student experience.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Innovation Focus</h3>
                  <p className="text-white/80">
                    Leading the way in educational technology adoption and digital transformation 
                    across Ethiopian higher education institutions.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Student-Centered</h3>
                  <p className="text-white/80">
                    Every technology implementation is designed with student convenience, 
                    security, and academic success as our primary considerations.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <img
              src="/src/assets/images/aastu campus.png"
              alt="AASTU Campus Building"
              className="w-full h-100 object-cover rounded-2xl shadow-2xl"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-blue-600 opacity-10 rounded-2xl"></div>
            
            <div className="absolute bottom-6 left-6 right-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">15K+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Students</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">500+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Faculty</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">50+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Programs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;