import { Resend } from "resend";

// Create a no-op stub for when Resend is not configured
const createResendStub = () => ({
  emails: {
    send: async () => {
      console.warn("[Resend] Email not sent - RESEND_API_KEY not configured");
      return { data: null, error: null };
    },
  },
  contacts: {
    remove: async () => {
      console.warn("[Resend] Contact not removed - RESEND_API_KEY not configured");
      return { data: null, error: null };
    },
  },
});

// Make Resend optional - app can start without email functionality
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : createResendStub();
