import type { Session, Intent, DialogState } from '@cleanai/shared';

interface SlotResult {
  nextState: DialogState;
  requiredSlots: string[];
}

export function fillSlots(session: Session, intent: Intent): SlotResult {
  if (intent === 'escalate_human') {
    return {
      nextState: 'ESCALATE',
      requiredSlots: [],
    };
  }
  
  if (intent === 'faq_generic') {
    return {
      nextState: 'SUCCESS',
      requiredSlots: [],
    };
  }
  
  if (intent === 'booking_status') {
    if (!session.slots.booking_ref) {
      return {
        nextState: 'ASK_LOCATION',
        requiredSlots: ['booking_ref'],
      };
    }
    return {
      nextState: 'SUCCESS',
      requiredSlots: [],
    };
  }
  
  if (intent === 'quote_home') {
    if (!session.slots.location) {
      return {
        nextState: 'ASK_LOCATION',
        requiredSlots: ['location', 'home_area_m2', 'service_type'],
      };
    }
    if (!session.slots.home_area_m2) {
      return {
        nextState: 'ASK_SIZE',
        requiredSlots: ['home_area_m2', 'service_type'],
      };
    }
    if (session.slots.estimated && session.state !== 'CONFIRM_SIZE') {
      return {
        nextState: 'CONFIRM_SIZE',
        requiredSlots: ['service_type'],
      };
    }
    if (!session.slots.service_type) {
      return {
        nextState: 'ASK_TYPE',
        requiredSlots: ['service_type'],
      };
    }
    return {
      nextState: 'CALCULATE',
      requiredSlots: [],
    };
  }
  
  if (intent === 'booking_new') {
    if (!session.slots.date) {
      return {
        nextState: 'ASK_DATE',
        requiredSlots: ['date', 'time'],
      };
    }
    if (!session.slots.time) {
      return {
        nextState: 'ASK_TIME',
        requiredSlots: ['time'],
      };
    }
    return {
      nextState: 'CONFIRM',
      requiredSlots: [],
    };
  }
  
  return {
    nextState: 'INIT',
    requiredSlots: [],
  };
}