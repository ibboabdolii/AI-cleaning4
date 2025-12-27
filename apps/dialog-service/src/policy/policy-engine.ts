import type { Session } from '@cleanai/shared';
import type { QuickReply } from '@cleanai/schemas';

interface PolicyResult {
  type: string;
  message: string;
  requiredSlot?: string;
  quickReplies?: QuickReply[];
  nextActions: string[];
}

export function generatePolicy(session: Session, confidence: number): PolicyResult {
  if (session.low_conf_streak >= 3) {
    return {
      type: 'escalate',
      message: "I'm having trouble understanding. Let me connect you with a person who can help.",
      nextActions: ['escalate_to_human'],
    };
  }
  
  if (session.state === 'ESCALATE') {
    return {
      type: 'escalate',
      message: "I'll connect you with our support team. Please hold.",
      nextActions: ['create_handoff'],
    };
  }
  
  if (session.intent === 'faq_generic') {
    return {
      type: 'answer',
      message: "We're open Monday-Saturday, 8am-6pm. Our cleaning service includes dusting, vacuuming, and bathroom/kitchen cleaning.",
      nextActions: ['wait_for_user_input'],
    };
  }
  
  if (session.intent === 'booking_status') {
    if (session.state === 'SUCCESS') {
      return {
        type: 'answer',
        message: `Your booking ${session.slots.booking_ref || 'BK-DEMO01'} is scheduled for tomorrow at 10am. Your cleaner will arrive on time.`,
        nextActions: ['wait_for_user_input'],
      };
    }
    return {
      type: 'ask_slot',
      message: "I can check your booking status. What's your booking reference number? (e.g., BK-123456)",
      requiredSlot: 'booking_ref',
      nextActions: ['wait_for_user_input'],
    };
  }
  
  if (session.state === 'ASK_LOCATION') {
    return {
      type: 'ask_slot',
      message: "Which city are you in?",
      requiredSlot: 'location',
      nextActions: ['wait_for_user_input'],
    };
  }
  
  if (session.state === 'ASK_SIZE') {
    return {
      type: 'ask_slot',
      message: "How many bedrooms, or what's the square footage?",
      requiredSlot: 'home_area_m2',
      nextActions: ['wait_for_user_input'],
    };
  }
  
  if (session.state === 'CONFIRM_SIZE') {
    return {
      type: 'confirm_slot',
      message: `For a ${session.slots.bedroom_count}-bedroom home, we estimate about ${session.slots.home_area_m2}m². Does that sound right?`,
      quickReplies: [
        { text: 'Yes', action: 'confirm_size' },
        { text: 'No, smaller', action: 'ask_exact_size' },
        { text: 'No, larger', action: 'ask_exact_size' },
      ],
      nextActions: ['wait_for_confirmation'],
    };
  }
  
  if (session.state === 'ASK_TYPE') {
    return {
      type: 'ask_slot',
      message: "Would you like standard cleaning ($68) or deep cleaning ($95)?",
      requiredSlot: 'service_type',
      quickReplies: [
        { text: 'Standard', value: 'standard' },
        { text: 'Deep', value: 'deep' },
      ],
      nextActions: ['wait_for_user_input'],
    };
  }
  
  if (session.state === 'CALCULATE') {
    const price = session.slots.service_type === 'deep' ? 95 : 68;
    return {
      type: 'present_quote',
      message: `For a ${session.slots.home_area_m2}m² home in ${session.slots.location}, ${session.slots.service_type} cleaning is $${price}. Would you like to book?`,
      quickReplies: [
        { text: 'Book now', action: 'book' },
        { text: 'Not now', action: 'cancel' },
      ],
      nextActions: ['wait_for_booking_intent'],
    };
  }
  
  if (session.state === 'ASK_DATE') {
    return {
      type: 'ask_slot',
      message: "When would you like the service? (e.g., tomorrow, next Monday)",
      requiredSlot: 'date',
      nextActions: ['wait_for_user_input'],
    };
  }
  
  if (session.state === 'ASK_TIME') {
    return {
      type: 'ask_slot',
      message: "What time works best? (e.g., 9am, 2pm)",
      requiredSlot: 'time',
      nextActions: ['wait_for_user_input'],
    };
  }
  
  if (session.state === 'CONFIRM') {
    return {
      type: 'confirm_booking',
      message: `Perfect! I'll book ${session.slots.service_type} cleaning for ${session.slots.date} at ${session.slots.time}. Confirm?`,
      quickReplies: [
        { text: 'Confirm', action: 'confirm' },
        { text: 'Cancel', action: 'cancel' },
      ],
      nextActions: ['wait_for_confirmation'],
    };
  }
  
  if (session.state === 'SUCCESS') {
    return {
      type: 'success',
      message: "All set! Your booking reference is BK-ABC123. You'll receive a confirmation email shortly.",
      nextActions: ['conversation_complete'],
    };
  }
  
  return {
    type: 'clarify',
    message: "I can help you get a quote or book a cleaning. What would you like to do?",
    quickReplies: [
      { text: 'Get a quote', value: 'quote' },
      { text: 'Book cleaning', value: 'book' },
    ],
    nextActions: ['wait_for_user_input'],
  };
}