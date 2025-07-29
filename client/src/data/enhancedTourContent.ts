export const enhancedTourContent = {
  tourSteps: [
    {
      id: "tour-welcome",
      title: "Welcome to LCA Data Collection!",
      text: "This guided tour will walk you through each step of Life Cycle Assessment data collection. We'll explain what each field means and why it's important for your sustainability report.<br><br><div class='shepherd-highlight'>💡 <strong>Tip:</strong> This tour takes about 3-4 minutes and will help you create more accurate sustainability reports.</div>",
      buttons: [
        {
          text: "Let's Start! 🚀",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Skip Tour",
          action: "cancel",
          classes: "shepherd-button-secondary"
        }
      ]
    },
    {
      id: "agriculture-overview",
      title: "Agriculture Section Overview",
      text: "First, we'll collect data about your primary agricultural ingredient. This is the foundation of your product - whether it's barley for whisky, grapes for wine, or apples for calvados.<br><br><div class='shepherd-highlight'>🌱 <strong>Why this matters:</strong> Agricultural practices can account for 20-40% of your product's total carbon footprint.</div>",
      attachTo: {
        element: "[data-testid='agriculture-section']",
        on: "top"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Continue",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    },
    {
      id: "crop-type-explanation",
      title: "Primary Crop Selection",
      text: "Select your main agricultural ingredient here. This is the crop that forms the base of your alcoholic beverage. For spirits like whisky, this would be grains. For wine, it's grapes. For apple-based spirits like calvados, it's apples. This choice affects all subsequent calculations.",
      attachTo: {
        element: "[name='lcaData.agriculture.mainCropType']",
        on: "bottom"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Next",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    },
    {
      id: "yield-explanation",
      title: "Crop Yield Understanding",
      text: "Yield measures how productive the farming is - tonnes of crop harvested per hectare of land. Higher yields generally mean more efficient land use. You can get this information from your supplier or agricultural reports. Don't worry if you need to estimate - we can refine it later.",
      attachTo: {
        element: "[name='lcaData.agriculture.yieldTonPerHectare']",
        on: "bottom"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Continue",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    },
    {
      id: "transport-impact",
      title: "Transport Environmental Impact",
      text: "Transportation is often a major contributor to carbon footprint. We track the distance your raw materials travel and the transport method. Longer distances and carbon-intensive transport (like trucking vs. rail) increase environmental impact. Local sourcing helps reduce this.",
      attachTo: {
        element: "[name='lcaData.inboundTransport.avgDistanceKm']",
        on: "bottom"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Next",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    },
    {
      id: "processing-energy",
      title: "Production Energy Consumption",
      text: "Energy use during production is critical for calculating carbon footprint. This includes electricity for pumps, lighting, refrigeration, and any heating or cooling processes.<br><br><div class='shepherd-tip'>⚡ <strong>Pro Tip:</strong> Renewable energy significantly reduces environmental impact, so be sure to include that percentage!</div>",
      attachTo: {
        element: "[name='lcaData.processing.electricityKwhPerTonCrop']",
        on: "bottom"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Continue",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    },
    {
      id: "packaging-importance",
      title: "Packaging Environmental Impact",
      text: "Packaging often represents 30-60% of a product's total carbon footprint! Every component matters - bottles, labels, caps, secondary packaging.<br><br><div class='shepherd-highlight'>📦 <strong>Impact Focus:</strong> Material choice (glass vs. plastic vs. aluminum) and recycled content percentages make huge differences in environmental impact.</div>",
      attachTo: {
        element: "[data-testid='packaging-section']",
        on: "top"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Next",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    },
    {
      id: "distribution-logistics",
      title: "Distribution & Logistics",
      text: "The journey from your facility to consumers affects environmental impact. We track distance to distribution centers and transport methods. Cold chain requirements (refrigerated transport) significantly increase energy consumption and carbon footprint.",
      attachTo: {
        element: "[name='lcaData.distribution.avgDistanceToDcKm']",
        on: "bottom"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Next",
          action: "next",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    },
    {
      id: "end-of-life-impact",
      title: "End-of-Life Management",
      text: "What happens when consumers finish your product matters for sustainability. Higher recycling rates reduce environmental impact. The disposal method for non-recycled materials (landfill vs. incineration) affects the final carbon footprint calculation.<br><br><div class='shepherd-tip'>🎯 <strong>You're almost done!</strong> You now understand all the key data points needed for accurate LCA reporting.</div>",
      attachTo: {
        element: "[data-testid='end-of-life-section']",
        on: "top"
      },
      buttons: [
        {
          text: "Previous",
          action: "back",
          classes: "shepherd-button-secondary"
        },
        {
          text: "Complete Tour ✅",
          action: "complete",
          classes: "shepherd-button-primary"
        },
        {
          text: "Exit",
          action: "cancel",
          classes: "shepherd-button-link"
        }
      ]
    }
  ]
};