import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const pins = {
 'jev.mjs':'b8af5290f7bdab39ea0e7bb05336949e642e7ef6938fdffe90f3fa08c8eba9dc',
 'provider-error.mjs':'05357305d7fb513cdd329f2ed5d2878610a2bf80bdd14156a04f9c611c0d138b',
};
let original;
export async function loadOriginalJev() {
 if (!original) {
  for (const [name,sha] of Object.entries(pins)) {
   const bytes=await readFile(new URL('../upstream/'+name,import.meta.url));
   if(createHash('sha256').update(bytes).digest('hex')!==sha)throw new Error('Pinned Ares source integrity mismatch');
  }
  const require=createRequire(import.meta.url);
  const pkg=JSON.parse(await readFile(require.resolve('gpt-tokenizer/package.json'),'utf8'));
  if(pkg.version!=='4.0.0')throw new Error('Pinned tokenizer version mismatch');
  original=await import('../upstream/jev.mjs');
 }
 return original;
}
