import { OpenPanel, type PostEventPayload } from "@openpanel/nextjs";
import { waitUntil } from "@vercel/functions";

export const setupAnalytics = async () => {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  const clientSecret = process.env.OPENPANEL_SECRET_KEY;

  // Return no-op functions if OpenPanel credentials are not configured
  if (!clientId || !clientSecret) {
    return {
      track: (options: { event: string } & PostEventPayload["properties"]) => {
        // No-op: OpenPanel not configured
      },
    };
  }

  const client = new OpenPanel({
    clientId,
    clientSecret,
  });

  return {
    track: (options: { event: string } & PostEventPayload["properties"]) => {
      if (process.env.NODE_ENV !== "production") {
        console.log("Track", options);
        return;
      }

      const { event, ...rest } = options;

      waitUntil(client.track(event, rest));
    },
  };
};
