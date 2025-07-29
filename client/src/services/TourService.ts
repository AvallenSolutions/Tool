import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import '@/styles/enhanced-shepherd.css';

export interface TourStep {
  id: string;
  title: string;
  text: string;
  attachTo?: {
    element: string;
    on: string;
  };
  buttons: Array<{
    text: string;
    action: string;
    classes?: string;
  }>;
  classes?: string;
}

export class TourService {
  public tour: any = null;
  private steps: TourStep[] = [];

  constructor() {
    this.initializeTour();
  }

  private initializeTour() {
    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-element-enhanced',
        scrollTo: { behavior: 'smooth', block: 'center' },
        modalOverlayOpeningPadding: 8,
      },
    });

    // Tour completion tracking
    this.tour.on('complete', () => {
      localStorage.setItem('lca-tour-completed', 'true');
      console.log('LCA Tour completed successfully');
    });

    this.tour.on('cancel', () => {
      console.log('LCA Tour cancelled');
    });
  }

  public loadSteps(steps: any[]) {
    this.steps = steps;
    console.log('Loading steps into Shepherd:', steps.length);
    
    this.steps.forEach((step, index) => {
      const progressBar = this.createProgressBar(index, steps.length);
      const stepIndicator = this.createStepIndicator(index + 1, steps.length);
      
      this.tour?.addStep({
        title: step.title,
        text: `${progressBar}${stepIndicator}${step.text}`,
        attachTo: step.attachTo,
        beforeShowPromise: () => this.animateTargetElement(step.attachTo?.element),
        buttons: step.buttons.map((button: any) => ({
          text: button.text,
          action: () => {
            console.log('Button action:', button.action);
            this.addButtonClickAnimation(event?.target);
            
            if (button.action === 'next') {
              this.tour?.next();
            } else if (button.action === 'back') {
              this.tour?.back();
            } else if (button.action === 'cancel') {
              this.tour?.cancel();
            } else if (button.action === 'complete') {
              this.tour?.complete();
            }
          },
          classes: button.classes,
        })),
        classes: step.classes || 'shepherd-element-enhanced',
        id: step.id,
      });
    });
  }

  private createProgressBar(currentIndex: number, totalSteps: number): string {
    const progress = ((currentIndex + 1) / totalSteps) * 100;
    return `
      <div class="shepherd-progress">
        <div class="shepherd-progress-bar" style="width: ${progress}%"></div>
      </div>
    `;
  }

  private createStepIndicator(current: number, total: number): string {
    return `
      <div class="shepherd-step-indicator">
        Step ${current} of ${total}
      </div>
    `;
  }

  private async animateTargetElement(selector?: string): Promise<void> {
    if (!selector) return;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const element = document.querySelector(selector);
        if (element) {
          element.classList.add('shepherd-target-highlighted');
          // Remove highlight after tour step changes
          setTimeout(() => {
            element.classList.remove('shepherd-target-highlighted');
          }, 5000);
        }
        resolve();
      }, 100);
    });
  }

  private addButtonClickAnimation(button: any): void {
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = '';
      }, 150);
    }
  }

  public startTour() {
    if (this.tour && this.steps.length > 0) {
      this.tour.start();
    }
  }

  public cancelTour() {
    if (this.tour) {
      this.tour.cancel();
    }
  }

  public completeTour() {
    if (this.tour) {
      this.tour.complete();
    }
  }

  public getCurrentStep() {
    return this.tour?.getCurrentStep();
  }

  public isActive() {
    return this.tour?.isActive() || false;
  }
}

export default TourService;