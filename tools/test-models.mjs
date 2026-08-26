// Manual smoke test for configured Gemini models.
// Usage: node --env-file=.env tools/test-models.mjs
import { GoogleGenAI } from '@google/genai';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const ai = new GoogleGenAI({ apiKey: required('VITE_GEMINI_API_KEY') });

async function testTextModel(label, model) {
  console.log(`Testing ${label}: ${model}`);
  const response = await ai.models.generateContent({
    model,
    contents: 'Answer with exactly: ok',
  });
  console.log(`${label} success:`, response.text);
}

async function testModels() {
  await testTextModel('Main writer', required('VITE_LLM_MODEL'));
  await testTextModel('Summary', required('VITE_SUMMARY_MODEL'));
  await testTextModel('Branch writer', required('VITE_BRANCH_MODEL'));

  if (process.env.TEST_IMAGE === '1') {
    console.log(`Testing image: ${required('VITE_IMAGE_MODEL')}`);
    const imageResponse = await ai.models.generateContent({
      model: required('VITE_IMAGE_MODEL'),
      contents: 'A tiny glowing fantasy waypoint marker, no text',
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    console.log('Image parts:', imageResponse.candidates?.[0]?.content?.parts?.length || 0);
  }
}

testModels().catch((error) => {
  console.error('Model smoke test failed:', error.message);
  process.exit(1);
});
