import crypto from "node:crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const pub = publicKey.export({ type: "spki", format: "der" });
const rawPub = pub.subarray(pub.length - 65);
const pubBase64Url = rawPub.toString("base64url");

const jwk = privateKey.export({ format: "jwk" });
const privBase64Url = jwk.d;

console.log("\n🔑 Suas Chaves VAPID foram geradas com sucesso:\n");
console.log(`VAPID_PUBLIC_KEY=${pubBase64Url}`);
console.log(`VAPID_PRIVATE_KEY=${privBase64Url}`);
console.log("\n=======================================================");
console.log("📋 ONDE CONFIGURAR ESSAS CHAVES:");
console.log("=======================================================\n");
console.log("1. No Frontend (.env.local e variáveis da Vercel):");
console.log(`   VITE_VAPID_PUBLIC_KEY=${pubBase64Url}\n`);
console.log("2. Nos Segredos do Supabase (para a Edge Function):");
console.log(`   supabase secrets set VAPID_PUBLIC_KEY="${pubBase64Url}"`);
console.log(`   supabase secrets set VAPID_PRIVATE_KEY="${privBase64Url}"`);
console.log('   supabase secrets set VAPID_SUBJECT="mailto:seu-email@dominio.com"\n');
