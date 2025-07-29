import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

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
    action: () => void;
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
        classes: 'shadow-md bg-white rounded-lg',
        scrollTo: { behavior: 'smooth', block: 'center' },
        modalOverlayOpeningPadding: 4,
      },
    });
  }

  public loadSteps(steps: TourStep[]) {
    this.steps = steps;
    this.steps.forEach((step) => {
      this.tour?.addStep({
        title: step.title,
        text: step.text,
        attachTo: step.attachTo,
        buttons: step.buttons,
        classes: step.classes || 'shadow-md bg-white rounded-lg',
        id: step.id,
      });
    });
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