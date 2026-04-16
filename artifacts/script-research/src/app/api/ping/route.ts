export async function GET() {
  return Response.json({ ping: "pong", time: new Date().toISOString() });
}
