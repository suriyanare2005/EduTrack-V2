import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackIllustration, ReminderIllustration, SimulatorIllustration } from '../assets/illustrations';
import { Button } from '@/components/ui/button';

export const Onboarding: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // If user already saw onboarding, skip to login
    const hasSeen = localStorage.getItem('hasSeenOnboarding');
    if (hasSeen) {
      navigate('/auth/login', { replace: true });
    }
  }, [navigate]);

  const slides = [
    {
      title: 'Track your EMIs effortlessly',
      description: 'Keep all your education loans in one simple view. Monitor interest rates, tenures, and balances in real-time.',
      illustration: <TrackIllustration />,
    },
    {
      title: 'Never miss a payment again',
      description: 'Set custom reminders and schedule push alerts. Log your transactions easily and stay on top of interest rates.',
      illustration: <ReminderIllustration />,
    },
    {
      title: 'Simulate your loan freedom',
      description: 'Find out how much interest and tenure you save by making extra payments or lump-sum prepayments.',
      illustration: <SimulatorIllustration />,
    },
  ];

  const handleFinish = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/auth/signup');
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/auth/login');
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleFinish();
    }
  };

  // Framer Motion Animation Variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-text-primary px-6 py-8 max-w-md mx-auto relative overflow-hidden">
      {/* Top Bar with Skip */}
      <div className="flex justify-between items-center h-10">
        <span className="text-xl font-bold tracking-tight text-primary">
          Edu<span className="text-primary-light">Track</span>
        </span>
        {currentSlide < slides.length - 1 && (
          <Button variant="ghost" className="text-text-secondary hover:text-primary" onClick={handleSkip}>
            Skip
          </Button>
        )}
      </div>

      {/* Main Slide Carousel Area */}
      <div className="flex-1 flex flex-col justify-center items-center my-6 relative min-h-[360px]">
        <AnimatePresence initial={false} custom={currentSlide}>
          <motion.div
            key={currentSlide}
            custom={currentSlide}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full flex flex-col items-center text-center absolute"
          >
            <div className="w-56 h-56 mb-8 flex items-center justify-center">
              {slides[currentSlide].illustration}
            </div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight text-text-primary">
              {slides[currentSlide].title}
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="space-y-6">
        {/* Pagination Dots */}
        <div className="flex justify-center space-x-2">
          {slides.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 rounded-full ${index === currentSlide ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
              animate={{ width: index === currentSlide ? 24 : 8 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleNext}
          className="w-full py-6 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary-light text-white"
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
};
