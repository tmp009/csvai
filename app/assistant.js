require('dotenv').config();
const { OpenAI } = require('openai')
const openai = new OpenAI();


async function createAssistant(name, instruction, fileId) {
    const assistant = await openai.beta.assistants.create({
        name: name,
        instructions: instruction,
        tools: [{ type: "code_interpreter" }],
        model: "gpt-4-1106-preview",
        file_ids: [fileId]
    });

    return assistant
}

async function runAssistant(assistantId, threadId) {
    await openai.beta.threads.runs.create(threadId, {
        assistant_id:assistantId
    });
}

module.exports = { createAssistant, runAssistant }