import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit, AfterViewInit {
  @ViewChild('getStartedButton') getStartedButton!: ElementRef;
  @ViewChild('scrollArrow') scrollArrow!: ElementRef;
  @ViewChild('featuresScrollArrow') featuresScrollArrow!: ElementRef;
  @ViewChild('stepScrollArrow') stepScrollArrow!: ElementRef;
  
  private title: string = "Your Personal AI Chef at Your Fingertips";
  private subtitle: string = "Discover, cook, and master recipes with the help of AI. Ask questions, get step-by-step guidance, and customize recipes to your taste.";
  private featuresTitle: string = "Choosing Annapurna";
  private featuresSubtitle: string = "Our AI-powered platform makes cooking easier, more fun, and personalized to your needs.";
  private stepsTitle: string = "Using Annapurna";
  private stepsSubtitle: string = "Get started in just a few simple steps";
  private titleSpeed: number = 100; // time delay for title
  private subtitleSpeed: number = 30; // faster time delay for subtitle
  private iTextPos: number = 0; // initialize text position
  private observer: IntersectionObserver;
  private featuresObserver: IntersectionObserver;
  private stepsObserver: IntersectionObserver;

  constructor() {
    // Create intersection observer to watch section visibility
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const video = entry.target.querySelector('video');
          if (video) {
            if (entry.isIntersecting) {
              video.play();
            } else {
              video.pause();
            }
          }
        });
      },
      {
        threshold: 0.5 // Trigger when 50% of the section is visible
      }
    );

    // Create intersection observer for features section
    this.featuresObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.typeFeaturesTitle();
          }
        });
      },
      {
        threshold: 0.5
      }
    );

    // Create intersection observer for steps section
    this.stepsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.typeStepsTitle();
          }
        });
      },
      {
        threshold: 0.5
      }
    );
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.typeTitle();
    this.setupVideoObservers();
    this.setupFeaturesObserver();
    this.setupStepsObserver();
  }

  private setupVideoObservers(): void {
    // Observe features and steps sections
    const featuresSection = document.querySelector('.features');
    const stepsSection = document.querySelector('.steps');
    
    if (featuresSection) {
      this.observer.observe(featuresSection);
    }
    if (stepsSection) {
      this.observer.observe(stepsSection);
    }
  }

  scrollToFeatures() {
    document.getElementById("features")?.scrollIntoView({behavior: "smooth"})
  }

  scrollToSteps() {
    document.getElementById("steps")?.scrollIntoView({behavior: "smooth"})
  }

  scrollToHero() {
    document.getElementById("hero")?.scrollIntoView({behavior: "smooth"})
  }

  private setupFeaturesObserver(): void {
    const featuresSection = document.querySelector('.features');
    if (featuresSection) {
      this.featuresObserver.observe(featuresSection);
    }
  }

  private setupStepsObserver(): void {
    const stepsSection = document.querySelector('.steps');
    if (stepsSection) {
      this.stepsObserver.observe(stepsSection);
    }
  }

  private typeTitle(): void {
    const destination = document.getElementById("typedtext");
    if (!destination) return;

    if (this.iTextPos < this.title.length) {
      destination.innerHTML = this.title.substring(0, this.iTextPos) + "|";
      this.iTextPos++;
      setTimeout(() => this.typeTitle(), this.titleSpeed);
    } else {
      destination.innerHTML = this.title;
      this.iTextPos = 0;
      setTimeout(() => this.typeSubtitle(), 500);
    }
  }

  private typeSubtitle(): void {
    const destination = document.getElementById("typedtext-subtitle");
    if (!destination) return;

    if (this.iTextPos < this.subtitle.length) {
      destination.innerHTML = this.subtitle.substring(0, this.iTextPos) + "|";
      this.iTextPos++;
      setTimeout(() => this.typeSubtitle(), this.subtitleSpeed);
    } else {
      destination.innerHTML = this.subtitle;
      this.showGetStartedButton();
    }
  }

  private typeFeaturesTitle(): void {
    const destination = document.getElementById("features-typedtext");
    if (!destination) return;

    if (this.iTextPos < this.featuresTitle.length) {
      destination.innerHTML = this.featuresTitle.substring(0, this.iTextPos) + "|";
      this.iTextPos++;
      setTimeout(() => this.typeFeaturesTitle(), this.titleSpeed);
    } else {
      destination.innerHTML = this.featuresTitle;
      this.iTextPos = 0;
      setTimeout(() => this.typeFeaturesSubtitle(), 500);
    }
  }

  private typeFeaturesSubtitle(): void {
    const destination = document.getElementById("features-typedtext-subtitle");
    if (!destination) return;

    if (this.iTextPos < this.featuresSubtitle.length) {
      destination.innerHTML = this.featuresSubtitle.substring(0, this.iTextPos) + "|";
      this.iTextPos++;
      setTimeout(() => this.typeFeaturesSubtitle(), this.subtitleSpeed);
    } else {
      destination.innerHTML = this.featuresSubtitle;
      this.iTextPos = 0;
      this.showFeatureCards();
      setTimeout(() => {
        if (this.featuresScrollArrow?.nativeElement) {
          this.featuresScrollArrow.nativeElement.classList.add('fade-in');
        }
      }, 1000);
    }
  }

  private showFeatureCards(): void {
    const featureCards = document.querySelectorAll('.feature');
    featureCards.forEach((card, index) => {
      setTimeout(() => {
        (card as HTMLElement).classList.add('fade-in');
      }, index * 200); // Stagger the animations
    });
  }

  private showGetStartedButton(): void {
    if (this.getStartedButton && this.getStartedButton.nativeElement) {
      this.getStartedButton.nativeElement.classList.add('fade-in');
      // Show scroll arrow after button
      setTimeout(() => {
        if (this.scrollArrow && this.scrollArrow.nativeElement) {
          this.scrollArrow.nativeElement.classList.add('fade-in');
        }
      }, 500);
    }
  }

  private typeStepsTitle(): void {
    const destination = document.getElementById("steps-typedtext");
    if (!destination) return;

    if (this.iTextPos < this.stepsTitle.length) {
      destination.innerHTML = this.stepsTitle.substring(0, this.iTextPos) + "|";
      this.iTextPos++;
      setTimeout(() => this.typeStepsTitle(), this.titleSpeed);
    } else {
      destination.innerHTML = this.stepsTitle;
      this.iTextPos = 0;
      setTimeout(() => this.typeStepsSubtitle(), 500);
    }
  }

  private typeStepsSubtitle(): void {
    const destination = document.getElementById("steps-typedtext-subtitle");
    if (!destination) return;

    if (this.iTextPos < this.stepsSubtitle.length) {
      destination.innerHTML = this.stepsSubtitle.substring(0, this.iTextPos) + "|";
      this.iTextPos++;
      setTimeout(() => this.typeStepsSubtitle(), this.subtitleSpeed);
    } else {
      destination.innerHTML = this.stepsSubtitle;
      this.iTextPos = 0;
      this.showStepCards();
    }
  }

  private showStepCards(): void {
    const stepCards = document.querySelectorAll('.step');
    stepCards.forEach((card, index) => {
      setTimeout(() => {
        (card as HTMLElement).classList.add('fade-in');
      }, index * 300); // Stagger the animations with longer delay
    });
    setTimeout(() => {
      if (this.stepScrollArrow?.nativeElement) {
        this.stepScrollArrow.nativeElement.classList.add('fade-in');
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    // Clean up observer when component is destroyed
    this.observer.disconnect();
    this.featuresObserver.disconnect();
    this.stepsObserver.disconnect();
  }
}
