const cbor = require("./cbor-jsbi");
const zlib = require("browserify-zlib");

const base45 = require("base45");
const { createHash } = require("crypto-browserify");
const { verify: coseVerify } = require("./cose");

const publicKey = require("../cert.json");
publicKey.publicKey.keyRaw = Buffer.from(publicKey.publicKey.keyRaw, "base64");
publicKey.raw = Buffer.from(publicKey.raw, "base64");

const createFingerprint = (publicKey) => {
  const hash = createHash("sha256").update(publicKey.raw).digest();
  return new Uint8Array(hash).slice(0, 8);
};

const verification = (data, publicKey) => {
  if (data.startsWith("HC1")) {
    data = data.substring(3);
    if (data.startsWith(":")) {
      data = data.substring(1);
    } else {
      console.log("Warning: unsafe HC1: header - update to v0.0.4");
    }
  } else {
    console.log("Warning: no HC1: header - update to v0.0.4");
  }

  data = base45.decode(data);
  data = zlib.inflateSync(data);

  const publicKeyRaw = publicKey.publicKey.keyRaw;
  const keyX = Buffer.from(publicKeyRaw.slice(1, 1 + 32));
  const keyY = Buffer.from(publicKeyRaw.slice(33, 33 + 32));

  const verifier = {
    key: { x: keyX, y: keyY, kid: createFingerprint(publicKey) },
  };

  return coseVerify(data, verifier).then((buf) => cbor.decode(buf));
};

export default async (data) => {
  const res = await verification(data, publicKey);

  return {
    status: "VERIFIED",
    metadata: {
      subject: publicKey.subject,
      issuer: publicKey.issuer,
    },
    data: JSON.parse(res),
  };
};
