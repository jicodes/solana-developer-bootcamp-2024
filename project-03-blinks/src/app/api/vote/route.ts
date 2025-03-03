import { ActionGetResponse, ACTIONS_CORS_HEADERS } from "@solana/actions";

export const OPTIONS = async (req: Request) => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};

export async function GET(request: Request) {
  const actionMetadata: ActionGetResponse = {
    icon: "https://www.color-hex.com/palettes/67855.png",
    title: "vote for your favorite color",
    description: "vote between red and blue",
    label: "Vote",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Vote for Red",
          href: "/api/vote?candidate=red",
          
        },
        {
          type: "transaction",
          label: "Vote for Blue",
          href: "/api/vote?candidate=blue",
        },
      ],
    },
  };
  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

