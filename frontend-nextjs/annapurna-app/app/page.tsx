'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [titleText, setTitleText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [featuresTitleText, setFeaturesTitleText] = useState('');
  const [featuresSubtitleText, setFeaturesSubtitleText] = useState('');
  const [stepsTitleText, setStepsTitleText] = useState('');
  const [stepsSubtitleText, setStepsSubtitleText] = useState('');
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [showFeaturesScrollArrow, setShowFeaturesScrollArrow] = useState(false);
  const [showStepScrollArrow, setShowStepScrollArrow] = useState(false);
  const [featureCardsVisible, setFeatureCardsVisible] = useState(false);
  const [stepCardsVisible, setStepCardsVisible] = useState(false);

  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const featuresVideoRef = useRef<HTMLVideoElement>(null);
  const stepsVideoRef = useRef<HTMLVideoElement>(null);
  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const stepsSectionRef = useRef<HTMLDivElement>(null);

  const title = "Your Personal AI Chef at Your Fingertips";
  const subtitle = "Discover, cook, and master recipes with the help of AI. Ask questions, get step-by-step guidance, and customize recipes to your taste.";
  const featuresTitle = "Choosing Annapurna";
  const featuresSubtitle = "Our AI-powered platform makes cooking easier, more fun, and personalized to your needs.";
  const stepsTitle = "Using Annapurna";
  const stepsSubtitle = "Get started in just a few simple steps";

  const titleSpeed = 100;
  const subtitleSpeed = 30;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Typing animation for hero title
  useEffect(() => {
    let i = 0;
    const typeTitle = () => {
      if (i < title.length) {
        setTitleText(title.substring(0, i + 1) + '|');
        i++;
        setTimeout(typeTitle, titleSpeed);
      } else {
        setTitleText(title);
        setTimeout(() => {
          let j = 0;
          const typeSubtitle = () => {
            if (j < subtitle.length) {
              setSubtitleText(subtitle.substring(0, j + 1) + '|');
              j++;
              setTimeout(typeSubtitle, subtitleSpeed);
            } else {
              setSubtitleText(subtitle);
              setShowGetStarted(true);
              setTimeout(() => setShowScrollArrow(true), 500);
            }
          };
          typeSubtitle();
        }, 500);
      }
    };
    typeTitle();
  }, []);

  // Video autoplay
  useEffect(() => {
    if (heroVideoRef.current) {
      heroVideoRef.current.muted = true;
      heroVideoRef.current.play().catch(err => console.warn('Autoplay blocked:', err));
    }
  }, []);

  // Intersection Observer for features section
  useEffect(() => {
    if (!featuresSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (featuresVideoRef.current) {
              featuresVideoRef.current.play().catch(err => console.warn('Video play error:', err));
            }
            if (!featuresTitleText) {
              let i = 0;
              const typeFeaturesTitle = () => {
                if (i < featuresTitle.length) {
                  setFeaturesTitleText(featuresTitle.substring(0, i + 1) + '|');
                  i++;
                  setTimeout(typeFeaturesTitle, titleSpeed);
                } else {
                  setFeaturesTitleText(featuresTitle);
                  setTimeout(() => {
                    let j = 0;
                    const typeFeaturesSubtitle = () => {
                      if (j < featuresSubtitle.length) {
                        setFeaturesSubtitleText(featuresSubtitle.substring(0, j + 1) + '|');
                        j++;
                        setTimeout(typeFeaturesSubtitle, subtitleSpeed);
                      } else {
                        setFeaturesSubtitleText(featuresSubtitle);
                        setFeatureCardsVisible(true);
                        setTimeout(() => setShowFeaturesScrollArrow(true), 1000);
                      }
                    };
                    typeFeaturesSubtitle();
                  }, 500);
                }
              };
              typeFeaturesTitle();
            }
          } else {
            if (featuresVideoRef.current) {
              featuresVideoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(featuresSectionRef.current);
    return () => observer.disconnect();
  }, [featuresTitleText, featuresSubtitle]);

  // Intersection Observer for steps section
  useEffect(() => {
    if (!stepsSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (stepsVideoRef.current) {
              stepsVideoRef.current.play().catch(err => console.warn('Video play error:', err));
            }
            if (!stepsTitleText) {
              let i = 0;
              const typeStepsTitle = () => {
                if (i < stepsTitle.length) {
                  setStepsTitleText(stepsTitle.substring(0, i + 1) + '|');
                  i++;
                  setTimeout(typeStepsTitle, titleSpeed);
                } else {
                  setStepsTitleText(stepsTitle);
                  setTimeout(() => {
                    let j = 0;
                    const typeStepsSubtitle = () => {
                      if (j < stepsSubtitle.length) {
                        setStepsSubtitleText(stepsSubtitle.substring(0, j + 1) + '|');
                        j++;
                        setTimeout(typeStepsSubtitle, subtitleSpeed);
                      } else {
                        setStepsSubtitleText(stepsSubtitle);
                        setStepCardsVisible(true);
                        setTimeout(() => setShowStepScrollArrow(true), 1000);
                      }
                    };
                    typeStepsSubtitle();
                  }, 500);
                }
              };
              typeStepsTitle();
            }
          } else {
            if (stepsVideoRef.current) {
              stepsVideoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(stepsSectionRef.current);
    return () => observer.disconnect();
  }, [stepsTitleText, stepsSubtitle]);

  return (
    <div className="landing-wrapper min-h-screen text-white font-['Segoe_UI',sans-serif] relative overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 flex justify-between items-center px-4 sm:px-8 md:px-16 py-4 sm:py-6 z-[1000] bg-black/20 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none">
        <div className="brand italiana text-2xl sm:text-3xl text-white">Annapurna</div>
        <div className="nav-links italiana flex gap-3 sm:gap-6">
          <Link href="/login" className="cta text-white text-xs sm:text-sm font-medium transition-all duration-300 py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl bg-white/15 hover:bg-white/30 border border-white/30">
            Login
          </Link>
          <Link href="/register" className="cta text-white text-xs sm:text-sm font-medium transition-all duration-300 py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl bg-[#ff9f1d] hover:bg-[#e88d15] text-white shadow-md">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen w-full overflow-hidden flex flex-col justify-center px-4 sm:px-8 md:px-16 lg:px-24 py-20">
        <video
          ref={heroVideoRef}
          className="background-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/assets/landing-1.mp4" type="video/mp4" />
        </video>
        <div className="hero-content max-w-2xl relative z-[2] mt-10 sm:mt-0">
          <h1 className="playfair-display-title text-3xl sm:text-4xl md:text-5xl mb-4 leading-tight">{titleText || '|'}</h1>
          <p className="playfair-display-subtitle text-sm sm:text-base md:text-lg mb-8 leading-relaxed text-stone-100">{subtitleText || ''}</p>
          {showGetStarted && (
            <Link
              href="/login"
              className={`inline-block cbg bg-white/20 backdrop-blur-sm border border-white py-3 px-8 rounded-xl text-white font-semibold text-sm sm:text-base transition-all duration-300 hover:bg-white hover:text-black shadow-lg ${showGetStarted ? 'fade-in' : 'opacity-0'}`}
            >
              Get Started →
            </Link>
          )}
        </div>
        {showScrollArrow && (
          <div
            className={`scroll-arrow absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 opacity-0 cursor-pointer transition-all duration-300 z-[2] hover:-translate-y-1 ${showScrollArrow ? 'fade-in' : ''}`}
            onClick={() => scrollToSection('features')}
          >
            <svg width="40" height="40" className="sm:w-[50px] sm:h-[50px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section
        ref={featuresSectionRef}
        id="features"
        className="features relative min-h-screen w-full overflow-hidden flex flex-col justify-center py-20 px-4 sm:px-8 md:px-16"
      >
        <video
          ref={featuresVideoRef}
          className="background-video"
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/assets/landing-2.mp4" type="video/mp4" />
        </video>
        <div className="content relative z-[2] text-center max-w-5xl mx-auto">
          <h2 className="playfair-display-title text-2xl sm:text-3xl md:text-4xl mb-3">{featuresTitleText || ''}</h2>
          <p className="playfair-display-subtitle text-xs sm:text-sm md:text-base mb-8 sm:mb-12 opacity-90 max-w-xl mx-auto">{featuresSubtitleText || ''}</p>

          <div className="feature-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 justify-center">
            {[
              { icon: '🍲', title: 'Recipe Collection', desc: 'Access thousands of recipes with step-by-step guidance and ingredients.' },
              { icon: '🤖', title: 'AI Chat Assistant', desc: 'Ask questions, get substitutions, and receive live advice from Anu AI.' },
              { icon: '📝', title: 'AI Recipe Parser', desc: 'Paste raw text from blogs or notes and let AI auto-structure the recipe.' },
              { icon: '🎙', title: 'Voice Companion', desc: 'Hands-free cooking guidance with microphone STT and live voice assistant.' },
            ].map((feature, index) => (
              <div
                key={index}
                className={`feature bg-black/40 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 transition-all duration-700 border border-white/10 ${
                  featureCardsVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-5'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="mb-2 text-base sm:text-lg font-bold font-['Playfair_Display',serif] text-white">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm font-normal text-stone-200 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        {showFeaturesScrollArrow && (
          <div
            className={`scroll-arrow absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 opacity-0 cursor-pointer transition-all duration-300 z-[2] hover:-translate-y-1 ${showFeaturesScrollArrow ? 'fade-in' : ''}`}
            onClick={() => scrollToSection('steps')}
          >
            <svg width="40" height="40" className="sm:w-[50px] sm:h-[50px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </section>

      {/* Steps Section */}
      <section
        ref={stepsSectionRef}
        id="steps"
        className="steps relative min-h-screen w-full overflow-hidden flex flex-col justify-center text-center py-20 px-4 sm:px-8 md:px-16"
      >
        <video
          ref={stepsVideoRef}
          className="background-video"
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/assets/landing-3.mp4" type="video/mp4" />
        </video>
        <div className="content relative z-[2] max-w-5xl mx-auto w-full">
          <h2 className="playfair-display-title text-2xl sm:text-3xl md:text-4xl mb-3">{stepsTitleText || ''}</h2>
          <p className="playfair-display-subtitle text-xs sm:text-sm md:text-base mb-8 sm:mb-12 opacity-90">{stepsSubtitleText || ''}</p>

          <div className="step-grid grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full">
            {[
              { num: '1', title: 'Browse Recipes', desc: 'Search our collection by cuisine, difficulty, or ingredients.' },
              { num: '2', title: 'Select & Customize', desc: 'Choose a recipe and tailor it to your dietary needs or preferences.' },
              { num: '3', title: 'Cook with AI', desc: 'Follow along hands-free with voice and real-time guidance from Anu.' },
            ].map((step, index) => (
              <div
                key={index}
                className={`step playfair-display-subtitle flex items-start text-left gap-4 bg-black/40 backdrop-blur-md rounded-2xl p-6 transition-all duration-500 border border-white/10 ${
                  stepCardsVisible
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-8'
                } hover:bg-black/60`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="step-number bg-[#ff9f1d] text-white w-9 h-9 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 shadow-md">
                  {step.num}
                </div>
                <div className="step-text">
                  <h4 className="m-0 mb-1.5 text-base sm:text-lg font-bold text-white">{step.title}</h4>
                  <p className="m-0 text-xs sm:text-sm text-stone-200 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showStepScrollArrow && (
          <div
            className={`scroll-arrow absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 opacity-0 cursor-pointer transition-all duration-300 z-[2] hover:translate-y-1 ${showStepScrollArrow ? 'fade-in' : ''}`}
            onClick={() => scrollToSection('hero')}
          >
            <svg width="40" height="40" className="sm:w-[50px] sm:h-[50px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </section>
    </div>
  );
}
