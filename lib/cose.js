// fork of https://github.com/erdtman/cose-js which only deals with ES256 verification and is meant to be used with RN

const crypto = require("crypto-browserify");
const cbor = require("./cbor-jsbi");
const EC = require("elliptic").ec;

const Tagged = cbor.Tagged;
const SignTag = 98;
const Sign1Tag = 18;
const EMPTY_BUFFER = Buffer.alloc(0);

const HeaderParameters = {
  partyUNonce: -22,
  static_key_id: -3,
  static_key: -2,
  ephemeral_key: -1,
  alg: 1,
  crit: 2,
  content_type: 3,
  ctyp: 3, // one could question this but it makes testing easier
  kid: 4,
  IV: 5,
  Partial_IV: 6,
  counter_signature: 7,
};

function getSigner(signers, verifier) {
  for (let i = 0; i < signers.length; i++) {
    const kid = signers[i][1].get(HeaderParameters.kid); // TODO create constant for header locations
    if (kid.equals(Buffer.from(verifier.key.kid, "utf8"))) {
      return signers[i];
    }
  }
}

function getCommonParameter(first, second, parameter) {
  let result;

  if (first.get) {
    result = first.get(parameter);
  }

  if (!result && second.get) {
    result = second.get(parameter);
  }

  return result;
}

const verify = (payload, verifier, options = {}) => {
  return cbor.decodeFirst(payload).then((obj) => {
    let type = options.defaultType ? options.defaultType : SignTag;

    if (obj instanceof Tagged) {
      if (obj.tag !== SignTag && obj.tag !== Sign1Tag) {
        throw new Error("Unexpected cbor tag, '" + obj.tag + "'");
      }

      type = obj.tag;
      obj = obj.value;
    }

    if (!Array.isArray(obj)) {
      throw new Error("Expecting Array");
    }

    if (obj.length !== 4) {
      throw new Error("Expecting Array of lenght 4");
    }

    let [p, u, plaintext, signers] = obj;

    if (type === SignTag && !Array.isArray(signers)) {
      throw new Error("Expecting signature Array");
    }

    p = !p.length ? EMPTY_BUFFER : cbor.decodeFirstSync(p);
    u = !u.size ? EMPTY_BUFFER : u;

    let signer = type === SignTag ? getSigner(signers, verifier) : signers;

    if (!signer) {
      throw new Error("Failed to find signer with kid" + verifier.key.kid);
    }

    if (type === SignTag) {
      throw new Error("SignTag with id " + SignTag + " is not supported.");
    } else {
      const externalAAD = verifier.externalAAD || EMPTY_BUFFER;
      const alg = getCommonParameter(p, u, HeaderParameters.alg);

      if (alg != -7) {
        throw new Error("Only ES256 (P256+SHA256) is supported");
      }

      p = !p.size ? EMPTY_BUFFER : cbor.encode(p);
      const SigStructure = ["Signature1", p, externalAAD, plaintext];

      return doVerify(SigStructure, verifier, alg, signer).then(() => {
        return plaintext;
      });
    }
  });
};

function doVerify(SigStructure, verifier, alg, sig) {
  return new Promise((resolve, reject) => {
    const ToBeSigned = cbor.encode(SigStructure);
    const msgHash = crypto.createHash("sha256").update(ToBeSigned).digest();

    const pub = { x: verifier.key.x, y: verifier.key.y };
    const ec = new EC("p256");
    const key = ec.keyFromPublic(pub);

    sig = { r: sig.slice(0, sig.length / 2), s: sig.slice(sig.length / 2) };

    if (key.verify(msgHash, sig)) {
      resolve();
    } else {
      throw new Error("Signature missmatch");
    }
  });
}

module.exports = { verify, SignTag, Sign1Tag };
