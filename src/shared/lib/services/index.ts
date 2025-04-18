export const createMeeting = async () => {
  const res = await fetch(`https://api.videosdk.live/v2/rooms`, {
    method: "POST",
    headers: {
      authorization: process.env.NEXT_PUBLIC_AUTH_TOKEN as string,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expiryTimeout: 1440,
    }),
  });

  const {roomId} = await res.json();
  return roomId;
};