interface IncomingRequest {
  method?: string;
}

interface OutgoingResponse {
  status: (code: number) => OutgoingResponse;
  json: (data: unknown) => void;
}

export default function handler(_req: IncomingRequest, res: OutgoingResponse) {
  res.status(200).json({
    status: 'ok',
    platform: 'Vercel Serverless',
    timestamp: new Date().toISOString(),
  });
}
