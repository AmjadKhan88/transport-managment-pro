const BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v21.0"}`;

async function call(body) {
  const res = await fetch(
    `${BASE}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || "WhatsApp API error");
    err.code = data?.error?.code;
    err.details = data;
    throw err;
  }
  return data;
}

export const sendText = (to, text) =>
  call({ to, type: "text", text: { body: text, preview_url: false } });

// Template variables must NOT contain newlines/tabs.
export const sendTemplate = (to, name, params = [], lang = "en") =>
  call({
    to,
    type: "template",
    template: {
      name,
      language: { code: lang },
      components: [
        {
          type: "body",
          parameters: params.map((p) => ({
            type: "text",
            text: String(p).replace(/\s+/g, " "),
          })),
        },
      ],
    },
  });

// 131047 = 24h window closed → must use a template
export const isWindowClosedError = (e) => e?.code === 131047;
