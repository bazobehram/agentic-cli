#!/usr/bin/env node

/**
 * Demo script showing how to use agentic-cli with local LLMs (Ollama)
 * 
 * Prerequisites:
 * 1. Install Ollama: https://ollama.com/download
 * 2. Start Ollama service: `ollama serve`
 * 3. Pull a model: `ollama pull llama3.1:8b-instruct`
 * 
 * Run this demo: node examples/local-llm-demo.js
 */

import { createLocalContentGenerator, LOCAL_LLM_CONFIGS, LocalLLMSetupValidator } from '../packages/core/dist/llm/LocalContentGenerator.js';

async function runDemo() {
  console.log('🚀 agentic-cli Local LLM Demo\n');

  // 1. Check if Ollama is available
  console.log('📡 Checking Ollama availability...');
  const validation = await LocalLLMSetupValidator.validateOllama();
  
  if (!validation.available) {
    console.error('❌ Ollama not available:', validation.error);
    console.log('\n' + LocalLLMSetupValidator.getSetupInstructions());
    return;
  }

  console.log('✅ Ollama is running!');
  console.log(`📦 Available models: ${validation.models?.join(', ')}\n`);

  // 2. Create a local content generator
  console.log('🧠 Creating local content generator...');
  const contentGenerator = createLocalContentGenerator({
    ...LOCAL_LLM_CONFIGS.OLLAMA_GENERAL,
    model: validation.models?.[0] || 'llama3.1:8b-instruct', // Use first available model
  });

  // 3. Test basic content generation
  console.log('💬 Testing content generation...');
  try {
    const response = await contentGenerator.generateContent(
      {
        model: validation.models?.[0] || 'llama3.1:8b-instruct',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello! Can you help me write a simple "Hello World" program in Python?' }],
          },
        ],
        config: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      },
      'demo-prompt-001'
    );

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    console.log('🤖 Response:');
    console.log(responseText);
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error generating content:', error.message);
    return;
  }

  // 4. Test streaming generation
  console.log('🌊 Testing streaming generation...');
  try {
    const streamPrompt = {
      model: validation.models?.[0] || 'llama3.1:8b-instruct',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Write a short haiku about coding with AI assistants. Make it inspirational!' }],
        },
      ],
      config: {
        temperature: 0.8,
        maxOutputTokens: 256,
      },
    };

    const streamResponse = await contentGenerator.generateContentStream(streamPrompt, 'demo-stream-001');
    
    console.log('🤖 Streaming Response:');
    let fullResponse = '';
    
    for await (const chunk of streamResponse) {
      const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      process.stdout.write(chunkText);
      fullResponse += chunkText;
    }
    
    console.log('\n\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error with streaming generation:', error.message);
    return;
  }

  // 5. Test token counting
  console.log('🔢 Testing token counting...');
  try {
    const tokenResponse = await contentGenerator.countTokens({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'This is a test message for token counting. How many tokens does this contain?' }],
        },
      ],
    });

    console.log(`📊 Estimated tokens: ${tokenResponse.totalTokens}`);
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error counting tokens:', error.message);
  }

  // 6. Show configuration details
  console.log('⚙️  Configuration Details:');
  const config = contentGenerator.getConfig();
  console.log(`Provider: ${config.provider}`);
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`Model: ${config.model}`);
  console.log(`Temperature: ${config.temperature}`);
  console.log(`Max Tokens: ${config.maxTokens}`);
  console.log(`Context Size: ${config.contextSize}`);

  console.log('\n🎉 Demo completed successfully!');
  console.log('\n💡 Benefits of Local LLMs with agentic-cli:');
  console.log('   ✅ Complete privacy - no data leaves your machine');
  console.log('   ✅ No API costs or rate limits');
  console.log('   ✅ Works offline');
  console.log('   ✅ Full control over models and parameters');
  console.log('\n🚀 Ready to use agentic-cli with local LLMs!');
}

// Run the demo
runDemo().catch(console.error);
