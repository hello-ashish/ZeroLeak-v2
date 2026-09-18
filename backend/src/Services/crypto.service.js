import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getEncryptionKey() {
    const key = process.env.QUESTION_ENCRYPTION_KEY;

    if (!key) {
        throw new Error(
            "QUESTION_ENCRYPTION_KEY is not configured in environment variables."
        );
    }

    const buffer = Buffer.from(key, "base64");

    if (buffer.length !== KEY_LENGTH) {
        throw new Error(
            "QUESTION_ENCRYPTION_KEY must decode to exactly 32 bytes."
        );
    }

    return buffer;
}

export function encryptQuestionContent(content) {
    const key = getEncryptionKey();

    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        key,
        iv
    );

    const plaintext = JSON.stringify(content);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
    };
}

export function decryptQuestionContent(encryptedContent) {
    const key = getEncryptionKey();

    const iv = Buffer.from(
        encryptedContent.iv,
        "base64"
    );

    const authTag = Buffer.from(
        encryptedContent.authTag,
        "base64"
    );

    const ciphertext = Buffer.from(
        encryptedContent.ciphertext,
        "base64"
    );

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return JSON.parse(
        decrypted.toString("utf8")
    );
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((out, key) => {
                out[key] = canonicalize(value[key]);
                return out;
            }, {});
    }
    return value;
}

export function hashQuestionContent(content) {
    const plaintext = JSON.stringify(canonicalize(content));

    return crypto
        .createHash("sha256")
        .update(plaintext, "utf8")
        .digest("hex");
}

export function verifyQuestionIntegrity(
    encryptedContent,
    expectedHash
) {
    try {
        const decryptedContent =
            decryptQuestionContent(encryptedContent);

        const calculatedHash =
            hashQuestionContent(decryptedContent);

        return calculatedHash === expectedHash;
    } catch (error) {
        console.error(
            "Question integrity verification failed:",
            error.message
        );

        return false;
    }
}