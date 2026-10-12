import fs from "fs/promises";
import { ApiError } from "./ApiError.js";

const ZIP = [[0x50, 0x4b, 0x03, 0x04]];
const OLE = [[0xd0, 0xcf, 0x11, 0xe0]];

const SIGNATURES = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ZIP,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ZIP,
  "application/msword": OLE,
  "application/vnd.ms-excel": OLE,
};

export async function verifySignature(filePath, mime) {
  const handle = await fs.open(filePath, "r");
  const buf = Buffer.alloc(12);
  await handle.read(buf, 0, 12, 0);
  await handle.close();

  const ok =
    mime === "image/webp"
      ? buf.toString("ascii", 0, 4) === "RIFF" &&
        buf.toString("ascii", 8, 12) === "WEBP"
      : (SIGNATURES[mime] ?? []).some((sig) =>
          sig.every((byte, i) => buf[i] === byte),
        );

  if (!ok) throw new ApiError(400, "The file content does not match its type");
}
