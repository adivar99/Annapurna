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
      { threshold: 0.5 }
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
      { threshold: 0.5 }
    );

    observer.observe(stepsSectionRef.current);
    return () => observer.disconnect();
  }, [stepsTitleText, stepsSubtitle]);

  return (
    <div className="landing-wrapper min-h-screen text-white font-['Segoe_UI',sans-serif] relative overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 flex justify-between items-center px-16 py-6 z-[1000] bg-transparent">
        <div className="brand italiana text-[1.8rem] text-white">Annapurna</div>
        <div className="nav-links italiana flex gap-6">
          <Link href="/login" className="cta text-white no-underline font-medium transition-all duration-300 py-3 px-8 rounded hover:bg-white/20 hover:border hover:border-white/50">
            Login
          </Link>
          <Link href="/register" className="cta text-white no-underline font-medium transition-all duration-300 py-3 px-8 rounded hover:bg-white/20 hover:border hover:border-white/50">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative h-screen w-full overflow-hidden flex flex-col justify-center">
        <video
          ref={heroVideoRef}
          className="background-video"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/assets/landing-1.mp4" type="video/mp4" />
          <source src="/assets/landing-1.webm" type="video/webm" />
        </video>
        <div className="hero-content max-w-[750px] relative z-[2] pl-[15vh]">
          <h1 className="playfair-display-title text-[2.5rem] mb-4">{titleText || '|'}</h1>
          <p className="playfair-display-subtitle text-[1.1rem] mb-8">{subtitleText || ''}</p>
          {showGetStarted && (
            <Link
              href="/login"
              className={`cta bg-white/10 border border-white py-3 px-8 rounded text-white no-underline transition-all duration-300 hover:bg-white hover:text-black ${showGetStarted ? 'fade-in' : 'opacity-0'}`}
            >
              Get Started
            </Link>
          )}
        </div>
        {showScrollArrow && (
          <div
            className={`scroll-arrow absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 cursor-pointer transition-all duration-300 z-[2] hover:-translate-y-1 ${showScrollArrow ? 'fade-in' : ''}`}
            onClick={() => scrollToSection('features')}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section
        ref={featuresSectionRef}
        id="features"
        className="features relative min-h-screen w-full overflow-hidden flex flex-col justify-center"
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
        <div className="content relative z-[2] p-8 px-16">
          <h2 className="playfair-display-title text-[2rem] mb-2">{featuresTitleText || ''}</h2>
          <p className="playfair-display-subtitle text-base mb-8 opacity-90">{featuresSubtitleText || ''}</p>

          <div className="feature-grid flex flex-wrap justify-center gap-8">
            {[
              { title: 'Recipe Collection', desc: 'Access thousands of recipes from around the world with detailed instructions and nutritional info.' },
              { title: 'AI Chat Assistant', desc: 'Ask questions, get modifications, and receive step-by-step guidance from your personal AI chef.' },
              { title: 'Shopping Lists', desc: 'Automatically generate shopping lists from your favorite recipes and meal plans.' },
              { title: 'Step-by-step Guide', desc: 'Follow clear instructions with timers and technique tips to perfect every dish.' },
            ].map((feature, index) => (
              <div
                key={index}
                className={`feature bg-black/30 rounded-[180px] p-4 w-[220px] transition-all duration-[1.2s] cursor-pointer text-center ${
                  featureCardsVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-5'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <h3 className="mb-2 text-[1.2rem] font-normal font-['Playfair_Display',serif] text-white transition-colors duration-500">
                  {feature.title}
                </h3>
                <p className="text-[0.95rem] font-normal font-['Playfair_Display',serif] text-white transition-colors duration-300">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        {showFeaturesScrollArrow && (
          <div
            className={`scroll-arrow absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 cursor-pointer transition-all duration-300 z-[2] hover:-translate-y-1 ${showFeaturesScrollArrow ? 'fade-in' : ''}`}
            onClick={() => scrollToSection('steps')}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </section>

      {/* Steps Section */}
      <section
        ref={stepsSectionRef}
        id="steps"
        className="steps relative min-h-screen w-full overflow-hidden flex flex-col justify-center text-center"
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
        <div className="content relative z-[2] p-8 px-16">
          <h2 className="playfair-display-title text-[2rem] mb-2">{stepsTitleText || ''}</h2>
          <p className="playfair-display-subtitle mb-8">{stepsSubtitleText || ''}</p>

          <div className="step-grid flex flex-row justify-center gap-8 mt-12 w-full max-w-[1200px] mx-auto">
            {[
              { num: '1', title: 'Browse Recipe', desc: 'Search our collection by cuisine, difficulty, or ingredients.' },
              { num: '2', title: 'Select & Customize', desc: 'Choose a recipe and tailor it to your dietary needs or preferences.' },
              { num: '3', title: 'Cook with AI Assistance', desc: 'Follow along with step-by-step guidance and improve with AI help.' },
            ].map((step, index) => (
              <div
                key={index}
                className={`step playfair-display-subtitle flex items-start gap-6 bg-white/10 backdrop-blur-[10px] rounded-2xl p-8 w-[300px] transition-all duration-500 ${
                  stepCardsVisible
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-[100px]'
                } hover:bg-white/20 hover:-translate-y-2`}
                style={{ transitionDelay: `${index * 300}ms` }}
              >
                <div className="step-number bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-[1.5rem] font-bold flex-shrink-0">
                  {step.num}
                </div>
                <div className="step-text">
                  <h4 className="m-0 mb-2 text-[1.25rem] font-semibold">{step.title}</h4>
                  <p className="m-0 text-base opacity-90">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {showStepScrollArrow && (
          <div
            className={`scroll-arrow absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 cursor-pointer transition-all duration-300 z-[2] hover:translate-y-1 ${showStepScrollArrow ? 'fade-in' : ''}`}
            onClick={() => scrollToSection('hero')}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </section>
    </div>
  );
}
