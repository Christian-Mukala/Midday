import {
  OpenPanelComponent,
  type PostEventPayload,
  useOpenPanel,
} from "@openpanel/nextjs";

const isProd = process.env.NODE_ENV === "production";

const Provider = () => {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;

  // Only render OpenPanel if credentials are provided
  if (!clientId) {
    return null;
  }

  return (
    <OpenPanelComponent
      clientId={clientId}
      trackAttributes={true}
      trackScreenViews={isProd}
      trackOutgoingLinks={isProd}
    />
  );
};

const track = (options: { event: string } & PostEventPayload["properties"]) => {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;

  // Skip tracking if OpenPanel is not configured
  if (!clientId) {
    return;
  }

  const { track: openTrack } = useOpenPanel();

  if (!isProd) {
    console.log("Track", options);
    return;
  }

  const { event, ...rest } = options;

  openTrack(event, rest);
};

export { Provider, track };
